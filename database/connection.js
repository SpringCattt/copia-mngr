// database/connection.js
const { Pool } = require('pg');
require('dotenv').config(); // Carrega as variáveis do ficheiro .env

// Configuração da conexão usando as variáveis do .env
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
});

// Função para testar a ligação assim que o servidor inicia
const conectarBD = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Conexão à base de dados PostgreSQL estabelecida com sucesso!');
        client.release();
    } catch (err) {
        console.error('❌ Erro ao conectar à base de dados:', err.message);
        process.exit(1);
    }
};

// Exportamos o pool (para fazer queries no futuro) e a função de teste
module.exports = { pool, conectarBD };