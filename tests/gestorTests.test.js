// tests/gestorTests.test.js

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

// 1. MOCKS ESTRITOS APENAS PARA OS CONTROLADORES VIZINHOS (O GestorController DEVE ser o real)
jest.mock('../controllers/AdministradorController', () => criarMockControladorUniversal(), { virtual: true });
jest.mock('../controllers/TreinadorController', () => criarMockControladorUniversal(), { virtual: true });
jest.mock('../controllers/AtletaController', () => criarMockControladorUniversal(), { virtual: true });
jest.mock('../controllers/MensagensController', () => criarMockControladorUniversal(), { virtual: true });
jest.mock('../controllers/CalendarioController', () => criarMockControladorUniversal(), { virtual: true });
jest.mock('../controllers/EstatisticasController', () => criarMockControladorUniversal(), { virtual: true });
jest.mock('../controllers/TreinosController', () => criarMockControladorUniversal(), { virtual: true });

// Certifica que o GestorController original é preservado sem interferência do proxy
jest.unmock('../controllers/GestorController');

// 2. MOCK DO BCRYPT (evita custo real de hashing nos testes de criação de membro)
jest.mock('bcrypt', () => ({
    genSalt: jest.fn().mockResolvedValue('salt-falso'),
    hash: jest.fn().mockResolvedValue('hash-falso-da-password')
}));

// 3. MOCK DO SUPABASE STORAGE (uploads de imagens)
const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'ficheiro-falso.png' }, error: null });
const mockGetPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'https://mock-storage.com/ficheiro-falso.png' } });
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        storage: {
            from: jest.fn(() => ({
                upload: mockUpload,
                getPublicUrl: mockGetPublicUrl
            }))
        }
    }))
}));

// 4. MOCK INTEGRAL E SEGURO DOS MIDDLEWARES DE AUTENTICAÇÃO
jest.mock('../middlewares/authMiddleware', () => ({
    protegerRota: (req, res, next) => {
        req.session = req.session || {};
        req.session.userId = 77;
        req.session.userRole = 'GESTOR';
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

// 5. MOCK GLOBAL DA BASE DE DADOS POSTGRESQL
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

describe('=== Suite de Testes - GestorController ===', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockUpload.mockResolvedValue({ data: { path: 'ficheiro-falso.png' }, error: null });
        mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://mock-storage.com/ficheiro-falso.png' } });
        // Fallback padrão: o utilizador 77 existe e é um Gestor para passar nas validações iniciais
        pool.query.mockResolvedValue({ rows: [{ id: 77, tipo_utilizador: 'GESTOR', role: 'gestor' }] });
    });

    // =========================================================================
    // 1. DASHBOARD DO GESTOR
    // =========================================================================
    describe('GET /mngr/api/gestor/dashboard-dados', () => {
        it('Deve retornar success:false caso o gestor ainda não tenha clube associado', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // SELECT clube

            const res = await request(app).get('/mngr/api/gestor/dashboard-dados');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(false);
        });

        it('Deve estruturar o payload completo com clube, KPIs, próximos jogos e status das equipas', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 5, nome: 'FC Aveiro', pais: 'Portugal', regiao: 'Aveiro', logo: null, ano_fundacao: 2001 }] })
                .mockResolvedValueOnce({ rows: [{ count: '3' }] })
                .mockResolvedValueOnce({ rows: [{ count: '40' }] })
                .mockResolvedValueOnce({ rows: [{ count: '5' }] })
                .mockResolvedValueOnce({ rows: [{ count: '2' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, titulo: 'Jogo 1' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, nome_equipa: 'Seniores' }] });

            const res = await request(app).get('/mngr/api/gestor/dashboard-dados');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.clube.nome).toBe('FC Aveiro');
            expect(res.body.kpis.totalEquipas).toBe(3);
            expect(res.body.kpis.totalAtletas).toBe(40);
            expect(res.body.proximosJogos).toHaveLength(1);
        });
    });

    // =========================================================================
    // 2. PAINEL DE EQUIPAS DO CLUBE
    // =========================================================================
    describe('GET /mngr/painel-equipas-dados', () => {
        it('Deve devolver clube, desportos, escalões e equipas quando o clube existe', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 5, nome: 'FC Aveiro', regiao: 'Aveiro', pais: 'Portugal', logo_url: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Futebol' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Sub-15', id_tipo_desporto: 1, genero: 'Masculino' }] })
                .mockResolvedValueOnce({ rows: [{ id: 10, nome: 'Sub-15 A' }] });

            const res = await request(app).get('/mngr/painel-equipas-dados');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.equipas).toHaveLength(1);
        });
    });

    // =========================================================================
    // 4. CRIAÇÃO DE PERFIL DE GESTOR (REGRAS DE NEGÓCIO)
    // =========================================================================
    describe('POST /mngr/guardar-detalhes-gestor', () => {
        it('Deve retornar 400 caso o gestor tenha menos de 18 anos', async () => {
            const hoje = new Date();
            const nascimentoMenor = `${hoje.getFullYear() - 10}-01-01`;

            const res = await request(app)
                .post('/mngr/guardar-detalhes-gestor')
                .send({
                    nome_completo: 'Gestor Jovem',
                    data_nascimento: nascimentoMenor,
                    sexo: 'M',
                    cidade: 'Aveiro',
                    data_inicio_carreira: '2024-01-01'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/maior de 18 anos/i);
        });

        it('Deve guardar com sucesso o perfil de gestor e redirecionar para a criação do clube', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockResolvedValueOnce({}) // UPDATE utilizador
                    .mockResolvedValueOnce({}) // INSERT gestoresClube
                    .mockResolvedValue({}),    // COMMIT
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/guardar-detalhes-gestor')
                .send({
                    nome_completo: 'Gestor Válido',
                    data_nascimento: '1990-01-01',
                    sexo: 'M',
                    cidade: 'Aveiro',
                    data_inicio_carreira: '2015-01-01'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.redirectTo).toBe('/mngr/gestorClube/criarClube');
        });
    });

    // =========================================================================
    // 5. CRIAÇÃO DO CLUBE (VALIDAÇÕES, DUPLICADOS E UPLOAD)
    // =========================================================================
    describe('POST /mngr/gestorClube/guardarClube', () => {
        it('Deve retornar 400 caso a data de fundação seja anterior a 1857', async () => {
            const mockClient = { query: jest.fn(), release: jest.fn() };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/mngr/gestorClube/guardarClube')
                .field('nome', 'Clube Antigo')
                .field('pais', 'Portugal')
                .field('regiao', 'Aveiro')
                .field('data_fundacao', '1800-01-01');

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/1857/);
        });

        it('Deve criar o clube com sucesso e devolver o redirecionamento para a página de equipas', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({ rows: [] }) // gestor não tem clube
                    .mockResolvedValueOnce({ rows: [] }) // nome+região não duplicados
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockResolvedValueOnce({ rows: [{ id: 30 }] }) // INSERT clube RETURNING id
                    .mockResolvedValue({}), // COMMIT
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/gestorClube/guardarClube')
                .field('nome', 'FC Novo')
                .field('pais', 'Portugal')
                .field('regiao', 'Aveiro')
                .field('data_fundacao', '2000-01-01');

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.redirectTo).toBe('/mngr/gestorClube/equipas');
        });
    });

    // =========================================================================
    // 6. CRIAÇÃO E EDIÇÃO DE EQUIPAS
    // =========================================================================
    describe('POST /mngr/criar-equipa', () => {
        it('Deve criar a equipa com sucesso e gerar automaticamente a conversa de grupo', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // clube existe
                    .mockResolvedValueOnce({ rows: [] }) // sem duplicado
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockResolvedValueOnce({ rows: [{ id: 40 }] }) // INSERT equipa RETURNING id
                    .mockResolvedValue({}), // INSERT conversa + COMMIT
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/criar-equipa')
                .field('nome', 'Equipa Nova')
                .field('id_tipo_desporto', '1')
                .field('id_tipo_escalao', '2');

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.equipa.id).toBe(40);
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO public.conversa'),
                [40]
            );
        });
    });

    // =========================================================================
    // 7. GESTÃO DE PLANTEL: CRIAR / CONVIDAR / REMOVER MEMBROS
    // =========================================================================
    describe('POST /mngr/equipa/criar-membro', () => {
        it('Deve criar um atleta com sucesso, encriptando a password e associando-o à equipa e ao chat de grupo', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({ rows: [] }) // escalaoRes
                    .mockResolvedValueOnce({ rows: [] }) // email não existe
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockResolvedValueOnce({ rows: [{ id: 200 }] }) // INSERT utilizador RETURNING id
                    .mockResolvedValueOnce({ rows: [{ id_tipo_desporto: 1, id_genero_escalao: 2 }] }) // dados equipa
                    .mockResolvedValueOnce({}) // INSERT atletas
                    .mockResolvedValueOnce({}) // INSERT equipa_atleta
                    .mockResolvedValueOnce({ rows: [{ id: 555 }] }) // conversa de grupo
                    .mockResolvedValueOnce({}) // INSERT participantes_conversa
                    .mockResolvedValue({}),    // COMMIT
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/equipa/criar-membro')
                .send({
                    idEquipa: 10,
                    nome: 'Atleta Novo',
                    email: 'novo@mail.com',
                    password: 'senha123',
                    cargo: 'atleta',
                    data_nascimento: '2012-01-01'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('Deve efetuar ROLLBACK caso ocorra um erro durante a criação do membro', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({ rows: [] }) // email não existe
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockRejectedValueOnce(new Error('Falha simulada ao inserir utilizador')),
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/equipa/criar-membro')
                .send({
                    idEquipa: 10,
                    nome: 'Staff Falhado',
                    email: 'staff@mail.com',
                    password: 'senha123',
                    cargo: 'staff'
                });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('POST /mngr/equipa/convidar-membro', () => {
        it('Deve retornar 404 caso não exista nenhuma conta com o email indicado', async () => {
            const mockClient = {
                query: jest.fn().mockResolvedValueOnce({ rows: [] }),
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/equipa/convidar-membro')
                .send({ idEquipa: 10, email: 'naoexiste@mail.com', cargo: 'ATLETA' });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /mngr/equipa/remover-membro', () => {
        it('Deve remover um atleta com sucesso, desativando-o e limpando notificações/chat', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({}) // UPDATE equipa_atleta
                    .mockResolvedValueOnce({ rows: [{ id: 555 }] }) // conversa de grupo
                    .mockResolvedValueOnce({}) // DELETE participantes_conversa
                    .mockResolvedValueOnce({}), // DELETE notificacao
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/equipa/remover-membro')
                .send({ idEquipa: 10, idMembro: 101, cargo: 'atleta' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // =========================================================================
    // 8. MOVER TREINADOR ENTRE EQUIPAS
    // =========================================================================
    describe('POST /mngr/equipa/mover-treinador', () => {
        it('Deve mover o treinador com sucesso, atualizando associações e conversas de grupo', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockResolvedValueOnce({}) // UPDATE equipa_treinador (saída)
                    .mockResolvedValueOnce({ rows: [] }) // sem vínculo prévio com destino
                    .mockResolvedValueOnce({}) // INSERT equipa_treinador destino
                    .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // conversa antiga
                    .mockResolvedValueOnce({}) // DELETE participante antigo
                    .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // conversa nova
                    .mockResolvedValueOnce({}) // INSERT participante novo
                    .mockResolvedValue({}),    // COMMIT
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/equipa/mover-treinador')
                .send({ idEquipaOrigem: 10, idTreinador: 55, idEquipaDestino: 20 });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('Deve efetuar ROLLBACK em caso de erro ao mover o treinador', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockRejectedValueOnce(new Error('Falha simulada')),
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/equipa/mover-treinador')
                .send({ idEquipaOrigem: 10, idTreinador: 55, idEquipaDestino: 20 });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });
    });

    // =========================================================================
    // 9. CRIAÇÃO DE ESCALÕES
    // =========================================================================
    describe('POST /mngr/api/escaloes', () => {
        it('Deve retornar 400 caso a idade mínima seja maior ou igual à idade máxima', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 5 }] }); // clube existe

            const res = await request(app)
                .post('/mngr/api/escaloes')
                .send({ nome: 'Sub-Errado', genero: 'Masculino', id_tipo_desporto: 1, idade_min: 15, idade_max: 10 });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/idade mínima/i);
        });

        it('Deve criar o escalão com sucesso quando todos os dados são válidos', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // clube existe
                .mockResolvedValueOnce({ rows: [] }) // sem duplicado
                .mockResolvedValueOnce({}); // INSERT escalao

            const res = await request(app)
                .post('/mngr/api/escaloes')
                .send({ nome: 'Sub-17', genero: 'Masculino', id_tipo_desporto: 1, idade_min: 16, idade_max: 17 });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });
    });

    // =========================================================================
    // 10. CRIAÇÃO DE COMPETIÇÕES (REGRAS DE NEGÓCIO DE FASE INICIAL)
    // =========================================================================
    describe('POST /mngr/criar-competicao', () => {
        it('Deve retornar 400 caso a fase inicial seja incompatível com o número de equipas', async () => {
            const mockClient = { query: jest.fn(), release: jest.fn() };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/mngr/criar-competicao')
                .field('nome_competicao', 'Taça Pequena')
                .field('tipo_competicao', 'eliminatoria')
                .field('num_equipas', '4')
                .field('id_equipa', '10')
                .field('fase_inicial', '16')
                .attach('imagem_competicao', Buffer.from('fake-image-content'), 'logo.png');

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/fase inicial/i);
        });

        it('Deve criar a competição com sucesso, fazendo upload da imagem e devolvendo a URL pública', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // clube do gestor
                    .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // equipa pertence ao clube
                    .mockResolvedValueOnce({ rows: [] }) // sem duplicado
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockResolvedValueOnce({ rows: [{ id: 77 }] }) // INSERT competição RETURNING id
                    .mockResolvedValue({}), // UPDATE url_imagem + COMMIT
                release: jest.fn()
            };
            pool.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .post('/mngr/criar-competicao')
                .field('nome_competicao', 'Liga Nova')
                .field('tipo_competicao', 'liga')
                .field('num_equipas', '10')
                .field('id_equipa', '10')
                .attach('imagem_competicao', Buffer.from('fake-image-content'), 'logo.png');

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.competicao.id).toBe(77);
            expect(res.body.competicao.url_imagem).toBe('https://mock-storage.com/ficheiro-falso.png');
        });
    });
});