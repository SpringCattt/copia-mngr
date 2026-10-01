// index.js
const express = require('express');
const path = require('path');
const session = require('express-session'); 
// Importação segura: extrai o objeto exportado caso conectarBD venha encapsulado ou não
const databaseModule = require('./database/connection');
const indexRoutes = require('./routes/indexRoutes');

const app = express();
const PORT = 3000;

// Configuração do Middleware de Sessão
app.use(session({
    secret: 'mngr_chave_secreta_e_segura_123',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    }
}));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// 🌟 OS MIDDLEWARES E ROTAS SÃO PROCESSADOS PRIMEIRO PARA GARANTIR SEGURANÇA
app.use('/', indexRoutes);

// Servidores de ficheiros estáticos (Tratam dos ficheiros CSS, Imagens, JS locais)
app.use(express.static(path.join(__dirname, 'public', 'principal_page')));
app.use('/mngr', express.static(path.join(__dirname, 'public', 'mngr')));

// 🌟 CORREÇÃO GERAL PARA O JEST: Só inicia o servidor real se NÃO estivermos em ambiente de testes
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, async () => {
        console.log(`🚀 Servidor iniciado em http://localhost:${PORT}`);
        try {
            // Deteta dinamicamente como a função foi estruturada no teu connection.js
            const conectarBD = databaseModule.conectarBD || databaseModule;
            if (typeof conectarBD === 'function') {
                await conectarBD();
            } else {
                console.warn('⚠️ Aviso: Função conectarBD não detetada no módulo de ligação.');
            }
        } catch (erro) {
            console.error('❌ Falha ao inicializar o servidor:', erro.message);
        }
    });
}

module.exports = app;