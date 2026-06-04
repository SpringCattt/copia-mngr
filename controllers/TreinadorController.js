// controllers/TreinadorController.js
const path = require('path');

// 🌟 CERTIFICA-TE QUE ESTA FUNÇÃO EXISTE EXATAMENTE ASSIM:
exports.getDashboard = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'dashboard.html'));
};

// --- SERVIR FICHEIROS DA PASTA 'COMPONENTS' ---
exports.getNavbar = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'navbar.html'));
};

exports.getSidebarTreinador = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'sidebar.html'));
};

// --- SERVIR FICHEIROS DA PASTA 'TREINADOR' ---
exports.getTreinadorIndex = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'treinador', 'treinador_index.html'));
};

exports.getTreinadorJogo = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'treinador', 'treinador_jogo.html'));
};