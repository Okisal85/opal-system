const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const ExcelJS = require('exceljs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- ENDPOINTS ---
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

app.post('/api/po/upload', upload.single('pdf'), async (req, res) => {
    try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdf(dataBuffer);
        const text = pdfData.text;
        res.json({ success: true, data: { poNumber: extractPONumber(text), supplier: extractSupplier(text), client: extractClient(text), lines: extractLines(text) } });
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
            await client.query('INSERT INTO po_lines (po_id, item_code, description, quantity, area) VALUES ($1, $2, $3, $4, $5)', [poId, line.itemCode, line.description, line.quantity, area]);
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
            if (i === 1) return;
            const productCode = row.getCell(5).value?.toString();
            if (productCode) products.push([req.params.id, productCode, row.getCell(1).value, row.getCell(10).value, row.getCell(8).value]);
        });
        for (const p of products) { await pool.query('INSERT INTO project_products (project_id, product_code, product_name, area, quantity) VALUES ($1, $2, $3, $4, $5)', p); }
        res.json({ success: true, productsImported: products.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects/:id/reception-status', async (req, res) => {
    try {
        const result = await pool.query('SELECT pl.*, po.po_number, (pl.quantity - pl.quantity_received) as pending FROM po_lines pl JOIN purchase_orders po ON pl.po_id = po.id WHERE po.project_id = $1 ORDER BY po.po_number ASC', [req.params.id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reception/receive', async (req, res) => {
    const { poLineId, quantity } = req.body;
    try {
        await pool.query('UPDATE po_lines SET quantity_received = quantity_received + $1 WHERE id = $2', [quantity, poLineId]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

function extractPONumber(t) { return t.match(/Supplier\s*[\n\r]+(\d{6})/i)?.[1] || 'N/A'; }
function extractSupplier(t) { return t.match(/([A-Z]{2,})Oscar\s*Salcedo/)?.[1] || 'N/A'; }
function extractClient(t) { return t.match(/[A-Z]{3}\/\d{2}\/\d{4}\s*[\n\r]+([A-Z][A-Za-z\s]+?)(?=\s*Page)/)?.[1]?.trim() || 'N/A'; }
function extractLines(text) {
    var lines = []; var segments = text.split('/EA');
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

app.listen(port, '0.0.0.0', () => console.log(`Server running`));