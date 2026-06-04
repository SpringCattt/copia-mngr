// routes/indexRoutes.js
const express = require('express');
const router = express.Router();
const mainController = require('../controllers/MainController');
const treinadorController = require('../controllers/TreinadorController'); 
const gestorController = require('../controllers/GestorController'); 

const seJaLogadoRedireciona = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/mngr/maisdetalhes');
    }
    next();
};

const protegerRota = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.redirect('/mngr/login');
    }
    next();
};

// --- VISUALIZAÇÕES GERAIS ---
router.get('/', mainController.getHome);
router.get('/mngr/register', seJaLogadoRedireciona, mainController.getRegister);
router.get('/mngr/login', seJaLogadoRedireciona, mainController.getLogin);
router.get('/mngr/maisdetalhes', protegerRota, mainController.getMaisDetalhes);

// =========================================================================
// 🌟 URLS REAIS DO BROWSER (Carregam a moldura completa do Dashboard)
// =========================================================================
router.get('/mngr/dashboard', protegerRota, treinadorController.getDashboard);

// Caminhos reais do Treinador no browser
router.get('/mngr/dashboard/treinador/treinador_index', protegerRota, treinadorController.getDashboard);
router.get('/mngr/dashboard/treinador/treinador_jogo', protegerRota, treinadorController.getDashboard);

// Caminhos reais do Gestor no browser
router.get('/mngr/dashboard/gestorClube/equipas', protegerRota, treinadorController.getDashboard);
router.get('/mngr/dashboard/gestorClube/equipa_detalhes', protegerRota, treinadorController.getDashboard);


// =========================================================================
// 🌟 ENDPOINTS MNGR (Servem apenas o miolo HTML que o bars.js injeta)
// =========================================================================
// Componentes estruturais fixos
router.get('/mngr/components/navbar.html', protegerRota, treinadorController.getNavbar);
router.get('/mngr/components/sidebar.html', protegerRota, treinadorController.getSidebarTreinador);

// Pedaços de conteúdo limpo do Treinador
router.get('/mngr/treinador/treinador_index/view', protegerRota, treinadorController.getTreinadorIndex);
router.get('/mngr/treinador/treinador_jogo/view', protegerRota, treinadorController.getTreinadorJogo);

// Pedaços de conteúdo limpo do Gestor (gestorClube)
router.get('/mngr/gestorClube/equipas/view', protegerRota, gestorController.getEquipas);
router.get('/mngr/gestorClube/equipa_detalhes/view', protegerRota, gestorController.getEquipaDetalhes);


// --- AÇÕES DE BASE DE DADOS ---
router.post('/mngr/register', mainController.registarUtilizador);      
router.post('/mngr/login-social', mainController.loginUtilizadorSocial);  
router.post('/mngr/register-social', mainController.registarUtilizadorSocial); 
router.post('/mngr/login', mainController.autenticarUtilizador);

module.exports = router;