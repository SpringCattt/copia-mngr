// public/mngr/js/treinos.js
(function() {
    setTimeout(async function inicializarTreinos() {

        // =========================================================================
        // REFERENCIAS DOM
        // =========================================================================
        const ecraLista        = document.getElementById('ecra-lista-treinos');
        const ecraAssiduidade  = document.getElementById('ecra-assiduidade');
        const gridDecorrer     = document.getElementById('grid-treinos-decorrer');
        const gridHistorico    = document.getElementById('grid-treinos-historico');
        const listaAtletas     = document.getElementById('lista-atletas-chamada');
        const inputPesquisa    = document.getElementById('pesquisa-atleta');
        const tabBtnPresencas  = document.getElementById('tab-btn-presencas');
        const tabBtnFeedback   = document.getElementById('tab-btn-feedback');
        const tabPresencas     = document.getElementById('tab-presencas');
        const tabFeedback      = document.getElementById('tab-feedback');
        const feedbackLoading  = document.getElementById('feedback-loading');
        const feedbackConteudo = document.getElementById('feedback-conteudo');
        const feedbackSemDados = document.getElementById('feedback-sem-dados');
        const feedbackComDados = document.getElementById('feedback-com-dados');
        const btnSubmeter      = document.getElementById('btn-submeter-chamada');
        const btnVoltarBread   = document.getElementById('btn-voltar-lista');
        const btnVoltarFooter  = document.getElementById('btn-cancelar-chamada');

        let idEventoEmCurso    = null;
        let isAtualizacao      = false;
        let feedbackJaCarregado  = false;

        if (!ecraLista || !ecraAssiduidade) return;

        function ativarTab(tab) {
            if (tab === 'presencas') {
                tabPresencas.style.display = 'block';
                tabFeedback.style.display = 'none';
                tabBtnPresencas.style.background = 'white';
                tabBtnPresencas.style.color = '#0ea5e9';
                tabBtnPresencas.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                tabBtnFeedback.style.background = 'transparent';
                tabBtnFeedback.style.color = '#64748b';
                tabBtnFeedback.style.boxShadow = 'none';
            } else if (tab === 'feedback') {
                tabPresencas.style.display = 'none';
                tabFeedback.style.display = 'block';
                tabBtnFeedback.style.background = 'white';
                tabBtnFeedback.style.color = '#0ea5e9';
                tabBtnFeedback.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                tabBtnPresencas.style.background = 'transparent';
                tabBtnPresencas.style.color = '#64748b';
                tabBtnPresencas.style.boxShadow = 'none';

                if (!feedbackJaCarregado && idEventoEmCurso) {
                    carregarFeedbackTreino(idEventoEmCurso);
                }
            }
        }

        window.mudarTabTreino = function(tab) { ativarTab(tab); };

        tabBtnPresencas.addEventListener('click', () => ativarTab('presencas'));
        tabBtnFeedback.addEventListener('click', () => ativarTab('feedback'));

        inputPesquisa.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            document.querySelectorAll('.atleta-row').forEach(row => {
                row.style.display = row.getAttribute('data-nome').includes(termo) ? 'table-row' : 'none';
            });
        });

        btnVoltarBread.addEventListener('click', fecharDetalhe);
        btnVoltarFooter.addEventListener('click', fecharDetalhe);

        btnSubmeter.addEventListener('click', async () => {
            if (btnSubmeter.disabled) return;
            btnSubmeter.disabled = true;
            btnSubmeter.textContent = 'A guardar...';

            const arrayPresencas = [];
            document.querySelectorAll('.atleta-row').forEach(row => {
                const sel = row.querySelector('.select-estado');
                arrayPresencas.push({
                    id_atleta: sel.getAttribute('data-id'),
                    estado: sel.value,
                    notas: row.querySelector('.nota-atleta').value
                });
            });

            try {
                const res = await fetch(`/mngr/api/treinos/${idEventoEmCurso}/chamada`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ presencas: arrayPresencas })
                });
                const data = await res.json();
                if (data.success) {
                    mostrarAlerta('As presenças foram registadas e guardadas com sucesso na Base de Dados!', 'sucesso', 'Registo Guardado');
                    setTimeout(() => fecharDetalhe(), 1500); 
                } else {
                    mostrarAlerta('Ocorreu um erro ao processar as presenças. Por favor tente novamente.', 'erro', 'Falha ao Guardar');
                    btnSubmeter.disabled = false;
                    btnSubmeter.textContent = isAtualizacao ? 'Atualizar Presenças' : 'Submeter Presenças';
                }
            } catch (err) {
                mostrarAlerta('Não foi possível comunicar com o servidor. Verifique a sua ligação.', 'erro', 'Erro de Comunicação');
                btnSubmeter.disabled = false;
                btnSubmeter.textContent = isAtualizacao ? 'Atualizar Presenças' : 'Submeter Presenças';
            }
        });

        [gridDecorrer, gridHistorico].forEach(grid => {
            grid.addEventListener('click', (e) => {
                const card = e.target.closest('.event-clicavel');
                if (card) abrirRegistoAssiduidade(card.dataset.id, card.dataset.titulo, card.dataset.data);
            });
        });

        async function carregarListaTreinos() {
            try {
                const res = await fetch('/mngr/api/treinos/historico');
                const dados = await res.json();

                if (!dados.success) return;

                gridDecorrer.innerHTML = '';
                gridHistorico.innerHTML = '';

                let temDecorrer = false;
                let temHistorico = false;
                const agora = new Date();

                if (dados.treinos.length === 0) {
                    gridDecorrer.innerHTML = '<p style="color: var(--text-muted);">Nenhum evento a decorrer neste momento.</p>';
                    gridHistorico.innerHTML = '<p style="color: var(--text-muted);">Nenhum treino no histórico.</p>';
                    return;
                }

                dados.treinos.forEach(treino => {
                    const inicio = new Date(treino.data_hora);
                    const fim = new Date(inicio.getTime() + ((treino.duracao || 120) * 60000));
                    const dataFormatada = inicio.toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                    const tagNome = treino.tipo_evento.replace('_', ' ').toUpperCase();

                    const htmlCard = `
                        <div class="event-card event-clicavel"
                             data-id="${treino.id}"
                             data-titulo="${treino.titulo}"
                             data-data="${dataFormatada}"
                             style="cursor: pointer;">
                            <div class="event-body">
                                <div class="event-details" style="width: 100%;">
                                    <span class="league-tag">${tagNome}</span>
                                    <h3 class="event-title">${treino.titulo}</h3>
                                    <p class="event-meta">${dataFormatada} | ${treino.local || 'Sem local definido'}</p>
                                </div>
                            </div>
                        </div>`;

                    if (agora >= inicio && agora <= fim) {
                        gridDecorrer.innerHTML += htmlCard;
                        temDecorrer = true;
                    } else {
                        gridHistorico.innerHTML += htmlCard;
                        temHistorico = true;
                    }
                });

                if (!temDecorrer) gridDecorrer.innerHTML = '<p style="color: var(--text-muted);">Nenhum evento a decorrer neste momento.</p>';
                if (!temHistorico) gridHistorico.innerHTML = '<p style="color: var(--text-muted);">Nenhum treino passado.</p>';

            } catch (err) {
                if (gridDecorrer) gridDecorrer.innerHTML = '<p style="color: red;">Erro ao carregar os treinos.</p>';
            }
        }

        async function abrirRegistoAssiduidade(idEvento, titulo, data, tabInicial) {
            idEventoEmCurso = idEvento;
            feedbackJaCarregado = false;

            ecraLista.style.display = 'none';
            ecraAssiduidade.style.display = 'block';

            document.getElementById('input-treino-titulo').value = titulo;
            document.getElementById('input-treino-data').value = data;
            const tituloDisplay = document.getElementById('input-treino-titulo-display');
            const dataDisplay = document.getElementById('input-treino-data-display');
            if (tituloDisplay) tituloDisplay.textContent = titulo || '—';
            if (dataDisplay) dataDisplay.textContent = data || '—';
            listaAtletas.innerHTML = '<tr><td colspan="3" style="text-align:center;">A carregar plantel...</td></tr>';

            feedbackLoading.style.display = 'block';
            feedbackConteudo.style.display = 'none';
            if (feedbackSemDados) feedbackSemDados.style.display = 'none';
            if (feedbackComDados) feedbackComDados.style.display = 'none';

            if (tabInicial === 'feedback') {
                ativarTab('feedback');
                carregarFeedbackTreino(idEvento);
            } else {
                ativarTab('presencas');
            }

            try {
                const res = await fetch(`/mngr/api/treinos/${idEvento}/chamada`);
                const dados = await res.json();

                if (dados.success) {
                    listaAtletas.innerHTML = '';
                    isAtualizacao = dados.jaSubmetido;

                    dados.atletas.forEach(atleta => {
                        const nomeReal = atleta.nome_completo || atleta.nome || 'Atleta Desconhecido';
                        const avatar = atleta.url_imagem
                            ? atleta.url_imagem
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(nomeReal)}&background=e2e8f0&color=0284c7`;

                        listaAtletas.innerHTML += `
                            <tr class="atleta-row" data-nome="${nomeReal.toLowerCase()}">
                                <td>
                                    <div class="atleta-cell-inner">
                                        <img src="${avatar}" alt="Foto">
                                        <span>${nomeReal}</span>
                                    </div>
                                </td>
                                <td>
                                    <select class="select-estado" data-id="${atleta.id_atleta}">
                                        <option value="presente" ${atleta.estado === 'presente' ? 'selected' : ''}>Presente</option>
                                        <option value="falta" ${atleta.estado === 'falta' ? 'selected' : ''}>Falta</option>
                                        <option value="atraso" ${atleta.estado === 'atraso' ? 'selected' : ''}>Atraso</option>
                                    </select>
                                </td>
                                <td style="padding-right:18px;">
                                    <input type="text" class="nota-atleta" placeholder="Escrever nota..." value="${atleta.notas || ''}">
                                </td>
                            </tr>`;
                    });

                    btnSubmeter.style.display = 'block';
                    btnSubmeter.disabled = false;
                    btnSubmeter.textContent = isAtualizacao ? 'Atualizar Presenças' : 'Submeter Presenças';
                } else {
                    listaAtletas.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center;">Erro na Base de Dados ao carregar dados.</td></tr>';
                }
            } catch (err) {
                listaAtletas.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center;">Erro ao carregar chamada.</td></tr>';
            }
        }

        async function carregarFeedbackTreino(idEvento) {
            feedbackLoading.style.display = 'block';
            feedbackConteudo.style.display = 'none';

            try {
                const res = await fetch(`/mngr/api/treinos/${idEvento}/feedback`);
                const dados = await res.json();

                if (!dados.success) {
                    feedbackLoading.innerHTML = '<p style="color:red; text-align:center; padding:20px;">Erro ao carregar o feedback. Tenta novamente.</p>';
                    return;
                }

                feedbackJaCarregado = true;
                feedbackLoading.style.display = 'none';
                feedbackConteudo.style.display = 'block';

                const medias = dados.medias;
                const total = parseInt(medias.total_respostas || 0);

                document.getElementById('feedback-rpe-medio').textContent = medias.rpe_medio !== null ? medias.rpe_medio : '—';
                document.getElementById('feedback-fadiga-media').textContent = medias.fadiga_media !== null ? medias.fadiga_media : '—';
                document.getElementById('feedback-sono-medio').textContent = medias.sono_medio !== null ? medias.sono_medio : '—';
                document.getElementById('feedback-total-respostas').textContent = `${total} resposta${total !== 1 ? 's' : ''}`;

                const tbody = document.getElementById('tbody-feedback-atletas');

                if (!dados.feedback || dados.feedback.length === 0) {
                    if (feedbackSemDados) feedbackSemDados.style.display = 'block';
                    if (feedbackComDados) feedbackComDados.style.display = 'none';
                } else {
                    if (feedbackSemDados) feedbackSemDados.style.display = 'none';
                    if (feedbackComDados) feedbackComDados.style.display = 'block';

                    tbody.innerHTML = dados.feedback.map(f => {
                        const avatar = f.url_imagem
                            ? f.url_imagem
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(f.nome_atleta)}&background=e2e8f0&color=0284c7`;

                        const rpeColor    = f.rpe    >= 8 ? '#ef4444' : f.rpe    >= 5 ? '#f59e0b' : '#10b981';
                        const fadigaColor = f.fadiga >= 8 ? '#ef4444' : f.fadiga >= 5 ? '#f59e0b' : '#10b981';
                        const sonoColor   = f.sono   >= 7 ? '#10b981' : f.sono   >= 4 ? '#f59e0b' : '#ef4444';

                        return `
                        <tr>
                            <td class="text-left" style="display:flex; align-items:center; gap:10px; padding:10px 5px;">
                                <img src="${avatar}" alt="" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                                <span style="font-weight:600; color:#1e293b;">${f.nome_atleta}</span>
                            </td>
                            <td style="text-align:center;">
                                <span class="rpe-badge" style="background:${rpeColor}1a; color:${rpeColor};">${f.rpe !== null ? f.rpe : '—'}</span>
                            </td>
                            <td style="text-align:center;">
                                <span class="fadiga-badge" style="background:${fadigaColor}1a; color:${fadigaColor};">${f.fadiga !== null ? f.fadiga : '—'}</span>
                            </td>
                            <td style="text-align:center;">
                                <span class="sono-badge" style="background:${sonoColor}1a; color:${sonoColor};">${f.sono !== null ? f.sono : '—'}</span>
                            </td>
                            <td style="font-size:12px; color:#475569; font-style:${f.observacoes ? 'normal' : 'italic'};">${f.observacoes || '—'}</td>
                        </tr>`;
                    }).join('');
                }
            } catch (err) {
                feedbackLoading.innerHTML = '<p style="color:red; text-align:center; padding:20px;">Erro de comunicação com o servidor.</p>';
            }
        }

        function fecharDetalhe() {
            ecraAssiduidade.style.display = 'none';
            ecraLista.style.display = 'block';
            inputPesquisa.value = '';
            btnSubmeter.disabled = false;
            feedbackJaCarregado = false;
            carregarListaTreinos();
        }

        window.abrirTreinoNoFeedback = function(idEvento, titulo, data) {
            abrirRegistoAssiduidade(idEvento, titulo || 'Treino', data || '', 'feedback');
        };
        window.abrirTreinoNasPresencas = function(idEvento, titulo, data) {
            abrirRegistoAssiduidade(idEvento, titulo || 'Treino', data || '', 'presencas');
        };

        carregarListaTreinos();

    }, 0);
})();