// controllers/GestorController.js
const path = require('path');

// --- SERVIR FICHEIROS DA PASTA 'GESTORCLUBE' ---
exports.getEquipas = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'gestorClube', 'equipas.html'));
};

exports.getEquipaDetalhes = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'gestorClube', 'equipa_detalhes.html'));
};