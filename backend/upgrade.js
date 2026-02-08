const { Client } = require('pg');
require('dotenv').config();

async function upgradeDB() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await client.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS barcode_mapping (
                id SERIAL PRIMARY KEY,
                barcode TEXT UNIQUE NOT NULL,
                product_code TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Barcode mapping table ready');
    } catch (e) { 
        console.error('❌ Error:', e.message); 
    } finally { 
        await client.end(); 
        process.exit(); 
    }
}
upgradeDB();