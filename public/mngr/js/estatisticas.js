// public/mngr/js/estatisticas.js
(function() {
    setTimeout(async function inicializarModuloEstatisticas() {
        console.log("=== [SPA] Módulo Dinâmico de Estatísticas Iniciado ===");

        document.querySelectorAll('.sidebar-menu a, .sidebar a, .nav-item').forEach(el => el.classList.remove('active'));
        const linkSidebar = document.querySelector('a[href="/mngr/dashboard/estatisticas"]') || document.querySelector('a[href="/mngr/treinador/estatisticas"]');
        if (linkSidebar) {
            linkSidebar.classList.add('active');
            if (linkSidebar.closest('li')) linkSidebar.closest('li').classList.add('active');
        }

        const coresPaleta = ['#0ea5e9', '#f59e0b', '#dc2626', '#8b5cf6', '#10b981', '#6366f1', '#eab308'];

        // =========================================================================
        // 🆕 ANIMAÇÃO DOS GRÁFICOS
        // =========================================================================
        const OPCOES_ANIMACAO_SUAVE = {
            animation: false, 
            animations: {
                colors: { duration: 150 },
                numbers: { duration: 150 }
            },
            hover: { animationDuration: 150 }, 
            responsiveAnimationDuration: 0 
        };

        function comAnimacaoSuave(opcoesExtra) {
            return Object.assign({}, opcoesExtra, OPCOES_ANIMACAO_SUAVE, {
                plugins: opcoesExtra.plugins,
                scales: opcoesExtra.scales
            });
        }

        // =========================================================================
        // TOGGLES DE VISTAS
        // =========================================================================
        window.mudarVistaTreinador = function(vista) {
            document.getElementById('btn-view-jogos').classList.remove('active');
            document.getElementById('btn-view-treinos').classList.remove('active');
            document.getElementById('btn-view-exames').classList.remove('active');
            document.getElementById(`btn-view-${vista}`).classList.add('active');
            document.getElementById('view-jogos').style.display = vista === 'jogos' ? 'block' : 'none';
            document.getElementById('view-treinos').style.display = vista === 'treinos' ? 'block' : 'none';
            document.getElementById('view-exames').style.display = vista === 'exames' ? 'block' : 'none';
        };

        window.mudarVistaAtleta = function(vista) {
            document.getElementById('btn-view-atleta-jogos').classList.remove('active');
            document.getElementById('btn-view-atleta-treinos').classList.remove('active');
            document.getElementById('btn-view-atleta-exames').classList.remove('active');
            document.getElementById(`btn-view-atleta-${vista}`).classList.add('active');
            document.getElementById('view-atleta-jogos').style.display = vista === 'jogos' ? 'block' : 'none';
            document.getElementById('view-atleta-treinos').style.display = vista === 'treinos' ? 'block' : 'none';
            document.getElementById('view-atleta-exames').style.display = vista === 'exames' ? 'block' : 'none';
        };

        // =========================================================================
        // TOGGLE DE SÉRIES 
        // =========================================================================
        let chartTreinadorIntensidadeRef = null;
        window.toggleSerieTreino = function(nomeSerie) {
            if (!chartTreinadorIntensidadeRef) return;
            const btn = document.querySelector(`.serie-toggle-btn[data-serie="${nomeSerie}"]`);
            const datasets = chartTreinadorIntensidadeRef.data.datasets;
            const dataset = datasets.find(d => d.serieKey === nomeSerie);
            if (!dataset) return;
            dataset.hidden = !dataset.hidden;
            if (btn) btn.style.opacity = dataset.hidden ? '0.4' : '1';
            chartTreinadorIntensidadeRef.update();
        };

        let chartFeedbackTreinosRef = null;
        window.toggleFeedbackSerie = function(nomeSerie) {
            if (!chartFeedbackTreinosRef) return;
            const btn = document.querySelector(`.feedback-toggle-btn[data-serie="${nomeSerie}"]`);
            const datasets = chartFeedbackTreinosRef.data.datasets;
            const dataset = datasets.find(d => d.serieKey === nomeSerie);
            if (!dataset) return;
            dataset.hidden = !dataset.hidden;
            if (btn) btn.style.opacity = dataset.hidden ? '0.4' : '1';
            chartFeedbackTreinosRef.update();
        };

        let chartAtletaIntensidadeRef = null;
        window.toggleAtletaSerie = function(nomeSerie) {
            if (!chartAtletaIntensidadeRef) return;
            const btn = document.querySelector(`.atleta-serie-btn[data-serie="${nomeSerie}"]`);
            const datasets = chartAtletaIntensidadeRef.data.datasets;
            const dataset = datasets.find(d => d.serieKey === nomeSerie);
            if (!dataset) return;
            dataset.hidden = !dataset.hidden;
            if (btn) btn.style.opacity = dataset.hidden ? '0.4' : '1';
            chartAtletaIntensidadeRef.update();
        };

        // =========================================================================
        // CARREGAR DADOS
        // =========================================================================
        async function carregarLogicaPainel() {
            try {
                const res = await fetch('/mngr/api/dashboard/estatisticas-dados');
                const resposta = await res.json();
                
                if (!resposta.success) {
                    document.querySelector('.cal-mngr-wrapper').innerHTML = `
                        <div style="padding: 40px; text-align: center; margin-top: 50px; background: white; border-radius: 12px; border: 1px solid #fee2e2;">
                            <h2 style="color: #ef4444; margin-bottom: 10px;">Erro ao carregar os dados</h2>
                            <p style="color: #334155; font-size: 16px;"><strong>Motivo:</strong> ${resposta.error}</p>
                        </div>
                    `;
                    return;
                }

                const papel = resposta.role;
                const dados = resposta.dados;

                document.querySelectorAll('.stats-section-wrapper').forEach(w => w.classList.remove('active'));
                
                if (papel === 'treinador') {
                    document.getElementById('wrapper-stats-treinador').classList.add('active');
                    processarTreinador(dados);

                    const vistaPedida = new URLSearchParams(window.location.search).get('vista');
                    if (vistaPedida === 'exames' && typeof window.mudarVistaTreinador === 'function') {
                        window.mudarVistaTreinador('exames');
                    }
                } else if (papel === 'atleta') {
                    document.getElementById('wrapper-stats-atleta').classList.add('active');
                    processarAtleta(dados);
                } else if (papel === 'gestor') {
                    document.getElementById('wrapper-stats-gestor').classList.add('active');
                    processarGestor(dados);
                }
            } catch (err) { console.error("Falha na execução do JS:", err); }
        }

        // =========================================================================
        // PROCESSAR TREINADOR
        // =========================================================================
        function processarTreinador(dados) {
            document.getElementById('tj-total-golos').innerText = dados.kpis.total_golos;
            document.getElementById('tj-total-assists').innerText = dados.kpis.total_assistencias;

            const totalGolos = parseInt(dados.kpis.total_golos) || 0;
            const totalAssists = parseInt(dados.kpis.total_assistencias) || 0;
            if (totalGolos + totalAssists > 0) {
                desenharGraficoDoughnut('chartTreinadorBalancoOfensivo', ['Golos', 'Assistências'], [totalGolos, totalAssists], ['#10b981', '#0ea5e9']);
            } else {
                mostrarMensagemVazia('chartTreinadorBalancoOfensivo', 'Sem golos.');
            }
            processarResultadosGerais(dados.historicoResultados, 'tj-total-jogos', 'chartTreinadorResultados', ['tj-vitorias', 'tj-empates', 'tj-derrotas']);

            const amarelos = (dados.disciplina && dados.disciplina.amarelos) ? dados.disciplina.amarelos : 0;
            const vermelhos = (dados.disciplina && dados.disciplina.vermelhos) ? dados.disciplina.vermelhos : 0;
            document.getElementById('tj-amarelos').innerText = amarelos;
            document.getElementById('tj-vermelhos').innerText = vermelhos;
            if (amarelos + vermelhos > 0) {
                desenharGraficoDoughnut('chartTreinadorDisciplina', ['Amarelos', 'Vermelhos'], [amarelos, vermelhos], ['#f59e0b', '#dc2626']);
            } else {
                mostrarMensagemVazia('chartTreinadorDisciplina', 'Sem cartões.');
            }

            const configEvolucao = construirDatasetsDinamicos(dados.evolucaoJogos, 'golos');
            desenharGraficoLinhasMultiplas('chartTreinadorEvolucaoEquipas', configEvolucao);

            renderizarRankingComPodio('ranking-marcadores', dados.golos);
            renderizarRankingComPodio('ranking-assistentes', dados.assistencias);

            renderizarStatsAvancadasJogoTreinador(dados.historicoJogos, dados.mediasStatsJogo, dados.camposEstatisticasJogo);

            const tr = dados.treinos;
            if (tr && tr.kpis) {
                document.getElementById('tt-realizados').innerText = tr.kpis.realizados || 0;
                document.getElementById('tt-duracao').innerText = parseFloat(tr.kpis.duracao_media || 0).toFixed(1) + 'h';
            }

            if (tr && tr.evolucaoPresenca && tr.evolucaoPresenca.length > 0) {
                const taxas = tr.evolucaoPresenca.map(p => parseFloat(p.taxa_presenca || 0));
                const taxaMedia = taxas.reduce((a, b) => a + b, 0) / taxas.length;
                const el = document.getElementById('tt-taxa-presenca');
                if (el) el.innerText = taxaMedia.toFixed(1) + '%';
            }
            if (tr && tr.feedbackSeries && tr.feedbackSeries.length > 0) {
                const rpes = tr.feedbackSeries.map(f => parseFloat(f.rpe_medio || 0)).filter(v => v > 0);
                const rpeEl = document.getElementById('tt-rpe-medio');
                if (rpeEl && rpes.length > 0) rpeEl.innerText = (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1);
            }

            const contentorBarras = document.getElementById('t-presenca-barras');
            contentorBarras.innerHTML = '';
            if (tr && tr.presencasEquipas && tr.presencasEquipas.length > 0) {
                tr.presencasEquipas.forEach((eq, idx) => {
                    const cor = coresPaleta[idx % coresPaleta.length];
                    const perc = eq.total > 0 ? Math.round((eq.presentes / eq.total) * 100) : 0;
                    contentorBarras.innerHTML += `
                        <div class="progress-container">
                            <div class="progress-labels"><span>${eq.equipa}:</span><span style="color:${cor}; font-weight:bold;">${perc}%</span></div>
                            <div class="progress-track"><div class="progress-fill" style="width: ${perc}%; background-color: ${cor};"></div></div>
                            <div style="font-size:10px; color:#94a3b8; margin-top:2px;">✅ ${eq.presentes} | ❌ ${eq.faltas || 0} | ⏰ ${eq.atrasos || 0}</div>
                        </div>`;
                });
            } else {
                contentorBarras.innerHTML = '<p style="color:gray; font-size:12px; font-style:italic;">Sem treinos registados.</p>';
            }

            if (tr && tr.evolucaoPresenca) {
                desenharGraficoPresencaRpe(tr.evolucaoPresenca, tr.feedbackSeries || []);
            }

            if (tr && tr.feedbackSeries && tr.feedbackSeries.length > 0) {
                desenharGraficoFeedbackTreinos(tr.feedbackSeries);
            } else {
                mostrarMensagemVazia('chartFeedbackTreinos', 'Sem feedback registado pelos atletas.');
            }

            if (tr && tr.rankingFaltas) {
                renderizarRankingFaltas('ranking-faltas-treinos', tr.rankingFaltas);
            }

            if (tr && tr.historico) {
                renderizarHistoricoTreinos('tbody-historico-treinos', tr.historico);
            }

            renderizarExamesTreinador(dados.exames || []);
        }

        // =========================================================================
        // PAINEL DE STATS AVANÇADAS DE JOGO - TREINADOR
        // =========================================================================
        const PALETA_BADGES_STATS = [
            { bg: '#e0f2fe', cor: '#0369a1' },
            { bg: '#dcfce7', cor: '#166534' },
            { bg: '#fef3c7', cor: '#92400e' },
            { bg: '#f3e8ff', cor: '#6b21a8' },
            { bg: '#fee2e2', cor: '#991b1b' },
            { bg: '#f1f5f9', cor: '#475569' },
            { bg: '#cffafe', cor: '#0e7490' },
            { bg: '#fce7f3', cor: '#9d174d' }
        ];

        const PALETA_KPI_STATS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b', '#06b6d4', '#db2777'];

        function abreviarLabel(label, maxLen = 12) {
            if (!label) return '';
            if (label.length <= maxLen) return label;
            return label.split(' ').map(p => p.length > 4 ? p.slice(0, 3) + '.' : p).join(' ');
        }

        function renderizarStatsAvancadasJogoTreinador(historicoJogos, mediasStats, camposEstatisticas) {
            const campos = camposEstatisticas || [];

            const tbody = document.getElementById('tbody-historico-jogos-treinador');
            if (tbody) {
                if (!historicoJogos || historicoJogos.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px; font-style:italic;">Ainda não existem jogos registados.</td></tr>';
                } else {
                    tbody.innerHTML = historicoJogos.map(j => {
                        const golosNossa = j.golos_nossa !== null ? j.golos_nossa : '-';
                        const golosAdv = j.golos_adversario !== null ? j.golos_adversario : '-';
                        let corResultado = '#64748b';
                        if (j.golos_nossa > j.golos_adversario) corResultado = '#10b981';
                        else if (j.golos_nossa < j.golos_adversario) corResultado = '#ef4444';

                        const stats = j.stats_extra || {};
                        const badgesStats = campos.map((c, i) => {
                            const valor = stats[`${c.campo}_nossa`];
                            const cores = PALETA_BADGES_STATS[i % PALETA_BADGES_STATS.length];
                            const sufixo = /posse/i.test(c.campo) && valor !== undefined ? '%' : '';
                            const valorTexto = (valor !== undefined && valor !== null) ? `${valor}${sufixo}` : '—';
                            return `<span style="background:${cores.bg}; color:${cores.cor}; padding:2px 6px; border-radius:8px; font-weight:600;" title="${c.label}">${abreviarLabel(c.label, 10)} ${valorTexto}</span>`;
                        }).join('');

                        return `
                        <tr>
                            <td style="font-weight:600; color:#1e293b; white-space:nowrap;">${j.data}</td>
                            <td><span style="background:#f1f5f9; padding:4px 8px; border-radius:6px; font-size:12px;">${j.equipa}</span></td>
                            <td style="color:#475569;">${j.equipa_rival || 'Adversário'}</td>
                            <td style="text-align:center;"><strong style="color:${corResultado}; font-size:15px;">${golosNossa} - ${golosAdv}</strong></td>
                            <td style="text-align:center;">
                                <div style="display:flex; flex-wrap:wrap; gap:4px; justify-content:center; font-size:10px;">
                                    ${badgesStats}
                                </div>
                            </td>
                            <td><a href="/mngr/treinador/treinador_jogo?id=${j.id}" style="background-color:#0ea5e9; color:white; border:none; padding:6px 12px; font-size:12px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-block;">Ver Ficha</a></td>
                        </tr>`;
                    }).join('');
                }
            }

            const contentorKpis = document.getElementById('stats-medias-jogo-treinador');
            const contentorVazio = document.getElementById('stats-medias-jogo-treinador-vazio');
            const contentorGraficos = document.getElementById('stats-jogo-graficos-treinador');

            const jogosComStats = mediasStats ? parseInt(mediasStats.jogos_com_stats || 0) : 0;

            if (!contentorKpis) return; 

            if (jogosComStats === 0 || campos.length === 0) {
                contentorKpis.style.display = 'none';
                if (contentorGraficos) contentorGraficos.style.display = 'none';
                if (contentorVazio) contentorVazio.style.display = 'block';
                return;
            }

            if (contentorVazio) contentorVazio.style.display = 'none';
            contentorKpis.style.display = 'flex';
            if (contentorGraficos) contentorGraficos.style.display = 'flex';

            contentorKpis.innerHTML = campos.map((c, i) => {
                const sufixo = /posse/i.test(c.campo) ? '%' : '';
                const cor = PALETA_KPI_STATS[i % PALETA_KPI_STATS.length];
                return criarMiniKpiStats(c.label, mediasStats[`media_${c.campo}`], cor, PALETA_BADGES_STATS[i % PALETA_BADGES_STATS.length].bg, sufixo);
            }).join('');

            desenharRadarStatsJogo('chartTreinadorStatsRadar', mediasStats, campos);
            desenharBarrasRematesPorJogo('chartTreinadorStatsRemates', historicoJogos, campos);
        }

        // =========================================================================
        // PAINEL DE STATS AVANÇADAS DE JOGO - ATLETA
        // =========================================================================
        function renderizarStatsAvancadasJogoAtleta(mediasStatsAtleta, camposEstatisticas) {
            const contentorKpis = document.getElementById('stats-medias-jogo-atleta');
            const contentorVazio = document.getElementById('stats-medias-jogo-atleta-vazio');
            const contentorGraficos = document.getElementById('stats-jogo-graficos-atleta');

            if (!contentorKpis) return;

            const m = mediasStatsAtleta || {};
            const campos = camposEstatisticas || [];
            const jogosComStats = parseInt(m.jogos_com_stats || 0);

            if (jogosComStats === 0 || campos.length === 0) {
                contentorKpis.style.display = 'none';
                if (contentorGraficos) contentorGraficos.style.display = 'none';
                if (contentorVazio) contentorVazio.style.display = 'block';
                return;
            }

            if (contentorVazio) contentorVazio.style.display = 'none';
            contentorKpis.style.display = 'flex';
            if (contentorGraficos) contentorGraficos.style.display = 'flex';

            const kpisCampos = campos.map((c, i) => {
                const sufixo = /posse/i.test(c.campo) ? '%' : '';
                const cor = PALETA_KPI_STATS[i % PALETA_KPI_STATS.length];
                return criarMiniKpiStats(c.label, m[`media_${c.campo}_equipa`], cor, PALETA_BADGES_STATS[i % PALETA_BADGES_STATS.length].bg, sufixo);
            });
            kpisCampos.push(criarMiniKpiStats('Min. Médios', m.media_minutos, '#6366f1', '#e0e7ff', "'"));
            contentorKpis.innerHTML = kpisCampos.join('');

            const mediasParaRadar = {};
            campos.forEach(c => { mediasParaRadar[`media_${c.campo}`] = m[`media_${c.campo}_equipa`]; });
            desenharRadarStatsJogo('chartAtletaStatsRadar', mediasParaRadar, campos);
        }

        const ABREVIATURAS_LABEL_KPI = {
            'Defesas guarda-redes': 'Defesa GR',
            'Defesas Guarda-Redes': 'Defesa GR'
        };

        function abreviarLabelKpi(label) {
            return ABREVIATURAS_LABEL_KPI[label] || label;
        }

        function criarMiniKpiStats(label, valor, cor, bg, sufixo = '') {
            const valorFormatado = (valor !== null && valor !== undefined && valor !== '') ? `${valor}${sufixo}` : '—';
            const labelExibido = abreviarLabelKpi(label);
            return `
                <div class="stats-mini-kpi" style="background:${bg};">
                    <div class="stats-mini-kpi-label" style="color:${cor};" title="${label}">${labelExibido}</div>
                    <div class="stats-mini-kpi-valor" style="color:${cor};">${valorFormatado}</div>
                </div>`;
        }

        function criarKpiMiniatura(label, valor, cor, bg) {
            return criarMiniKpiStats(label, valor, cor, bg);
        }

        // =========================================================================
        // RADAR: PERFIL MÉDIO DE ESTATÍSTICAS DE JOGO
        // =========================================================================
        function desenharRadarStatsJogo(idCanvas, medias, camposEstatisticas) {
            const ctx = document.getElementById(idCanvas);
            if (!ctx) return;
            destruirGraficoExistente(idCanvas);

            const campos = camposEstatisticas || [];

            const metricasDisponiveis = campos
                .map(c => ({ campo: c.campo, label: c.label, sufixo: /posse/i.test(c.campo) ? '%' : '' }))
                .filter(m => medias[`media_${m.campo}`] !== undefined && medias[`media_${m.campo}`] !== null);

            if (metricasDisponiveis.length === 0) {
                mostrarMensagemVazia(idCanvas, 'Sem estatísticas suficientes para gerar o perfil.');
                return;
            }

            const valoresReais = metricasDisponiveis.map(m => parseFloat(medias[`media_${m.campo}`]) || 0);
            const maiorValorNaoPercentual = Math.max(1, ...metricasDisponiveis
                .map((m, i) => m.sufixo === '%' ? 0 : valoresReais[i]));
            const normalizado = metricasDisponiveis.map((m, i) => {
                const ref = m.sufixo === '%' ? 100 : maiorValorNaoPercentual;
                return Math.min(100, Math.round((valoresReais[i] / ref) * 100));
            });

            new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: metricasDisponiveis.map(m => m.label),
                    datasets: [{
                        label: 'Média por jogo',
                        data: normalizado,
                        valoresReais: valoresReais,
                        sufixos: metricasDisponiveis.map(m => m.sufixo),
                        backgroundColor: 'rgba(14, 165, 233, 0.15)',
                        borderColor: '#0ea5e9',
                        borderWidth: 2,
                        pointBackgroundColor: '#0ea5e9',
                        pointRadius: 4
                    }]
                },
                options: comAnimacaoSuave({
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const ds = context.dataset;
                                    const valorReal = ds.valoresReais[context.dataIndex];
                                    const sufixo = ds.sufixos[context.dataIndex] || '';
                                    return `${context.label}: ${valorReal}${sufixo} por jogo`;
                                }
                            }
                        }
                    },
                    scales: {
                        r: {
                            min: 0, max: 100,
                            ticks: { display: false },
                            grid: { color: '#e2e8f0' },
                            angleLines: { color: '#e2e8f0' },
                            pointLabels: { font: { size: 10 } }
                        }
                    }
                })
            });
        }

        // =========================================================================
        // BARRAS: PRIMEIRAS DUAS MÉTRICAS CONFIGURADAS, JOGO A JOGO
        // =========================================================================
        function desenharBarrasRematesPorJogo(idCanvas, historicoJogos, camposEstatisticas) {
            const ctx = document.getElementById(idCanvas);
            if (!ctx) return;
            destruirGraficoExistente(idCanvas);

            const campos = camposEstatisticas || [];
            if (campos.length === 0) {
                mostrarMensagemVazia(idCanvas, 'Sem estatísticas configuradas para este desporto.');
                return;
            }

            const campoPrincipal = campos[0];
            const campoSecundario = campos.length > 1 ? campos[1] : null;

            const jogosComDados = (historicoJogos || [])
                .filter(j => j.stats_extra && (j.stats_extra[`${campoPrincipal.campo}_nossa`] !== undefined))
                .slice()
                .reverse();

            if (jogosComDados.length === 0) {
                mostrarMensagemVazia(idCanvas, 'Sem dados registados nos últimos jogos.');
                return;
            }
            ctx.style.display = 'block';
            const msg = document.getElementById(`empty-msg-${idCanvas}`);
            if (msg) msg.remove();

            const labels = jogosComDados.map(j => `vs ${j.equipa_rival || '?'}`);
            const principal = jogosComDados.map(j => parseFloat(j.stats_extra[`${campoPrincipal.campo}_nossa`]) || 0);

            const datasets = [
                { label: campoPrincipal.label, data: principal, backgroundColor: '#bae6fd', borderRadius: 4, borderColor: '#0ea5e9', borderWidth: 1 }
            ];
            if (campoSecundario) {
                const secundario = jogosComDados.map(j => parseFloat(j.stats_extra[`${campoSecundario.campo}_nossa`]) || 0);
                datasets.push({ label: campoSecundario.label, data: secundario, backgroundColor: '#0ea5e9', borderRadius: 4 });
            }

            new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets },
                options: comAnimacaoSuave({
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
                        x: { ticks: { font: { size: 10 }, autoSkip: true, maxTicksLimit: 8 } }
                    }
                })
            });
        }

        // =========================================================================
        // PROCESSAR ATLETA
        // =========================================================================
        function processarAtleta(dados) {
            document.getElementById('a-kpi-golos').innerText = dados.kpis.meus_golos || 0;
            document.getElementById('a-kpi-assists').innerText = dados.kpis.minhas_assists || 0;
            document.getElementById('a-kpi-minutos').innerText = (dados.kpis.meus_minutos || 0) + " min";
            document.getElementById('a-kpi-jogos').innerText = dados.kpis.meus_jogos || 0;

            processarResultadosGerais(dados.historicoResultados, 'a-total-resultados-card', 'chartAtletaResultados', []);

            const tbody = document.getElementById('tbody-historico-jogos-atleta');
            if (tbody) {
                if (!dados.historicoJogos || dados.historicoJogos.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:20px; font-style:italic;">Ainda não tens jogos registados.</td></tr>';
                } else {
                    tbody.innerHTML = dados.historicoJogos.map(j => {
                        const golosNossa = j.golos_nossa !== null ? j.golos_nossa : '-';
                        const golosAdv = j.golos_adversario !== null ? j.golos_adversario : '-';
                        let corResultado = '#64748b';
                        if (j.golos_nossa > j.golos_adversario) corResultado = '#10b981';
                        else if (j.golos_nossa < j.golos_adversario) corResultado = '#ef4444';

                        return `
                        <tr>
                            <td style="font-weight:600; color:#1e293b;">${j.data_extensa}</td>
                            <td style="color:#475569;">${j.equipa_rival || 'Adversário Desconhecido'}</td>
                            <td style="text-align:center;"><strong style="color:${corResultado}; font-size:16px;">${golosNossa} - ${golosAdv}</strong></td>
                            <td style="text-align:center;"><a href="/mngr/treinador/treinador_jogo?id=${j.id}" style="background-color:#0ea5e9; color:white; border:none; padding:6px 12px; font-size:12px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-block;">Ver Resumo</a></td>
                        </tr>`;
                    }).join('');
                }
            }

            renderizarStatsAvancadasJogoAtleta(dados.mediasStatsAtleta, dados.camposEstatisticasJogo);

            const configEvolucaoMin = construirDatasetsDinamicos(dados.evolucaoMinutos, 'golos');
            desenharGraficoLinhasMultiplas('chartAtletaMinutos', configEvolucaoMin);

            renderizarRankingComPodio('ranking-marcadores-atleta', dados.rankingGolos);
            renderizarRankingComPodio('ranking-assistentes-atleta', dados.rankingAssists);

            const tr = dados.treinos;
            if (tr && tr.kpis) {
                const kpi = tr.kpis;
                const realiz = parseInt(kpi.treinos_realizados || 0);
                const faltas = parseInt(kpi.treinos_faltou || 0);
                const atrasos = parseInt(kpi.treinos_atraso || 0);
                const taxa = parseFloat(kpi.taxa_presenca || 0);

                const elReal = document.getElementById('a-treinos-realizados');
                const elFaltas = document.getElementById('a-treinos-faltas');
                const elAtrasos = document.getElementById('a-treinos-atrasos');
                const elTaxa = document.getElementById('a-taxa-presenca');

                if (elReal) elReal.innerText = realiz;
                if (elFaltas) elFaltas.innerText = faltas;
                if (elAtrasos) elAtrasos.innerText = atrasos;
                if (elTaxa) elTaxa.innerText = taxa.toFixed(1) + '%';

                if (realiz + faltas + atrasos > 0) {
                    destruirGraficoExistente('chartAtletaAssiduidade');
                    const ctxDg = document.getElementById('chartAtletaAssiduidade');
                    if (ctxDg) {
                        new Chart(ctxDg, {
                            type: 'doughnut',
                            data: {
                                labels: ['Presentes', 'Faltas', 'Atrasos'],
                                datasets: [{ data: [realiz, faltas, atrasos], backgroundColor: ['#10b981', '#ef4444', '#f59e0b'], borderWidth: 2 }]
                            },
                            options: comAnimacaoSuave({
                                responsive: true, maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                cutout: '60%'
                            })
                        });
                    }
                } else {
                    mostrarMensagemVazia('chartAtletaAssiduidade', 'Sem dados de assiduidade.');
                }
            }

            if (tr && tr.evolucaoFadiga && tr.evolucaoFadiga.length > 0) {
                desenharGraficoAtletaFadiga(tr.evolucaoFadiga);
            } else {
                mostrarMensagemVazia('chartAtletaIntensidade', 'Sem feedback de treino registado.');
            }

            if (tr && tr.historico) {
                renderizarHistoricoTreinosAtleta('tbody-historico-treinos-atleta', tr.historico);
            }

            renderizarExamesAtleta(dados.exames || []);
        }

        // =========================================================================
        // PROCESSAR GESTOR
        // =========================================================================
        function processarGestor(dados) {
            document.getElementById('g-kpi-equipas').innerText = dados.kpis.equipas;
            document.getElementById('g-kpi-atletas').innerText = dados.kpis.atletas;
            document.getElementById('g-kpi-treinadores').innerText = dados.kpis.treinadores;

            processarResultadosGerais(dados.historicoResultados, 'g-total-resultados-card', 'chartGestorResultados', []);

            const amarelos = parseInt((dados.disciplinaClube && dados.disciplinaClube.amarelos) ? dados.disciplinaClube.amarelos : 0);
            const vermelhos = parseInt((dados.disciplinaClube && dados.disciplinaClube.vermelhos) ? dados.disciplinaClube.vermelhos : 0);
            document.getElementById('g-total-cartoes-card').innerText = amarelos + vermelhos;
            desenharGraficoDoughnut('chartGestorDisciplina', ['Amarelos', 'Vermelhos'], [amarelos, vermelhos], ['#f59e0b', '#dc2626']);

            renderizarRankingComPodio('ranking-eficacia-clube', dados.rankingEquipas, '%');
            renderizarTabelaHistorico('tbody-historico-jogos-gestor', dados.historicoJogos);
        }

        // =========================================================================
        // DESENHAR GRÁFICO COMBINADO PRESENÇA + RPE (TREINADOR)
        // =========================================================================
        function desenharGraficoPresencaRpe(evolucaoPresenca, feedbackSeries) {
            const ctx = document.getElementById('chartTreinadorIntensidade');
            if (!ctx) return;

            if (!evolucaoPresenca || evolucaoPresenca.length === 0) {
                mostrarMensagemVazia('chartTreinadorIntensidade', 'Sem dados de evolução registados.');
                return;
            }

            ctx.style.display = 'block';
            const msgExist = document.getElementById('empty-msg-chartTreinadorIntensidade');
            if (msgExist) msgExist.remove();
            destruirGraficoExistente('chartTreinadorIntensidade');

            const labels = evolucaoPresenca.map(p => p.label);
            const presencaData = evolucaoPresenca.map(p => parseFloat(p.taxa_presenca || 0));

            const rpeMap = {};
            (feedbackSeries || []).forEach(f => { rpeMap[f.label] = parseFloat(f.rpe_medio || 0); });
            const rpeData = labels.map(l => rpeMap[l] !== undefined ? rpeMap[l] : null);

            const datasets = [
                { serieKey: 'presenca', label: '% Presença', data: presencaData, borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)', fill: true, tension: 0.3, borderWidth: 2.5, pointRadius: 4, yAxisID: 'y' },
                { serieKey: 'rpe', label: 'RPE Médio', data: rpeData, borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: false, tension: 0.3, borderWidth: 2.5, pointRadius: 4, yAxisID: 'y2', spanGaps: true, borderDash: [5, 3] }
            ];

            chartTreinadorIntensidadeRef = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets },
                options: comAnimacaoSuave({
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
                    scales: {
                        y: { type: 'linear', position: 'left', min: 0, max: 100, title: { display: true, text: '% Presença', font: { size: 10 } }, ticks: { font: { size: 10 } } },
                        y2: { type: 'linear', position: 'right', min: 0, max: 10, grid: { drawOnChartArea: false }, title: { display: true, text: 'RPE (1-10)', font: { size: 10 } }, ticks: { font: { size: 10 } } }
                    }
                })
            });
        }

        // =========================================================================
        // GRÁFICO FEEDBACK (RPE / FADIGA / SONO) - TREINADOR
        // =========================================================================
        function desenharGraficoFeedbackTreinos(feedbackSeries) {
            const ctx = document.getElementById('chartFeedbackTreinos');
            if (!ctx) return;

            ctx.style.display = 'block';
            destruirGraficoExistente('chartFeedbackTreinos');

            const labels = feedbackSeries.map(f => f.label);
            const datasets = [
                { serieKey: 'rpe', label: 'RPE Médio', data: feedbackSeries.map(f => parseFloat(f.rpe_medio || 0)), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: false, tension: 0.3, borderWidth: 2.5, pointRadius: 4 },
                { serieKey: 'fadiga', label: 'Fadiga Média', data: feedbackSeries.map(f => parseFloat(f.fadiga_media || 0)), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', fill: false, tension: 0.3, borderWidth: 2.5, pointRadius: 4 },
                { serieKey: 'sono', label: 'Sono Médio', data: feedbackSeries.map(f => parseFloat(f.sono_medio || 0)), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.08)', fill: false, tension: 0.3, borderWidth: 2.5, pointRadius: 4 }
            ];

            chartFeedbackTreinosRef = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets },
                options: comAnimacaoSuave({
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { afterLabel: function(ctx) { const f = feedbackSeries[ctx.dataIndex]; return f ? `Respostas: ${f.respostas || 0}` : ''; } } } },
                    scales: {
                        y: { min: 0, max: 10, ticks: { stepSize: 1, font: { size: 10 } }, title: { display: true, text: 'Escala 1-10', font: { size: 10 } } },
                        x: { ticks: { autoSkip: true, maxTicksLimit: 12, font: { size: 10 } } }
                    }
                })
            });
        }

        // =========================================================================
        // GRÁFICO RPE/FADIGA/SONO - ATLETA
        // =========================================================================
        function desenharGraficoAtletaFadiga(evolucaoFadiga) {
            const ctx = document.getElementById('chartAtletaIntensidade');
            if (!ctx) return;

            ctx.style.display = 'block';
            destruirGraficoExistente('chartAtletaIntensidade');

            const labels = evolucaoFadiga.map(f => f.label);
            const datasets = [
                { serieKey: 'rpe', label: 'RPE (Esforço)', data: evolucaoFadiga.map(f => parseFloat(f.rpe || 0)), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: false, tension: 0.3, borderWidth: 2.5, pointRadius: 5 },
                { serieKey: 'fadiga', label: 'Fadiga', data: evolucaoFadiga.map(f => parseFloat(f.fadiga || 0)), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: false, tension: 0.3, borderWidth: 2.5, pointRadius: 5 },
                { serieKey: 'sono', label: 'Qualidade de Sono', data: evolucaoFadiga.map(f => parseFloat(f.sono || 0)), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: false, tension: 0.3, borderWidth: 2.5, pointRadius: 5 }
            ];

            chartAtletaIntensidadeRef = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets },
                options: comAnimacaoSuave({
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
                    scales: {
                        y: { min: 0, max: 10, ticks: { stepSize: 1, font: { size: 10 } }, title: { display: true, text: 'Escala 1-10', font: { size: 10 } } },
                        x: { ticks: { autoSkip: true, maxTicksLimit: 12, font: { size: 10 } } }
                    }
                })
            });
        }

        // =========================================================================
        // HISTÓRICO DE TREINOS - TREINADOR
        // =========================================================================
        function renderizarHistoricoTreinos(idTbody, historico) {
            const tbody = document.getElementById(idTbody);
            if (!tbody) return;

            if (!historico || historico.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:20px; font-style:italic;">Sem histórico de treinos.</td></tr>';
                return;
            }

            tbody.innerHTML = historico.map(t => {
                const total = parseInt(t.total_atletas) || 0;
                const presentes = parseInt(t.presentes) || 0;
                const faltas = parseInt(t.faltas) || 0;
                const atrasos = parseInt(t.atrasos) || 0;
                const taxa = total > 0 ? Math.round((presentes / total) * 100) : 0;
                const corTaxa = taxa >= 80 ? '#10b981' : taxa >= 60 ? '#f59e0b' : '#ef4444';
                const rpe = t.rpe_medio ? parseFloat(t.rpe_medio).toFixed(1) : '—';
                const fadiga = t.fadiga_media ? parseFloat(t.fadiga_media).toFixed(1) : '—';
                const tagTipo = (t.tipo_evento || '').replace('_', ' ').toUpperCase();
                const totalFeedback = parseInt(t.total_feedback) || 0;
                const feedbackBadge = totalFeedback > 0
                    ? `<span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:bold;">${totalFeedback}</span>`
                    : `<span style="background:#f1f5f9; color:#94a3b8; padding:2px 8px; border-radius:10px; font-size:10px;">—</span>`;

                return `
                <tr style="transition:background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background=''">
                    <td style="font-weight:600; color:#1e293b; white-space:nowrap;">${t.data}</td>
                    <td>
                        <span style="font-size:10px; background:#e0f2fe; color:#0ea5e9; padding:2px 6px; border-radius:10px; font-weight:bold; margin-right:5px;">${tagTipo}</span>
                        ${t.titulo || 'Treino'}
                    </td>
                    <td style="text-align:center;"><strong style="color:${corTaxa};">${presentes}</strong><span style="color:#94a3b8; font-size:10px;">/${total}</span></td>
                    <td style="text-align:center; color:#ef4444; font-weight:bold;">${faltas}</td>
                    <td style="text-align:center; color:#f59e0b; font-weight:bold;">${atrasos}</td>
                    <td style="text-align:center;"><span style="background:#fef3c7; padding:2px 8px; border-radius:10px; font-weight:bold; font-size:12px; color:#92400e;">${rpe}</span></td>
                    <td style="text-align:center;"><span style="background:#fce7f3; padding:2px 8px; border-radius:10px; font-weight:bold; font-size:12px; color:#9d174d;">${fadiga}</span></td>
                    <td style="text-align:center;">${feedbackBadge}</td>
                    <td class="stats-table-acoes">
                        <div class="stats-table-acoes-wrap">
                            <button onclick="window.irParaTreino(${t.id}, '${(t.titulo || 'Treino').replace(/'/g, "\\'")}', '${t.data_display || t.data}')" 
                                title="Ver Presenças"
                                style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:4px 8px; font-size:11px; border-radius:6px; font-weight:bold; cursor:pointer;">
                                Presenças
                            </button>
                            <button onclick="window.irParaFeedbackTreino(${t.id}, '${(t.titulo || 'Treino').replace(/'/g, "\\'")}', '${t.data_display || t.data}')" 
                                title="Ver Feedback dos Atletas"
                                style="background:#0ea5e9; color:white; border:none; padding:4px 8px; font-size:11px; border-radius:6px; font-weight:bold; cursor:pointer;">
                                Feedback
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }

        // =========================================================================
        // EXAMES FÍSICOS
        // =========================================================================
        function formatarChaveExame(chave) {
            return chave
                .replace(/_/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
        }

        function resumoDadosExame(dados) {
            if (!dados || typeof dados !== 'object' || Object.keys(dados).length === 0) {
                return '<span style="color:#94a3b8; font-style:italic;">Sem métricas</span>';
            }
            return Object.entries(dados)
                .map(([chave, valor]) => `<span style="white-space:nowrap;"><strong style="color:#334155;">${formatarChaveExame(chave)}:</strong> ${valor}</span>`)
                .join('<span style="color:#cbd5e1;"> · </span>');
        }

        function badgeTipoExame(tipoExame) {
            const ehMedico = /m[eé]dic|ecg|sangu|fisio|podol/i.test(tipoExame || '');
            const cor = ehMedico ? { bg: '#fee2e2', fg: '#b91c1c' } : { bg: '#e0f2fe', fg: '#0ea5e9' };
            return `<span style="font-size:10px; background:${cor.bg}; color:${cor.fg}; padding:3px 8px; border-radius:10px; font-weight:bold; white-space:nowrap;">${tipoExame || 'Exame'}</span>`;
        }

        let examesTreinadorTodos = [];
        function aplicarFiltrosExamesTreinador() {
            const filtroAtleta = document.getElementById('filtro-exames-atleta');
            const filtroTipo = document.getElementById('filtro-exames-tipo');
            const valorAtleta = filtroAtleta ? filtroAtleta.value : '';
            const valorTipo = filtroTipo ? filtroTipo.value : '';

            const filtrados = examesTreinadorTodos.filter(e => {
                const passaAtleta = !valorAtleta || e.nome_atleta === valorAtleta;
                const passaTipo = !valorTipo || e.tipo_exame === valorTipo;
                return passaAtleta && passaTipo;
            });
            desenharTabelaExamesTreinador(filtrados);
        }

        function renderizarExamesTreinador(exames) {
            examesTreinadorTodos = exames || [];

            const totalExames = examesTreinadorTodos.length;
            const atletasUnicos = new Set(examesTreinadorTodos.map(e => e.nome_atleta)).size;
            const elTotal = document.getElementById('te-total-exames');
            const elAtletas = document.getElementById('te-total-atletas');
            const elUltimo = document.getElementById('te-ultimo-exame');
            if (elTotal) elTotal.innerText = totalExames;
            if (elAtletas) elAtletas.innerText = atletasUnicos;
            if (elUltimo) elUltimo.innerText = totalExames > 0 ? examesTreinadorTodos[0].data : '—';

            const filtro = document.getElementById('filtro-exames-atleta');
            if (filtro) {
                const valorAtual = filtro.value;
                const nomesAtletas = [...new Set(examesTreinadorTodos.map(e => e.nome_atleta).filter(Boolean))].sort();
                filtro.innerHTML = '<option value="">Todos os atletas</option>' +
                    nomesAtletas.map(nome => `<option value="${nome}">${nome}</option>`).join('');
                if (nomesAtletas.includes(valorAtual)) filtro.value = valorAtual;
                filtro.onchange = aplicarFiltrosExamesTreinador;
            }

            const filtroTipo = document.getElementById('filtro-exames-tipo');
            if (filtroTipo) {
                const valorAtual = filtroTipo.value;
                const tiposExame = [...new Set(examesTreinadorTodos.map(e => e.tipo_exame).filter(Boolean))].sort();
                filtroTipo.innerHTML = '<option value="">Todos os tipos de exame</option>' +
                    tiposExame.map(tipo => `<option value="${tipo}">${tipo}</option>`).join('');
                if (tiposExame.includes(valorAtual)) filtroTipo.value = valorAtual;
                filtroTipo.onchange = aplicarFiltrosExamesTreinador;
            }

            aplicarFiltrosExamesTreinador();
        }

        function desenharTabelaExamesTreinador(exames) {
            const tbody = document.getElementById('tbody-historico-exames-treinador');
            if (!tbody) return;

            if (!exames || exames.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:20px; font-style:italic;">Ainda não há exames físicos registados.</td></tr>';
                return;
            }

            // CORREÇÃO: Aplicado display:flex no <td> e alinhamento centrado
            tbody.innerHTML = exames.map(ex => `
                <tr>
                    <td style="text-align:left; font-weight:600; color:#1e293b; white-space:nowrap;">${ex.data}</td>
                    <td style="text-align:left; color:#334155; font-weight:600;">${ex.nome_atleta || '—'}</td>
                    <td style="text-align:left; color:#64748b;">${ex.equipa || '—'}</td>
                    <td style="text-align:left;">${badgeTipoExame(ex.tipo_exame)}</td>
                    <td style="text-align:left; font-size:12px;">${resumoDadosExame(ex.dados)}</td>
                    <td style="text-align:left; color:#64748b; font-size:12px;">${ex.observacoes ? ex.observacoes : '<span style="color:#cbd5e1; font-style:italic;">—</span>'}</td>
                    <td style="text-align:center; white-space:nowrap; vertical-align:middle;">
                        <div style="display:flex; justify-content:center; align-items:center; gap:8px;">
                            <button class="btn-exame-editar" data-id="${ex.id}" title="Editar exame" style="display:inline-flex; align-items:center; justify-content:center; gap:6px; border:1px solid #bae6fd; background:#e0f2fe; color:#0369a1; padding:7px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; transition:background 0.15s;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'">
                                <i class="fas fa-pen"></i> Editar
                            </button>
                            <button class="btn-exame-eliminar" data-id="${ex.id}" title="Eliminar exame" style="display:inline-flex; align-items:center; justify-content:center; gap:6px; border:1px solid #fecaca; background:#fee2e2; color:#b91c1c; padding:7px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; transition:background 0.15s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </td>
                </tr>`).join('');

            tbody.querySelectorAll('.btn-exame-editar').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idExame = btn.getAttribute('data-id');
                    const destino = `/mngr/treinador/exames_fisicos?exame_id=${idExame}`;
                    window.history.pushState({}, '', destino);
                    if (typeof window.carregarPedacoPagina === 'function' && window.appConteudoCentral) {
                        window.carregarPedacoPagina(destino, window.appConteudoCentral);
                    } else {
                        window.location.href = destino;
                    }
                });
            });

            tbody.querySelectorAll('.btn-exame-eliminar').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const idExame = btn.getAttribute('data-id');
                    const confirmado = await window.mostrarConfirmacao('Tem a certeza que pretende eliminar este exame físico? Esta ação não pode ser desfeita.');
                    if (!confirmado) return;

                    try {
                        const resposta = await fetch(`/mngr/api/treinador/exames_fisicos/${idExame}`, {
                            method: 'DELETE',
                            headers: { 'X-Solicitado-Por': 'SPA' }
                        });
                        const resultado = await resposta.json();

                        if (resposta.ok && resultado.success) {
                            examesTreinadorTodos = examesTreinadorTodos.filter(e => String(e.id) !== String(idExame));
                            renderizarExamesTreinador(examesTreinadorTodos);
                            if (typeof window.mostrarAlerta === 'function') {
                                window.mostrarAlerta(resultado.message || 'Exame eliminado com sucesso!', 'sucesso');
                            }
                        } else {
                            if (typeof window.mostrarAlerta === 'function') {
                                window.mostrarAlerta(resultado.error || 'Não foi possível eliminar o exame.');
                            }
                        }
                    } catch (err) {
                        console.error("Erro ao eliminar exame físico:", err);
                        if (typeof window.mostrarAlerta === 'function') {
                            window.mostrarAlerta('Ocorreu um erro na ligação com o servidor.');
                        }
                    }
                });
            });
        }

        function renderizarExamesAtleta(exames) {
            const lista = exames || [];

            const elTotal = document.getElementById('ae-total-exames');
            const elUltimo = document.getElementById('ae-ultimo-exame');
            const elTipo = document.getElementById('ae-ultimo-tipo');
            if (elTotal) elTotal.innerText = lista.length;
            if (elUltimo) elUltimo.innerText = lista.length > 0 ? lista[0].data : '—';
            if (elTipo) elTipo.innerText = lista.length > 0 ? lista[0].tipo_exame : '—';

            const tbody = document.getElementById('tbody-historico-exames-atleta');
            if (!tbody) return;

            if (lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:20px; font-style:italic;">Ainda não tens exames físicos registados.</td></tr>';
                return;
            }

            tbody.innerHTML = lista.map(ex => `
                <tr>
                    <td style="text-align:left; font-weight:600; color:#1e293b; white-space:nowrap;">${ex.data}</td>
                    <td style="text-align:left;">${badgeTipoExame(ex.tipo_exame)}</td>
                    <td style="text-align:left; font-size:12px;">${resumoDadosExame(ex.dados)}</td>
                    <td style="text-align:left; color:#64748b; font-size:12px;">${ex.observacoes ? ex.observacoes : '<span style="color:#cbd5e1; font-style:italic;">—</span>'}</td>
                </tr>`).join('');
        }

        // =========================================================================
        // NAVEGAR PARA O TREINO
        // =========================================================================
        function navegarParaTreinoEAbrir(fnVerifica, fnAbre) {
            const treinosDomPresente = () => !!document.getElementById('ecra-lista-treinos');

            if (fnVerifica() && treinosDomPresente()) { fnAbre(); return; }

            const url = '/mngr/treinador/treinos';
            if (typeof window.carregarPedacoPagina === 'function' && window.appConteudoCentral) {
                window.history.pushState({}, '', url);
                window.carregarPedacoPagina(url, window.appConteudoCentral);

                let tentativas = 0;
                const maxTentativas = 20; 
                const intervalo = setInterval(() => {
                    tentativas++;
                    if (fnVerifica() && treinosDomPresente()) {
                        clearInterval(intervalo);
                        fnAbre();
                    } else if (tentativas >= maxTentativas) {
                        clearInterval(intervalo); 
                    }
                }, 100);
            } else {
                window.location.href = url;
            }
        }

        window.irParaTreino = function(idTreino, titulo, data) {
            navegarParaTreinoEAbrir(
                () => typeof window.abrirTreinoNasPresencas === 'function',
                () => window.abrirTreinoNasPresencas(idTreino, titulo || 'Treino', data || '')
            );
        };

        window.irParaFeedbackTreino = function(idTreino, titulo, data) {
            navegarParaTreinoEAbrir(
                () => typeof window.abrirTreinoNoFeedback === 'function',
                () => window.abrirTreinoNoFeedback(idTreino, titulo || 'Treino', data || '')
            );
        };

        // =========================================================================
        // HISTÓRICO DE TREINOS - ATLETA
        // =========================================================================
        function renderizarHistoricoTreinosAtleta(idTbody, historico) {
            const tbody = document.getElementById(idTbody);
            if (!tbody) return;

            if (!historico || historico.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:20px; font-style:italic;">Ainda não tens histórico de treinos.</td></tr>';
                return;
            }

            const estadoBadge = {
                'presente': '<span style="background:#dcfce7; color:#16a34a; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:bold;">✅ Presente</span>',
                'falta': '<span style="background:#fee2e2; color:#dc2626; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:bold;">❌ Falta</span>',
                'atraso': '<span style="background:#fef3c7; color:#92400e; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:bold;">⏰ Atraso</span>'
            };

            tbody.innerHTML = historico.map(t => {
                const estado = (t.estado || '').toLowerCase();
                const badge = estadoBadge[estado] || `<span style="color:#94a3b8; font-style:italic;">${t.estado || '—'}</span>`;
                const rpe = t.rpe !== null && t.rpe !== undefined ? `<span style="background:#fef3c7; padding:2px 8px; border-radius:10px; font-weight:bold; color:#92400e;">${t.rpe}</span>` : '<span style="color:#cbd5e1;">—</span>';
                const fadiga = t.fadiga !== null && t.fadiga !== undefined ? `<span style="background:#fce7f3; padding:2px 8px; border-radius:10px; font-weight:bold; color:#9d174d;">${t.fadiga}</span>` : '<span style="color:#cbd5e1;">—</span>';
                const sono = t.sono !== null && t.sono !== undefined ? `<span style="background:#ede9fe; padding:2px 8px; border-radius:10px; font-weight:bold; color:#6d28d9;">${t.sono}</span>` : '<span style="color:#cbd5e1;">—</span>';
                return `
                <tr>
                    <td style="font-weight:600; color:#1e293b; white-space:nowrap;">${t.data}</td>
                    <td style="font-weight:500; color:#334155;">${t.titulo || 'Treino'}</td>
                    <td style="text-align:center;">${badge}</td>
                    <td style="text-align:center;">${rpe}</td>
                    <td style="text-align:center;">${fadiga}</td>
                    <td style="text-align:center;">${sono}</td>
                    <td style="color:#475569; font-size:12px; font-style:italic;">${t.feedback_obs || t.notas || '—'}</td>
                </tr>`;
            }).join('');
        }

        // =========================================================================
        // RANKING DE FALTAS
        // =========================================================================
        function renderizarRankingFaltas(idContainer, rankingFaltas) {
            const container = document.getElementById(idContainer);
            if (!container) return;

            if (!rankingFaltas || rankingFaltas.length === 0) {
                container.innerHTML = `<p style="text-align:center; color:#10b981; font-style:italic; padding:30px 0; font-size:13px;">Sem faltas registadas!</p>`;
                return;
            }

            let html = '<div class="ranking-list">';
            rankingFaltas.forEach((atleta, i) => {
                const taxa = atleta.total_treinos > 0 ? Math.round((atleta.faltas / atleta.total_treinos) * 100) : 0;
                html += `
                <div class="ranking-list-item">
                    <div class="ranking-list-pos" style="color:#ef4444;">${i + 1}º</div>
                    <div class="ranking-list-info">
                        <span class="ranking-list-name">${atleta.nome}</span>
                        <span class="ranking-list-team">${atleta.equipa || '—'}</span>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:800; color:#ef4444; font-size:13px;">${atleta.faltas} faltas</div>
                        <div style="font-size:10px; color:#94a3b8;">${taxa}% ausência</div>
                    </div>
                </div>`;
            });
            html += '</div>';
            container.innerHTML = html;
        }

        // =========================================================================
        // HELPERS DE CONSTRUÇÃO DE DATASETS
        // =========================================================================
        function construirDatasetsDinamicos(arrayDados, chaveDado) {
            if (!arrayDados || arrayDados.length === 0) return { labels: [], datasets: [] };
            const datasUnicas = [...new Set(arrayDados.map(d => d.data))];
            const equipasUnicas = [...new Set(arrayDados.map(d => d.equipa))];
            const datasets = equipasUnicas.map((nomeEquipa, index) => {
                const cor = coresPaleta[index % coresPaleta.length];
                const dadosPontos = datasUnicas.map(dataLabel => {
                    const match = arrayDados.find(d => d.data === dataLabel && d.equipa === nomeEquipa);
                    if (match && match[chaveDado] !== null && match[chaveDado] !== undefined) {
                        return { x: dataLabel, y: parseFloat(match[chaveDado]), data_real: match.data_real };
                    }
                    return null;
                });
                return { label: nomeEquipa, data: dadosPontos, borderColor: cor, backgroundColor: cor, tension: 0.3, fill: false, borderWidth: 3, pointRadius: 5, pointBackgroundColor: cor, pointHoverRadius: 7, spanGaps: true, serieKey: nomeEquipa };
            });
            return { labels: datasUnicas, datasets };
        }

        // =========================================================================
        // TABELA HISTÓRICO JOGOS
        // =========================================================================
        function renderizarTabelaHistorico(idTbody, dadosJogos) {
            const tbody = document.getElementById(idTbody);
            if (!tbody) return;
            if (!dadosJogos || dadosJogos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px; font-style:italic;">Ainda não existem jogos registados.</td></tr>';
                return;
            }
            tbody.innerHTML = dadosJogos.map(j => {
                const golosNossa = j.golos_nossa !== null ? j.golos_nossa : '-';
                const golosAdv = j.golos_adversario !== null ? j.golos_adversario : '-';
                let corResultado = '#64748b';
                if (j.golos_nossa > j.golos_adversario) corResultado = '#10b981';
                else if (j.golos_nossa < j.golos_adversario) corResultado = '#ef4444';
                return `
                <tr>
                    <td style="font-weight:600; color:#1e293b;">${j.data}</td>
                    <td><span style="background:#f1f5f9; padding:4px 8px; border-radius:6px; font-size:12px;">${j.equipa}</span></td>
                    <td style="color:#475569;">${j.equipa_rival || 'Adversário Desconhecido'}</td>
                    <td><strong style="color:${corResultado}; font-size:16px;">${golosNossa} - ${golosAdv}</strong></td>
                    <td><a href="/mngr/treinador/treinador_jogo?id=${j.id}" style="background-color:#0ea5e9; color:white; border:none; padding:6px 12px; font-size:12px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-block;">Ver Ficha</a></td>
                </tr>`;
            }).join('');
        }

        // =========================================================================
        // RESULTADOS GERAIS
        // =========================================================================
        function processarResultadosGerais(resData, idTotalCard, idCanvas, idsLabels = []) {
            const v = parseInt(resData ? resData.vitorias : 0) || 0;
            const e = parseInt(resData ? resData.empates : 0) || 0;
            const d = parseInt(resData ? resData.derrotas : 0) || 0;
            const total = v + e + d;
            if (document.getElementById(idTotalCard)) document.getElementById(idTotalCard).innerText = total;
            if (idsLabels.length === 3) {
                document.getElementById(idsLabels[0]).innerText = v;
                document.getElementById(idsLabels[1]).innerText = e;
                document.getElementById(idsLabels[2]).innerText = d;
            }
            const ctx = document.getElementById(idCanvas);
            if (!ctx) return;
            if (total === 0) { mostrarMensagemVazia(idCanvas, 'Sem dados para gerar gráfico.'); return; }
            else { ctx.style.display = 'block'; const msg = document.getElementById(`empty-msg-${idCanvas}`); if (msg) msg.remove(); }
            desenharGraficoDoughnut(idCanvas, ['Vitórias', 'Empates', 'Derrotas'], [v, e, d], ['#10b981', '#94a3b8', '#ef4444']);
        }

        // =========================================================================
        // FUNÇÕES DE DESENHO DE GRÁFICOS
        // =========================================================================
        function desenharGraficoDoughnut(idCanvas, labels, data, colors) {
            const ctx = document.getElementById(idCanvas);
            if (!ctx) return;
            destruirGraficoExistente(idCanvas);
            new Chart(ctx, {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 1 }] },
                options: comAnimacaoSuave({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' })
            });
        }

        function desenharGraficoLinhasMultiplas(idCanvas, configFormatada) {
            const ctx = document.getElementById(idCanvas);
            if (!ctx) return;
            let temPontos = false;
            if (configFormatada && configFormatada.datasets) {
                for (let ds of configFormatada.datasets) {
                    if (ds.data.some(val => val !== null && val !== undefined)) { temPontos = true; break; }
                }
            }
            if (!temPontos) { mostrarMensagemVazia(idCanvas, 'Sem dados de evolução registados.'); return; }
            else { ctx.style.display = 'block'; const msg = document.getElementById(`empty-msg-${idCanvas}`); if (msg) msg.remove(); }
            destruirGraficoExistente(idCanvas);
            new Chart(ctx, {
                type: 'line',
                data: configFormatada,
                options: comAnimacaoSuave({
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) label += ': '; if (context.parsed.y !== null) label += context.parsed.y; if (context.raw && context.raw.data_real) label += ` (${context.raw.data_real})`; return label; } } } },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { autoSkip: false } } }
                })
            });
        }

        // =========================================================================
        // RANKING COM PÓDIO
        // =========================================================================
        function renderizarRankingComPodio(idContainer, dadosArray, sufixo = '') {
            const container = document.getElementById(idContainer);
            if (!container) return;
            if (!dadosArray || dadosArray.length === 0) {
                container.innerHTML = `<p style="text-align:center; color:#94a3b8; font-style:italic; padding:30px 0; font-size:13px;">Sem dados suficientes para ranking.</p>`;
                return;
            }
            let html = '<div class="ranking-wrapper">';
            const top3 = dadosArray.slice(0, 3);
            if (top3.length > 0) {
                const pos1 = top3[0]; const pos2 = top3.length > 1 ? top3[1] : null; const pos3 = top3.length > 2 ? top3[2] : null;
                html += `<div class="podium-container">`;
                if (pos2) html += `<div class="podium-item rank-2"><div class="podium-medal">2</div><div class="podium-name">${pos2.nome || pos2.equipa}</div>${pos2.nome ? `<div class="podium-team">${pos2.equipa || '-'}</div>` : ''}<div class="podium-score">${pos2.total} ${sufixo}</div></div>`;
                if (pos1) html += `<div class="podium-item rank-1"><div class="podium-medal">1</div><div class="podium-name">${pos1.nome || pos1.equipa}</div>${pos1.nome ? `<div class="podium-team">${pos1.equipa || '-'}</div>` : ''}<div class="podium-score">${pos1.total} ${sufixo}</div></div>`;
                if (pos3) html += `<div class="podium-item rank-3"><div class="podium-medal">3</div><div class="podium-name">${pos3.nome || pos3.equipa}</div>${pos3.nome ? `<div class="podium-team">${pos3.equipa || '-'}</div>` : ''}<div class="podium-score">${pos3.total} ${sufixo}</div></div>`;
                html += `</div>`;
            }
            if (dadosArray.length > 3) {
                html += `<div class="ranking-list">`;
                for (let i = 3; i < dadosArray.length; i++) {
                    const item = dadosArray[i];
                    html += `<div class="ranking-list-item"><div class="ranking-list-pos">${i + 1}º</div><div class="ranking-list-info"><span class="ranking-list-name">${item.nome || item.equipa}</span>${item.nome ? `<span class="ranking-list-team">${item.equipa || '-'}</span>` : ''}</div><div class="ranking-list-score">${item.total} ${sufixo}</div></div>`;
                }
                html += `</div>`;
            }
            html += '</div>';
            container.innerHTML = html;
        }

        // =========================================================================
        // UTILITÁRIOS
        // =========================================================================
        function destruirGraficoExistente(idCanvas) {
            const inst = Chart.getChart(idCanvas);
            if (inst !== undefined) inst.destroy();
        }

        function mostrarMensagemVazia(idCanvas, mensagem) {
            const ctx = document.getElementById(idCanvas);
            if (!ctx) return;
            ctx.style.display = 'none';
            const existente = document.getElementById(`empty-msg-${idCanvas}`);
            if (!existente) {
                ctx.parentNode.insertAdjacentHTML('beforeend', `
                    <div id="empty-msg-${idCanvas}" style="display:flex; justify-content:center; align-items:center; height:100%; color:#94a3b8; font-style:italic; border:1px dashed #cbd5e1; border-radius:8px; background:#f8fafc; font-size:13px; padding:20px;">
                        ${mensagem}
                    </div>`);
            }
        }

        await carregarLogicaPainel();
    }, 0);
})();