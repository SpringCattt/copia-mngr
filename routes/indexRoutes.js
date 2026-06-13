const express = require('express');
const router = express.Router();

const mainController = require('../controllers/MainController');
const treinadorController = require('../controllers/TreinadorController'); 
const gestorController = require('../controllers/GestorController'); 
const atletaController = require('../controllers/AtletaController'); 
const mensagensController = require('../controllers/MensagensController');
const calendarioController = require('../controllers/CalendarioController');

const { 
    seJaLogadoRedireciona, 
    protegerRota, 
    verificarSeJaTemPerfil,
    verificarTreinador, 
    verificarAtleta, 
    verificarGestor, 
    bloquearCriarClubeSeJaTiver
} = require('../middlewares/authMiddleware');

// --- ENDPOINTS DE SESSÃO E LOGOUT ---
router.get('/api/dashboard/dados', protegerRota, mainController.getDadosSessao);
router.get('/mngr/logout', mainController.logoutUtilizador);

// --- ROTAS DE AUTENTICAÇÃO VISTAS PÚBLICAS ---
router.get('/', mainController.getHome);
router.get('/mngr/register', seJaLogadoRedireciona, mainController.getRegister);
router.get('/mngr/login', seJaLogadoRedireciona, mainController.getLogin);
router.get('/mngr/maisdetalhes', protegerRota, verificarSeJaTemPerfil, mainController.getMaisDetalhes);

// --- COMPONENTES ESTRUTURAIS ---
router.get('/mngr/components/navbar.html', protegerRota, mainController.getNavbar);
router.get('/mngr/components/sidebar.html', protegerRota, mainController.getSidebarTreinador);
router.get('/mngr/dashboard/mensagens', protegerRota, mainController.getMensagens);
router.get('/mngr/api/layout-dados', protegerRota, mainController.getDadosLayout);
router.get('/mngr/api/desportos', mainController.getDesportos);

// =========================================================================
// 🔒 ROTAS PROTEGIDAS 
// =========================================================================

router.get('/mngr/dashboard', verificarTreinador, treinadorController.getTreinadorIndex);
router.get('/mngr/treinador/treinador_index', verificarTreinador, treinadorController.getTreinadorIndex);
router.get('/mngr/treinador/treinador_jogo', verificarTreinador, treinadorController.getTreinadorJogo);

router.get('/mngr/gestorClube/equipas', verificarGestor, gestorController.getEquipas);
router.get('/mngr/gestorClube/equipa_detalhes', verificarGestor, gestorController.getEquipaDetalhes);
router.get('/mngr/gestorClube/criarClube', verificarGestor, bloquearCriarClubeSeJaTiver, gestorController.getCriarClube);
router.get('/mngr/painel-equipas-dados', protegerRota, gestorController.getPainelEquipasDados);
router.get('/mngr/api/equipa/:id', verificarGestor, gestorController.obterDetalhesEquipa);
router.get('/mngr/api/equipa/:id/plantel', verificarGestor, gestorController.obterPlantelEquipa);

// Ações de Gestão de Plantel (Gestor)
router.post('/mngr/equipa/criar-membro', verificarGestor, gestorController.criarMembroEquipa);
router.post('/mngr/equipa/convidar-membro', verificarGestor, gestorController.convidarMembroEquipa);

// Rotas Atleta
router.get('/mngr/atleta/inicio', verificarAtleta, atletaController.getAtletaIndex);
router.get('/mngr/api/atleta/dashboard-dados', protegerRota, atletaController.getDashboardDados);
router.get('/mngr/api/atleta/detalhes/:id', protegerRota, atletaController.getAtletaDetalhes); // Para os dados (JS)
router.get('/mngr/atleta/detalhes', protegerRota, atletaController.getPaginaDetalhes); // Para a visualização (HTML)

router.post('/mngr/register', mainController.registarUtilizador);      
router.post('/mngr/register-social', mainController.registarUtilizadorSocial); 
router.post('/mngr/login', mainController.autenticarUtilizador);
router.post('/mngr/criar-equipa', verificarGestor, gestorController.criarEquipa);
router.post('/mngr/gestorClube/guardarClube', verificarGestor, gestorController.guardarClube);
router.post('/mngr/guardar-detalhes-gestor', protegerRota, gestorController.guardarDetalhesGestor);
router.post('/mngr/equipas/editar/:id', verificarGestor, gestorController.editarEquipa);
router.post('/mngr/guardar-detalhes-atleta', protegerRota, atletaController.guardarDetalhesAtleta);
router.post('/mngr/guardar-detalhes-treinador', protegerRota, treinadorController.guardarDetalhesTreinador);

// --- ROTAS DE NOTIFICAÇÕES E CONVITES ---
router.get('/mngr/api/notificacoes/convites', protegerRota, mainController.getConvitesPendentes);
router.post('/mngr/api/notificacoes/responder', protegerRota, mainController.responderConvite);

// =========================================================================
// 💬 ROTAS DO SISTEMA DE MENSAGENS (CHAT)
// =========================================================================
router.get('/mngr/api/mensagens/contactos', protegerRota, mensagensController.getListaContactos);
router.get('/mngr/api/mensagens/conversa/:id_destinatario', protegerRota, mensagensController.getConversaComUtilizador);
router.post('/mngr/api/mensagens/enviar', protegerRota, mensagensController.enviarMensagem);
router.post('/mngr/api/mensagens/lidas/:id_destinatario', protegerRota, mensagensController.marcarMensagensLidas);
router.get('/mngr/api/mensagens/sugestoes', protegerRota, mensagensController.getSugestoesNovosContactos);

// =========================================================================
// 📅 ROTAS DO CALENDÁRIO
// =========================================================================

// Rota para cargar la vista HTML del calendario
router.get('/mngr/dashboard/calendario', protegerRota, calendarioController.getCalendario);

// Endpoint API para que el archivo JS de la vista pida los datos del usuario y eventos
router.get('/mngr/api/calendario/dados', protegerRota, calendarioController.getCalendarioDados);

// Endpoint API para procesar la creación del formulario del modal (envía datos a la BD)
router.post('/mngr/api/eventos', protegerRota, calendarioController.criarEvento);

module.exports = router;