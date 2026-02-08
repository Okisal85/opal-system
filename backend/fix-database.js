const { Client } = require('pg');
require('dotenv').config();

async function fixDatabase() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await client.connect();
        console.log('✓ Conectado a la base de datos');

        // Agregar columna faltante a po_lines
        console.log('Agregando columna project_product_id...');
        
        await client.query(`
            ALTER TABLE po_lines 
            ADD COLUMN IF NOT EXISTS project_product_id INTEGER
        `);
        
        console.log('✓ Columna project_product_id agregada');

        // Verificar estructura de po_lines
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'po_lines'
            ORDER BY ordinal_position
        `);

        console.log('\n📊 Columnas en po_lines:');
        result.rows.forEach(col => {
            console.log('  - ' + col.column_name + ' (' + col.data_type + ')');
        });

        console.log('\n✅ Base de datos lista');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

fixDatabase();