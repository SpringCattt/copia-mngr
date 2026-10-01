// routes/indexRoutes.js
const express = require('express');
const router = express.Router();

const mainController = require('../controllers/MainController');
const treinadorController = require('../controllers/TreinadorController'); 
const gestorController = require('../controllers/GestorController'); 
const atletaController = require('../controllers/AtletaController'); 
const mensagensController = require('../controllers/MensagensController');
const calendarioController = require('../controllers/CalendarioController');
const adminController = require('../controllers/AdministradorController');
const estatisticasController = require('../controllers/EstatisticasController');
const treinosController = require('../controllers/TreinosController');

const {
    seJaLogadoRedireciona,
    protegerRota,
    verificarSeJaTemPerfil,
    verificarTreinador,
    verificarAtleta,
    verificarGestor,
    verificarAdmin,
    bloquearCriarClubeSeJaTiver,
    verificarGestorOuTreinador
} = require('../middlewares/authMiddleware');

// --- ENDPOINTS DE SESSÃO E LOGOUT ---
router.get('/api/dashboard/dados', protegerRota, mainController.getDadosSessao);
router.get('/mngr/logout', mainController.logoutUtilizador);

// --- ROTAS DE AUTENTICAÇÃO VISTAS PÚBLICAS ---
router.get('/', mainController.getHome);
router.get('/mngr/register', seJaLogadoRedireciona, mainController.getRegister);
router.get('/mngr/login', seJaLogadoRedireciona, mainController.getLogin);
router.get('/mngr/maisdetalhes', protegerRota,  mainController.getMaisDetalhes);

// --- COMPONENTES ESTRUTURAIS ---
router.get('/mngr/components/navbar.html', protegerRota, mainController.getNavbar);
router.get('/mngr/components/sidebar.html', protegerRota, mainController.getSidebarTreinador);
router.get('/mngr/dashboard/mensagens', protegerRota, mainController.getMensagens);
router.get('/mngr/perfil', protegerRota, mainController.getPerfil);
router.get('/mngr/perfil/dados', protegerRota, mainController.getPerfilDados);
router.post('/mngr/perfil/alteraravatar', protegerRota, mainController.alterarAvatarUtilizador);
router.post('/mngr/perfil/alterar-password', protegerRota, mainController.alterarPassword);
router.get('/mngr/api/layout-dados', protegerRota, mainController.getDadosLayout);
router.get('/mngr/api/dados-pre-registo', protegerRota, mainController.getDadosPreRegisto);
router.get('/mngr/api/desportos', mainController.getDesportos);
router.get('/mngr/api/generos', mainController.getGeneros);

// =========================================================================
// 🔒 ROTAS PROTEGIDAS 
// =========================================================================

router.get('/mngr/dashboard', protegerRota, verificarTreinador, treinadorController.getTreinadorIndex);
router.get('/mngr/treinador/treinador_index', protegerRota, verificarTreinador, treinadorController.getTreinadorIndex);
router.get('/mngr/treinador/treinador_jogo', protegerRota, treinadorController.getTreinadorJogo);
router.get('/mngr/api/jogo/:id', protegerRota, treinadorController.getJogoDados);
router.post('/mngr/api/jogo/:id/resultado', protegerRota, treinadorController.guardarResultado);
router.post('/mngr/api/jogo/:id/golo', protegerRota, treinadorController.adicionarGolo);
router.delete('/mngr/api/jogo/:id/golo/:idGolo', protegerRota, treinadorController.removerGolo);
router.post('/mngr/api/jogo/:id/estatisticas', protegerRota, treinadorController.guardarEstatisticas);
router.post('/mngr/api/jogo/:id/atleta-stats', protegerRota, treinadorController.guardarEstatisticasAtletas);
router.post('/mngr/api/jogo/:id/cartao', protegerRota, treinadorController.adicionarCartao);
router.delete('/mngr/api/jogo/:id/cartao/:idCartao', protegerRota, treinadorController.removerCartao);
router.post('/mngr/api/jogo/:id/penalidade', protegerRota, treinadorController.adicionarPenalidade);
router.delete('/mngr/api/jogo/:id/penalidade/:idPenalidade', protegerRota, treinadorController.removerPenalidade);
router.get('/mngr/api/treinador/dashboard-dados', protegerRota, verificarTreinador, treinadorController.getDashboard);
router.get('/mngr/api/jogo/:id/relatorio', treinadorController.gerarRelatorioPDF);

router.get('/mngr/admin/inicio', protegerRota, verificarAdmin, adminController.getAdminIndex);

router.get('/mngr/gestorClube/equipas', protegerRota, verificarGestor, gestorController.getEquipas);
router.get('/mngr/gestorClube/equipa_detalhes', protegerRota, verificarGestor, gestorController.getEquipaDetalhes);
router.get('/mngr/gestorClube/criarClube', protegerRota, verificarGestor, bloquearCriarClubeSeJaTiver, gestorController.getCriarClube);
router.get('/mngr/painel-equipas-dados', protegerRota, gestorController.getPainelEquipasDados);
router.get('/mngr/api/equipa/:id', protegerRota, verificarGestorOuTreinador, gestorController.obterDetalhesEquipa);
router.get('/mngr/api/equipa/:id/plantel', protegerRota, verificarGestorOuTreinador, gestorController.obterPlantelEquipa);
router.get('/mngr/api/equipa/:id/competicoes', protegerRota, verificarGestorOuTreinador, gestorController.obterCompeticoesEquipa);
router.post('/mngr/api/competicao/:id/editar', protegerRota, verificarGestor, gestorController.editarCompeticao);

// Ações de Gestão de Plantel (Gestor)
router.post('/mngr/equipa/criar-membro', protegerRota, verificarGestor, gestorController.criarMembroEquipa);
router.post('/mngr/equipa/convidar-membro', protegerRota, verificarGestor, gestorController.convidarMembroEquipa);
router.post('/mngr/equipa/remover-membro', protegerRota, verificarGestor, gestorController.removerMembroEquipa);
router.get('/mngr/api/equipa/:id/equipas-mesma-modalidade', protegerRota, verificarGestor, gestorController.getEquipasMesmaModalidadeSemTreinador);
router.post('/mngr/equipa/mover-treinador', protegerRota, verificarGestor, gestorController.moverTreinadorEquipa);
router.get('/mngr/api/equipa/:id/outras-equipas-clube', protegerRota, verificarGestor, gestorController.getEquipasClubeExceto);
router.post('/mngr/api/equipa/:idEquipa/mudar-escalao', protegerRota, verificarGestor, gestorController.mudarEscalaoAtleta);


router.get('/mngr/gestorClube/inicio', verificarGestor, gestorController.getGestorIndex);
router.get('/mngr/api/gestor/dashboard-dados', protegerRota, verificarGestor, gestorController.getDashboardDados);
// Rotas Atleta
router.get('/mngr/atleta/inicio', protegerRota, verificarAtleta, atletaController.getAtletaIndex);
router.get('/mngr/api/atleta/dashboard-dados', protegerRota, atletaController.getDashboardDados);

// As duas rotas da página de detalhes (Visualização e Edição)
router.get('/mngr/atleta/detalhes', protegerRota, atletaController.getPaginaDetalhes); 
router.get('/mngr/api/atleta/detalhes/:id', protegerRota, atletaController.getAtletaDetalhes); 
router.put('/mngr/api/atleta/editar/:id', protegerRota, verificarGestor, atletaController.guardarEdicaoAtleta); 

router.post('/mngr/register', mainController.registarUtilizador);      
router.post('/mngr/register-social',  mainController.registarUtilizadorSocial); 
router.post('/mngr/login', mainController.autenticarUtilizador);
router.post('/mngr/api/ping-tempo', protegerRota, mainController.pingTempoUso);
router.post('/mngr/criar-equipa', protegerRota, verificarGestor, gestorController.criarEquipa);
router.post('/mngr/gestorClube/guardarClube', protegerRota, verificarGestor, gestorController.guardarClube);
router.post('/mngr/criar-competicao', protegerRota, verificarGestor, gestorController.criarCompeticao);
router.post('/mngr/guardar-detalhes-gestor', protegerRota, gestorController.guardarDetalhesGestor);
router.post('/mngr/equipas/editar/:id', protegerRota, verificarGestor, gestorController.editarEquipa);
router.post('/mngr/guardar-detalhes-atleta', protegerRota, atletaController.guardarDetalhesAtleta);
router.post('/mngr/guardar-detalhes-treinador', protegerRota, treinadorController.guardarDetalhesTreinador);
router.post('/mngr/api/escaloes', protegerRota, verificarGestor, gestorController.criarEscalao);

// --- ROTAS DE NOTIFICAÇÕES E CONVITES ---
router.get('/mngr/api/notificacoes', protegerRota, mainController.getNotificacoes);
router.post('/mngr/api/notificacoes/marcar-vista', protegerRota, mainController.marcarNotificacaoVista);
router.post('/mngr/api/notificacoes/marcar-vista-evento', protegerRota, mainController.marcarNotificacaoEventoVista);
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
router.get('/mngr/api/mensagens/por-conversa/:id_conversa', protegerRota, mensagensController.getContactoPorConversa);

// =========================================================================
// 📅 ROTAS DO CALENDÁRIO E FEEDBACK EXCLUSIVO
// =========================================================================
router.get('/mngr/dashboard/calendario', protegerRota, calendarioController.getCalendario);
router.get('/mngr/api/calendario/dados', protegerRota, calendarioController.getCalendarioDados);
router.post('/mngr/api/eventos', protegerRota, calendarioController.uploadMiddleware, calendarioController.criarEvento);
router.put('/mngr/api/eventos/:id', protegerRota, calendarioController.uploadMiddleware, calendarioController.editarEvento);
router.delete('/mngr/api/eventos/:id', protegerRota, calendarioController.eliminarEvento);
router.get('/mngr/api/equipas-rivais', protegerRota, calendarioController.getEquipasRivais);
router.get('/mngr/api/evento/:id', protegerRota, calendarioController.getEventoSimples);

// 🌟 ROTAS DE FEEDBACK DE SESSÃO
router.get('/mngr/api/calendario/sessao-feedback/:eventoId', protegerRota, calendarioController.getFeedback);
router.post('/mngr/api/calendario/sessao-feedback/:eventoId', protegerRota, calendarioController.guardarFeedback);

// =========================================================================
// 📋 ROTAS DE ASSIDUIDADE / TREINOS
// =========================================================================
router.get('/mngr/treinador/treinos', protegerRota, verificarTreinador, treinosController.getPaginaTreinos);
router.get('/mngr/treinador/equipa', protegerRota, verificarTreinador, treinadorController.getEquipaTreinador);
router.get('/mngr/api/treinos/historico', protegerRota, verificarTreinador, treinosController.getListaTreinosPassados);
router.get('/mngr/api/treinos/:id/chamada', protegerRota, verificarTreinador, treinosController.getChamadaTreino);
router.post('/mngr/api/treinos/:id/chamada', protegerRota, verificarTreinador, treinosController.submeterPresencas);
// 🆕 ROTA DE FEEDBACK POR TREINO (NOVA)
router.get('/mngr/api/treinos/:id/feedback', protegerRota, verificarTreinador, treinosController.getFeedbackTreino);

router.post('/mngr/api/jogo/:id/convocatoria', protegerRota, verificarTreinador, treinadorController.guardarConvocatoria);

// --- APIs DO PAINEL DE ADMINISTRAÇÃO ---
router.get('/mngr/api/admin/utilizadores', protegerRota, verificarAdmin, adminController.getTodosUtilizadores);
router.post('/mngr/api/admin/utilizadores/toggle', protegerRota, verificarAdmin, adminController.toggleEstadoUtilizador);
router.get('/mngr/api/admin/clubes', protegerRota, verificarAdmin, adminController.getTodosClubes);
router.post('/mngr/api/admin/clubes/toggle', protegerRota, verificarAdmin, adminController.toggleEstadoClube);
router.post('/mngr/api/admin/equipas/:id/desativar', protegerRota, verificarAdmin, adminController.desativarEquipa);
router.get('/mngr/api/admin/escaloes', protegerRota, verificarAdmin, adminController.getEscaloes);
router.post('/mngr/api/admin/escaloes', protegerRota, verificarAdmin, adminController.criarEscalao);
router.post('/mngr/api/admin/escaloes/:id/desativar', protegerRota, verificarAdmin, adminController.desativarEscalao);
router.put('/mngr/api/admin/escaloes/:id', protegerRota, verificarAdmin, adminController.editarEscalao);
router.put('/mngr/api/admin/utilizadores/:id', protegerRota, verificarAdmin, adminController.editarUtilizador);
router.get('/mngr/api/admin/estatisticas', protegerRota, verificarAdmin, adminController.getEstatisticasGlobais);
router.get('/mngr/api/admin/desportos-config', protegerRota, verificarAdmin, adminController.getDesportosConfig);
router.post('/mngr/api/admin/desportos-config', protegerRota, verificarAdmin, adminController.guardarDesportoConfig);
router.post('/mngr/api/admin/desportos-config/estatistica', protegerRota, verificarAdmin, adminController.adicionarEstatistica);
router.put('/mngr/api/admin/desportos-config/estatistica/:id', protegerRota, verificarAdmin, adminController.editarEstatistica);
router.delete('/mngr/api/admin/desportos-config/estatistica/:id', protegerRota, verificarAdmin, adminController.removerEstatistica);
router.post('/mngr/api/admin/desportos-config/reordenar', protegerRota, verificarAdmin, adminController.reordenarEstatisticas);
router.post('/mngr/api/admin/desportos', protegerRota, verificarAdmin, adminController.criarDesporto);
router.delete('/mngr/api/admin/desportos/:id', protegerRota, verificarAdmin, adminController.removerDesporto);
router.get('/mngr/api/admin/utilizadores/:id/detalhes', protegerRota, verificarAdmin, adminController.getDetalhesUtilizador);
router.put('/mngr/api/admin/utilizadores/:id/detalhes', protegerRota, verificarAdmin, adminController.atualizarDetalhesUtilizador);

router.get('/mngr/treinador/exames_fisicos', protegerRota,treinadorController.getExamesFisicos);
router.get('/mngr/api/treinador/atletas-equipa',protegerRota, treinadorController.getExamesDados);
router.post('/mngr/api/treinador/exames_fisicos',  protegerRota, treinadorController.guardarExameFisico);
router.get('/mngr/api/treinador/exames_fisicos/:id', protegerRota, treinadorController.getExameFisicoPorId);
router.delete('/mngr/api/treinador/exames_fisicos/:id', protegerRota, treinadorController.eliminarExameFisico);

// =========================================================================
// 📊 ESTATÍSTICAS
// =========================================================================
router.get('/mngr/dashboard/estatisticas', protegerRota, estatisticasController.getEstatisticasView);
router.get('/mngr/api/dashboard/estatisticas-dados', protegerRota, estatisticasController.getEstatisticasDados);

// 🌟 ROTAS DE ATAS DE REUNIÃO
router.get('/mngr/api/calendario/ata/:eventoId', protegerRota, calendarioController.getAta);
router.post('/mngr/api/calendario/ata/:eventoId', protegerRota, calendarioController.guardarAta);



// ⚠️ EXPORTAÇÃO DO ROUTER SEMPRE NA ÚLTIMA LINHA
module.exports = router;