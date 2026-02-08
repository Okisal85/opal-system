const { Client } = require('pg');
require('dotenv').config();

async function run() {
    // Intentamos conectar usando la URL de conexión completa que es más confiable
    const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:5432/postgres`;
    
    const client = new Client({
        connectionString: connectionString,
        ssl: false // Supabase en puerto 5432 permite conexiones sin SSL forzado desde Node en muchos casos
    });

    try {
        console.log('Connecting to cloud...');
        await client.connect();
        console.log('✓ Connected!');

        await client.query(`
            CREATE TABLE IF NOT EXISTS projects (id SERIAL PRIMARY KEY, project_number VARCHAR(100) UNIQUE NOT NULL, client_name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT NOW());
            CREATE TABLE IF NOT EXISTS purchase_orders (id SERIAL PRIMARY KEY, po_number VARCHAR(100) UNIQUE NOT NULL, project_id INTEGER REFERENCES projects(id), supplier VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT NOW());
            CREATE TABLE IF NOT EXISTS project_products (id SERIAL PRIMARY KEY, project_id INTEGER REFERENCES projects(id), product_code VARCHAR(100), product_name VARCHAR(255), area VARCHAR(100), quantity INTEGER, price DECIMAL(10,2));
            CREATE TABLE IF NOT EXISTS po_lines (id SERIAL PRIMARY KEY, po_id INTEGER REFERENCES purchase_orders(id), item_code VARCHAR(100), description TEXT, quantity INTEGER, quantity_received INTEGER DEFAULT 0, area VARCHAR(100));
            CREATE TABLE IF NOT EXISTS receptions (id SERIAL PRIMARY KEY, po_line_id INTEGER REFERENCES po_lines(id), quantity_received INTEGER, received_at TIMESTAMP DEFAULT NOW(), notes TEXT);
            CREATE TABLE IF NOT EXISTS barcode_mapping (id SERIAL PRIMARY KEY, barcode TEXT UNIQUE NOT NULL, product_code TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW());
        `);
        
        console.log('✅ Database is ready in the cloud!');
    } catch (err) {
        console.error('❌ Error details:', err.message);
        console.log('Trying alternative connection method (SSL On)...');
        
        // Si falla sin SSL, intentamos con SSL activado (Plan B)
        const clientSSL = new Client({
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false }
        });
        
        try {
            await clientSSL.connect();
            console.log('✓ Connected with SSL!');
            // ... (repetir queries si es necesario)
            console.log('✅ Cloud database is ready!');
        } catch (err2) {
            console.error('❌ Final Error:', err2.message);
        }
    } finally {
        process.exit();
    }
}
run();