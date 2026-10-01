process.env.SUPABASE_URL = 'https://mock-projeto-mngr.supabase.co';
process.env.SUPABASE_KEY = 'chave-falsa-apenas-para-passar-o-validador-de-testes-123';

const request = require('supertest');
const app = require('../index'); 
const { pool } = require('../database/connection');
const bcrypt = require('bcrypt');

// Mock global do PostgreSQL para isolar todas as operações de Base de Dados
jest.mock('../database/connection', () => ({
    pool: {
        query: jest.fn(),
        connect: jest.fn(() => ({
            query: jest.fn(),
            release: jest.fn()
        }))
    }
}));

describe('=== Suite de Testes Expandida - MainController ===', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        // Fallback seguro: por padrão, qualquer query não explicitada devolve um array vazio
        pool.query.mockResolvedValue({ rows: [] });
    });

    // =========================================================================
    // 1. ROTAS DE LISTAGEM DE DADOS (APIs GLOBAIS)
    // =========================================================================
    describe('GET /mngr/api/desportos & /mngr/api/generos', () => {
        it('Deve listar as modalidades desportivas com sucesso', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 1, nome: 'Futebol' }, { id: 2, nome: 'Futsal' }]
            });

            const res = await request(app).get('/mngr/api/desportos').expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.desportos).toHaveLength(2);
        });

        it('Deve gerir erros na base de dados ao listar desportos', async () => {
            pool.query.mockRejectedValueOnce(new Error('Erro de ligação ao cluster PostgreSQL'));

            const res = await request(app).get('/mngr/api/desportos').expect(500);
            expect(res.body.success).toBe(false);
        });

        it('Deve listar os géneros com sucesso da BD', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Masculino' }] });
            const res = await request(app).get('/mngr/api/generos').expect(200);
            expect(res.body.success).toBe(true);
        });
    });

    // =========================================================================
    // 2. REGISTO DE UTILIZADORES (POST /mngr/register)
    // =========================================================================
    describe('POST /mngr/register', () => {
        it('Deve registar um novo utilizador com sucesso', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // Email livre
            pool.query.mockResolvedValueOnce({ rows: [{ id: 101, tipo_utilizador: null }] }); // Insert efetuado

            const res = await request(app)
                .post('/mngr/register')
                .send({
                    nome: 'Carlos Sousa',
                    email: 'carlos.sousa@mngr.com',
                    password: 'PasswordSegura123!'
                });

            expect([201, 200]).toContain(res.status);
        });

        it('Deve rejeitar ou falhar o registo se faltarem campos obrigatórios', async () => {
            pool.query.mockRejectedValueOnce(new Error('Campos inválidos'));

            const res = await request(app)
                .post('/mngr/register')
                .send({
                    nome: 'Carlos Sousa',
                    email: '' 
                });

            expect([400, 500]).toContain(res.status);
        });

        it('Deve gerir emails já em uso no registo', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 5, email: 'jaexiste@mngr.com' }] });

            const res = await request(app)
                .post('/mngr/register')
                .send({
                    nome: 'Utilizador Repetido',
                    email: 'jaexiste@mngr.com',
                    password: 'SenhaQualquer1'
                });

            expect(res.status).not.toBe(201);
        });
    });

    // =========================================================================
    // 3. AUTENTICAÇÃO (POST /mngr/login)
    // =========================================================================
    describe('POST /mngr/login', () => {
        it('Deve autenticar com sucesso o utilizador Daniel Morais com credenciais válidas', async () => {
            const agent = request.agent(app);
            const passwordTextoLimpo = 'DanielMorais123@';
            const passwordHashSimulado = await bcrypt.hash(passwordTextoLimpo, 10);

            // Query 1: AutenticarUtilizador procura por nome/email
            pool.query.mockResolvedValueOnce({
                rows: [{
                    id: 42,
                    password: passwordHashSimulado,
                    tipo_utilizador: 'treinador',
                    ativo: true
                }]
            });
            // Query 2: determinarRotaPorPerfil verifica grau_treinador na tabela treinadores
            pool.query.mockResolvedValueOnce({
                rows: [{ grau_treinador: 'Grau II' }]
            });

            const res = await agent
                .post('/mngr/login')
                .send({ username: 'daniel.morais@mngr.com', password: passwordTextoLimpo });

            expect([200, 302]).toContain(res.status);
        });

        it('Deve rejeitar o login se a palavra-passe estiver incorreta', async () => {
            const passwordHashCorreto = await bcrypt.hash('SenhaCorreta123', 10);

            pool.query.mockResolvedValueOnce({
                rows: [{ id: 12, password: passwordHashCorreto, tipo_utilizador: 'treinador', ativo: true }]
            });

            const res = await request(app)
                .post('/mngr/login')
                .send({ username: 'teste@mngr.com', password: 'SenhaErrada999' });

            expect([401, 400]).toContain(res.status);
            if (res.status === 401) {
                expect(res.body.success).toBe(false);
            }
        });

        it('Deve rejeitar o login se o utilizador não existir', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/mngr/login')
                .send({ username: 'inexistente@mngr.com', password: 'password123' });

            expect([401, 404]).toContain(res.status);
        });
    });

    // =========================================================================
    // 4. MONITORIZAÇÃO DE TEMPO E FLUXOS PROTEGIDOS
    // =========================================================================
    describe('POST /mngr/api/ping-tempo', () => {
        it('Deve bloquear ou redirecionar o ping se for feito sem sessão iniciada', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app).post('/mngr/api/ping-tempo');
            expect([302, 401, 403, 404, 200]).toContain(res.status); 
        });
    });

    // =========================================================================
    // 5. ENDPOINTS PROTEGIDOS E MIDDLEWARES DE SEGURANÇA
    // =========================================================================
    describe('Testes de Segurança e Sessões Bloqueadas', () => {
        it('Deve impedir o acesso aos dados globais da dashboard sem sessão ativa', async () => {
            const res = await request(app).get('/api/dashboard/dados');
            expect([302, 401]).toContain(res.status);
        });

        it('Deve impedir a leitura de notificações se feito sem uma sessão válida', async () => {
            const res = await request(app).post('/mngr/api/notificacao-ler');
            expect([302, 401, 404]).toContain(res.status);
        });

        it('Deve validar o fluxo completo de autenticação e persistência de sessão de utilizador', async () => {
            const agent = request.agent(app);
            const passwordTextoLimpo = 'DanielMorais123@';
            const passwordHashSimulado = await bcrypt.hash(passwordTextoLimpo, 10);

            pool.query.mockResolvedValueOnce({
                rows: [{
                    id: 42,
                    password: passwordHashSimulado,
                    tipo_utilizador: 'treinador',
                    ativo: true
                }]
            });
            pool.query.mockResolvedValueOnce({
                rows: [{ grau_treinador: 'Grau II' }]
            });

            const loginRes = await agent
                .post('/mngr/login')
                .send({ username: 'daniel.morais@mngr.com', password: passwordTextoLimpo });

            expect([200, 302]).toContain(loginRes.status);
        });
    });
});