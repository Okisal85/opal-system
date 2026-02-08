const { Client } = require('pg');
require('dotenv').config();

async function setupDatabase() {
    // Primero conectar a postgres para crear la base de datos
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'postgres'
    });

    try {
        await client.connect();
        console.log('✓ Conectado a PostgreSQL');

        // Crear base de datos si no existe
        await client.query(`
            SELECT 'CREATE DATABASE opal_po_system'
            WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'opal_po_system')
        `).catch(() => {});
        
        console.log('✓ Base de datos creada o ya existe');
        await client.end();

        // Conectar a la nueva base de datos
        const dbClient = new Client({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        await dbClient.connect();

        // Crear tablas
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                project_number VARCHAR(100) UNIQUE NOT NULL,
                client_name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS purchase_orders (
                id SERIAL PRIMARY KEY,
                po_number VARCHAR(100) UNIQUE NOT NULL,
                project_id INTEGER REFERENCES projects(id),
                supplier VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS project_products (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id),
                product_name VARCHAR(255),
                product_code VARCHAR(100),
                wholesaler VARCHAR(255),
                area VARCHAR(100),
                quantity INTEGER,
                price DECIMAL(10,2)
            );

            CREATE TABLE IF NOT EXISTS po_lines (
                id SERIAL PRIMARY KEY,
                po_id INTEGER REFERENCES purchase_orders(id),
                item_code VARCHAR(100),
                description TEXT,
                quantity INTEGER,
                quantity_received INTEGER DEFAULT 0,
                area VARCHAR(100)
            );

            CREATE TABLE IF NOT EXISTS receptions (
                id SERIAL PRIMARY KEY,
                po_line_id INTEGER REFERENCES po_lines(id),
                quantity_received INTEGER,
                received_at TIMESTAMP DEFAULT NOW(),
                notes TEXT
            );
        `);

        console.log('✓ Tablas creadas correctamente');
        console.log('');
        console.log('🎉 ¡Base de datos lista!');
        
        await dbClient.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

setupDatabase();