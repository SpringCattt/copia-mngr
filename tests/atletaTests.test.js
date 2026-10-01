// tests/atletaTests.test.js

// Injeção de variáveis de ambiente obrigatórias para evitar falhas nos controladores
process.env.SUPABASE_URL = 'https://mock-projeto-mngr.supabase.co';
process.env.SUPABASE_KEY = 'chave-falsa-apenas-para-passar-o-validador-de-testes-123';

const request = require('supertest');

// Função auxiliar para gerar um Mock Universal Dinâmico via Proxy para controladores secundários
const criarMockControladorUniversal = () => {
    return new Proxy({}, {
        get: (target, prop) => {
            return (req, res, next) => {
                if (typeof next === 'function') return next();
                if (res && typeof res.status === 'function') {
                    return res.status(200).send(`Mocked Property: ${String(prop)}`);
                }
            };
        }
    });
};

// 1. MOCKS ESTRITOS APENAS PARA OS CONTROLADORES VIZINHOS (O AtletaController DEVE ser o real)
jest.mock('../controllers/AdministradorController', () => criarMockControladorUniversal(), { virtual: true });
jest.mock('../controllers/TreinadorController', () => criarMockControladorUniversal(), { virtual: true });
jest.mock('../controllers/GestorController', () => criarMockControladorUniversal(), { virtual: true });
jest.mock('../controllers/MensagensController', () => criarMockControladorUniversal(), { virtual: true });
jest.mock('../controllers/CalendarioController', () => criarMockControladorUniversal(), { virtual: true });
jest.mock('../controllers/EstatisticasController', () => criarMockControladorUniversal(), { virtual: true });
jest.mock('../controllers/TreinosController', () => criarMockControladorUniversal(), { virtual: true });

// Certifica que o AtletaController original é preservado sem interferência do proxy
jest.unmock('../controllers/AtletaController');

// 2. MOCK INTEGRAL E SEGURO DOS MIDDLEWARES DE AUTENTICAÇÃO
jest.mock('../middlewares/authMiddleware', () => ({
    protegerRota: (req, res, next) => {
        req.session = req.session || {};
        req.session.userId = 101;
        req.session.userRole = 'ATLETA';
        next();
    },
    verificarTreinador: (req, res, next) => next(),
    verificarAdmin: (req, res, next) => next(),
    verificarGestor: (req, res, next) => next(),
    verificarAtleta: (req, res, next) => next(),
    seJaLogadoRedireciona: (req, res, next) => next(),
    verificarSeJaTemPerfil: (req, res, next) => next(),
    bloquearCriarClubeSeJaTiver: (req, res, next) => next(),
    verificarGestorOuTreinador: (req, res, next) => next()
}));

// 3. MOCK GLOBAL DA BASE DE DADOS POSTGRESQL
jest.mock('../database/connection', () => ({
    pool: {
        query: jest.fn(),
        connect: jest.fn(() => ({
            query: jest.fn(),
            release: jest.fn()
        }))
    }
}));

// Carregamento seguro da aplicação com os isolamentos configurados
const app = require('../index');
const { pool } = require('../database/connection');

describe('=== Suite de Testes - AtletaController ===', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Fallback padrão: o utilizador 101 existe e é um Atleta para passar nas validações iniciais
        pool.query.mockResolvedValue({ rows: [{ id: 101, tipo_utilizador: 'ATLETA', role: 'atleta' }] });
    });

    // =========================================================================
    // 1. CRIAÇÃO DE PERFIL DE ATLETA (VALIDAÇÕES E LÓGICA DE NEGÓCIO)
    // =========================================================================
    describe('POST /mngr/guardar-detalhes-atleta', () => {
        it('Deve retornar 400 caso falte algum campo obrigatório da ficha', async () => {
            const mockClient = { query: jest.fn(), release: jest.fn() };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/mngr/guardar-detalhes-atleta')
                .send({ nome_completo: 'Atleta Teste', id_genero: 1 });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('Deve retornar 400 caso a conta seja nova (sem registo prévio) e a data de nascimento não seja enviada', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockResolvedValueOnce({}) // UPDATE utilizador
                    .mockResolvedValueOnce({ rows: [] }) // SELECT atletas -> não existe registo prévio
                    .mockResolvedValue({}),    // ROLLBACK
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/guardar-detalhes-atleta')
                .send({
                    nome_completo: 'Atleta Sem Data',
                    id_genero: 1,
                    altura: 175,
                    peso: 70,
                    cidade: 'Aveiro',
                    id_desporto: 2
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/data de nascimento/i);
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('Deve preservar a data de nascimento e o desporto definidos pelo Gestor quando o atleta já tinha registo prévio', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockResolvedValueOnce({}) // UPDATE utilizador
                    .mockResolvedValueOnce({ rows: [{ data_nascimento: '2010-05-10', id_genero: null, id_desporto: 3 }] }) // já existe registo do gestor
                    .mockResolvedValueOnce({}) // UPDATE atletas
                    .mockResolvedValue({}),    // COMMIT
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/guardar-detalhes-atleta')
                .send({
                    nome_completo: 'Atleta Pré-Registado',
                    id_genero: 1,
                    altura: 180,
                    peso: 75,
                    cidade: 'Porto',
                    id_desporto: 5
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.redirectTo).toBe('/mngr/atleta/inicio');
            // id_desporto deve manter o valor já existente (3), não o novo (5), pois já estava definido
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE atletas'),
                [101, 1, 180, 75, 'Porto', 3]
            );
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('Deve criar o registo completo do atleta com sucesso quando é a primeira vez (auto-registo)', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockResolvedValueOnce({}) // UPDATE utilizador
                    .mockResolvedValueOnce({ rows: [] }) // SELECT atletas -> sem registo prévio
                    .mockResolvedValueOnce({}) // INSERT atletas
                    .mockResolvedValue({}),    // COMMIT
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/guardar-detalhes-atleta')
                .send({
                    nome_completo: 'Atleta Novo',
                    data_nascimento: '2011-03-20',
                    id_genero: 2,
                    altura: 160,
                    peso: 55,
                    cidade: 'Aveiro',
                    id_desporto: 1
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.redirectTo).toBe('/mngr/atleta/inicio');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('Deve efetuar ROLLBACK e devolver 500 em caso de erro inesperado na base de dados', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockRejectedValueOnce(new Error('Falha simulada de ligação')),
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/guardar-detalhes-atleta')
                .send({
                    nome_completo: 'Atleta Falhado',
                    id_genero: 1,
                    altura: 170,
                    peso: 65,
                    cidade: 'Aveiro',
                    id_desporto: 1
                });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 2. DASHBOARD DO ATLETA (AGREGAÇÃO DE DADOS E ESTATÍSTICAS)
    // =========================================================================
    describe('GET /mngr/api/atleta/dashboard-dados', () => {
        it('Deve retornar success:false caso o atleta não seja encontrado na base de dados', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // queryPerfil sem resultados

            const res = await request(app).get('/mngr/api/atleta/dashboard-dados');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(false);
        });

        it('Deve devolver o perfil básico sem agenda/estatísticas quando o atleta não pertence a nenhuma equipa ativa', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{ nome_curto: 'Zé', nome_completo: 'José Silva', atleta_id: null, id_equipa: null, data_nascimento: null }]
            });

            const res = await request(app).get('/mngr/api/atleta/dashboard-dados');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.agenda.proximo).toBeNull();
            expect(res.body.stats.jogos).toBe(0);
        });

        it('Deve calcular a idade corretamente e estruturar agenda/estatísticas quando o atleta tem equipa ativa', async () => {
            pool.query
                .mockResolvedValueOnce({
                    rows: [{
                        nome_curto: 'Zé', nome_completo: 'José Silva',
                        atleta_id: 55, id_equipa: 10, data_nascimento: '2010-06-21'
                    }]
                }) // queryPerfil
                .mockResolvedValueOnce({ rows: [{ id: 1, titulo: 'Próximo Jogo' }] }) // resProximo
                .mockResolvedValueOnce({ rows: [{ id: 2, titulo: 'Último Jogo' }] }) // resUltimo
                .mockResolvedValueOnce({ rows: [{ jogos: '5', minutos: '300', golos: '2', assistencias: '1' }] }) // resStats
                .mockResolvedValueOnce({ rows: [] }) // queryFeedback (sem feedbacks pendentes)
                .mockResolvedValueOnce({ rows: [] }); // resEpocas

            const res = await request(app).get('/mngr/api/atleta/dashboard-dados');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.idade).toBe(16);
            expect(res.body.agenda.proximo.titulo).toBe('Próximo Jogo');
            expect(res.body.stats.jogos).toBe('5');
        });

        it('Deve criar uma nova notificação de feedback pendente apenas quando ainda não existe notificação equivalente', async () => {
            pool.query
                .mockResolvedValueOnce({
                    rows: [{ nome_curto: 'Zé', atleta_id: 55, id_equipa: 10, data_nascimento: null }]
                }) // queryPerfil
                .mockResolvedValueOnce({ rows: [] }) // resProximo
                .mockResolvedValueOnce({ rows: [] }) // resUltimo
                .mockResolvedValueOnce({ rows: [{ jogos: '0', minutos: '0', golos: '0', assistencias: '0' }] }) // resStats
                .mockResolvedValueOnce({ rows: [{ id: 99, titulo: 'Treino Físico' }] }) // queryFeedback -> 1 pendente
                .mockResolvedValueOnce({ rows: [] }) // checkNotif -> não existe ainda
                .mockResolvedValueOnce({}) // INSERT notificacao
                .mockResolvedValueOnce({ rows: [] }); // resEpocas

            const res = await request(app).get('/mngr/api/atleta/dashboard-dados');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.feedbacksPendentes).toHaveLength(1);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO notificacao'),
                expect.arrayContaining([101])
            );
        });
    });

    // =========================================================================
    // 3. DETALHES DE UM ATLETA ESPECÍFICO (VISTO POR GESTOR/TREINADOR)
    // =========================================================================
    describe('GET /mngr/api/atleta/detalhes/:id', () => {
        it('Deve devolver success:false caso o atleta indicado não exista', async () => {
            const mockClient = {
                query: jest.fn().mockResolvedValueOnce({ rows: [] }),
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app).get('/mngr/api/atleta/detalhes/999');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(false);
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('Deve devolver os dados completos da ficha do atleta com as suas estatísticas agregadas', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({ rows: [{ id: 101, nome: 'Zé', idade: 16, altura: 175, peso: 70 }] }) // queryFicha
                    .mockResolvedValueOnce({ rows: [{ jogos: '10', minutos: '600', golos: '3', assistencias: '2' }] }), // queryStats
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app).get('/mngr/api/atleta/detalhes/101');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.dados.atleta.nome).toBe('Zé');
            expect(res.body.dados.stats.jogos).toBe('10');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 4. EDIÇÃO DE FICHA TÉCNICA (PESO/ALTURA) PELO GESTOR
    // =========================================================================
    describe('PUT /mngr/api/atleta/editar/:id', () => {
        it('Deve criar a ficha técnica do atleta caso ainda não exista nenhum registo', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockResolvedValueOnce({ rows: [] }) // SELECT -> sem perfil prévio
                    .mockResolvedValueOnce({}) // INSERT atletas
                    .mockResolvedValue({}),    // COMMIT
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .put('/mngr/api/atleta/editar/101')
                .send({ altura: 180, peso: 75 });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO public.atletas'),
                [101, 180, 75]
            );
        });

        it('Deve atualizar a ficha técnica existente sem duplicar o registo', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockResolvedValueOnce({ rows: [{ id_utilizador: 101 }] }) // SELECT -> já existe
                    .mockResolvedValueOnce({}) // UPDATE atletas
                    .mockResolvedValue({}),    // COMMIT
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .put('/mngr/api/atleta/editar/101')
                .send({ altura: 182, peso: 78 });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE public.atletas'),
                [182, 78, 101]
            );
        });

        it('Deve efetuar ROLLBACK e devolver 500 caso ocorra um erro ao gravar a ficha técnica', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockRejectedValueOnce(new Error('Falha simulada')),
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .put('/mngr/api/atleta/editar/101')
                .send({ altura: 180, peso: 75 });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });
});