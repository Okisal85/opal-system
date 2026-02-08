const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const ExcelJS = require('exceljs');
const QRCode = require('qrcode');
require('dotenv').config();

// Asegurar que existe la carpeta uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir); }

const app = express();
const port = 3001;

// Configurar base de datos
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

app.use(cors({
    origin: '*'
}));
app.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- ENDPOINTS PARA PROYECTOS ---

app.get('/api/projects', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects', async (req, res) => {
    const { project_number, client_name } = req.body;
    try {
        const result = await pool.query('INSERT INTO projects (project_number, client_name) VALUES ($1, $2) RETURNING *', [project_number, client_name]);
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CARGA DE ARCHIVOS (PDF & EXCEL) ---

app.post('/api/po/upload', upload.single('pdf'), async (req, res) => {
    try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdf(dataBuffer);
        const text = pdfData.text;
        res.json({
            success: true,
            data: {
                poNumber: extractPONumber(text),
                supplier: extractSupplier(text),
                client: extractClient(text),
                lines: extractLines(text)
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/po/save', async (req, res) => {
    const { poNumber, supplier, projectId, lines } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const poRes = await client.query('INSERT INTO purchase_orders (po_number, supplier, project_id) VALUES ($1, $2, $3) RETURNING id', [poNumber, supplier, projectId]);
        const poId = poRes.rows[0].id;
        const projectProducts = await client.query('SELECT * FROM project_products WHERE project_id = $1', [projectId]);

        for (const line of lines) {
            const match = projectProducts.rows.find(pp => pp.product_code === line.itemCode);
            const area = match ? match.area : 'Unassigned';
            await client.query('INSERT INTO po_lines (po_id, item_code, description, quantity, area) VALUES ($1, $2, $3, $4, $5)', 
                [poId, line.itemCode, line.description, line.quantity, area]);
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); } finally { client.release(); }
});

app.post('/api/projects/:id/upload-excel', upload.single('excel'), async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0];
        const products = [];
        
        worksheet.eachRow((row, i) => {
            if (i === 1) return; // Saltar encabezado
            // Basado en tus columnas: Product# en Col 5, Product Name en Col 1, Area en Col 10, Quantity en Col 8
            const productCode = row.getCell(5).value?.toString();
            if (productCode) {
                products.push([req.params.id, productCode, row.getCell(1).value, row.getCell(10).value, row.getCell(8).value]);
            }
        });

        for (const p of products) {
            await pool.query('INSERT INTO project_products (project_id, product_code, product_name, area, quantity) VALUES ($1, $2, $3, $4, $5)', p);
        }
        res.json({ success: true, productsImported: products.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- WAREHOUSE & RECEPCIÓN ---

app.get('/api/reception/search', async (req, res) => {
    const { q, projectId } = req.query;
    try {
        // Primero buscar si el código escaneado es un código de barras del fabricante mapeado
        const mapping = await pool.query('SELECT product_code FROM barcode_mapping WHERE barcode = $1', [q]);
        const searchCode = mapping.rows.length > 0 ? mapping.rows[0].product_code : q;

        const result = await pool.query(`
            SELECT pl.*, po.po_number, p.client_name, p.project_number
            FROM po_lines pl
            JOIN purchase_orders po ON pl.po_id = po.id
            JOIN projects p ON po.project_id = p.id
            WHERE p.id = $1 AND (pl.item_code = $2 OR pl.item_code LIKE $3)
        `, [projectId, searchCode, `%${searchCode}%`]);
        
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reception/receive', async (req, res) => {
    const { poLineId, quantity, barcode } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const lineRes = await client.query('SELECT * FROM po_lines WHERE id = $1', [poLineId]);
        const line = lineRes.rows[0];
        const newTotal = (line.quantity_received || 0) + quantity;
        
        await client.query('UPDATE po_lines SET quantity_received = $1 WHERE id = $2', [newTotal, poLineId]);
        
        // Registrar recepción en historial
        await client.query('INSERT INTO receptions (po_line_id, quantity_received) VALUES ($1, $2)', [poLineId, quantity]);

        // Si se usó un código de barras nuevo, guardarlo para la próxima
        if (barcode && barcode !== line.item_code) {
            await client.query('INSERT INTO barcode_mapping (barcode, product_code) VALUES ($1, $2) ON CONFLICT DO NOTHING', [barcode, line.item_code]);
        }

        // Obtener datos finales para etiquetas
        const info = await client.query(`
            SELECT pl.*, p.client_name, p.project_number, po.po_number 
            FROM po_lines pl 
            JOIN purchase_orders po ON pl.po_id = po.id 
            JOIN projects p ON po.project_id = p.id 
            WHERE pl.id = $1`, [poLineId]);
        
        const labels = [];
        // Generar UNA ETIQUETA POR CADA UNIDAD recibida
        for(let i=0; i<quantity; i++) {
            labels.push(generateZPL(info.rows[0]));
        }

        await client.query('COMMIT');
        res.json({ success: true, labels });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); } finally { client.release(); }
});

app.get('/api/projects/:id/reception-status', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT pl.*, po.po_number, (pl.quantity - pl.quantity_received) as pending
            FROM po_lines pl
            JOIN purchase_orders po ON pl.po_id = po.id
            WHERE po.project_id = $1
            ORDER BY po.po_number ASC
        `, [req.params.id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- GENERADOR DE ETIQUETA ZPL (3x2 INCH) ---

function generateZPL(line) {
    return `^XA
^FO30,20^A0N,25,25^FDOpal Baths & Design^FS
^FO30,55^A0N,18,18^FDClient: ${line.client_name}^FS
^FO30,80^A0N,16,16^FDProject: ${line.project_number}^FS
^FO30,100^A0N,16,16^FDPO: ${line.po_number}^FS
^FO30,125^GB550,2,2^FS
^FO30,135^A0N,30,30^FD${line.area}^FS
^FO30,175^A0N,18,18^FDCode: ${line.item_code}^FS
^FO30,200^A0N,20,20^FDQty: 1 of ${line.quantity}^FS
^FO450,140^BQN,2,4^FDQA,PO:${line.po_number}-ITEM:${line.item_code}^FS
^XZ`;
}

// --- EXTRACTORES DE PDF ---

function extractPONumber(t) { return t.match(/Supplier\s*[\n\r]+(\d{6})/i)?.[1] || 'N/A'; }
function extractSupplier(t) { return t.match(/([A-Z]{2,})Oscar\s*Salcedo/)?.[1] || 'N/A'; }
function extractClient(t) { return t.match(/[A-Z]{3}\/\d{2}\/\d{4}\s*[\n\r]+([A-Z][A-Za-z\s]+?)(?=\s*Page)/)?.[1]?.trim() || 'N/A'; }
function extractLines(text) {
    var lines = [];
    var segments = text.split('/EA');
    for (var i = 0; i < segments.length - 1; i++) {
        var before = segments[i]; var after = segments[i + 1];
        var qtyMatch = before.match(/(\d)(\d)[\d.]+\s*$/);
        var codeMatch = after.match(/^([A-Z0-9\-]+)/);
        if (codeMatch) {
            var code = codeMatch[1];
            if (code.endsWith('0') && code.length > 4) code = code.substring(0, code.length - 1);
            lines.push({ itemCode: code, description: 'See PDF', quantity: qtyMatch ? parseInt(qtyMatch[2]) : 1 });
        }
    }
    return lines;
}

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://10.0.0.51:${port}`);
});