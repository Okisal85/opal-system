const { Client } = require('pg');
require('dotenv').config();

async function limpiarPO() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await client.connect();
        console.log('Conectado a la base de datos');

        // Eliminar líneas del PO
        await client.query('DELETE FROM po_lines WHERE po_id IN (SELECT id FROM purchase_orders WHERE po_number = $1)', ['123489']);
        console.log('Líneas del PO eliminadas');

        // Eliminar el PO
        await client.query('DELETE FROM purchase_orders WHERE po_number = $1', ['123489']);
        console.log('PO 123489 eliminado');

        console.log('\n✅ Listo! Ahora puedes volver a guardar el PO');
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

limpiarPO();