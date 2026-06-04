// index.js
const express = require('express');
const path = require('path');
const session = require('express-session'); // Mantemos as sessões para segurança
const { conectarBD } = require('./database/connection');
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

// 🌟 CORREÇÃO AQUI: O centralizador de rotas vem ANTES dos ficheiros estáticos
// Isto garante que o Express valida os Middlewares antes de cuspir o HTML direto!
app.use('/', indexRoutes);

// Servidores de ficheiros estáticos originais (Mantêm todos os teus links antigos a funcionar)
app.use(express.static(path.join(__dirname, 'public', 'principal_page')));
app.use('/mngr', express.static(path.join(__dirname, 'public', 'mngr')));

app.listen(PORT, async () => {
    console.log(`Servidor iniciado em http://localhost:${PORT}`);
    await conectarBD();
});