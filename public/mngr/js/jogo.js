(function () {
    setTimeout(async function () {
        const params = new URLSearchParams(window.location.search);
        const idJogo = params.get('id');
        if (!idJogo) return;

        let dadosJogo = null;
        let configDesporto = null;

        // ── Carregar dados ──────────────────────────────────────────
        async function carregar() {
            const res = await fetch(`/mngr/api/jogo/${idJogo}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const container = document.querySelector('.jogo-match-card') || document.body;
                container.innerHTML = `<p style="color:#ef4444;padding:20px;">Erro ao carregar jogo: ${err.error || res.status}</p>`;
                return;
            }
            dadosJogo = await res.json();
            configDesporto = dadosJogo.config_desporto;
            renderizar();
        }

        function renderizar() {
            const { evento, resultado, golos, estatisticas, jogoPassado, atletas, convocatoria, utilizador } = dadosJogo;
            const cfg = configDesporto;
            const unidade = cfg?.unidade_pontuacao || 'Golo';
            const temCartoes = cfg ? cfg.tem_cartoes : true;
            const temAssistencias = cfg ? cfg.tem_assistencias : true;

            // LÓGICA DO BOTÃO VERMELHO "GERAR RELATÓRIO"
            const btnRelatorio = document.getElementById('btn-gerar-relatorio');
            if (btnRelatorio) {
                const temConvocadosValidos = convocatoria && convocatoria.length > 0;
                const temGolosValidos = golos && golos.length > 0;

                // Só exibe se possuir os dois critérios preenchidos simultaneamente
                if (temConvocadosValidos && temGolosValidos) {
                    btnRelatorio.classList.remove('cal-mngr-hidden');
                    btnRelatorio.onclick = function() {
                        // Faz o download nativo do ficheiro PDF gerado pelo backend
                        window.location.href = `/mngr/api/jogo/${idJogo}/relatorio`;
                    };
                } else {
                    btnRelatorio.classList.add('cal-mngr-hidden');
                }
            }

            // Adicionar dinamicamente a opção "2 minutos" se for Andebol
            const selectTipoCartao = document.getElementById('cartao-tipo');
            if (selectTipoCartao && cfg?.modalidade?.toLowerCase() === 'andebol') {
                if (!selectTipoCartao.querySelector('option[value="2min"]')) {
                    const opt2Min = document.createElement('option');
                    opt2Min.value = '2min';
                    opt2Min.textContent = '⏱️ 2 minutos';
                    selectTipoCartao.appendChild(opt2Min);
                }
            }

            const userRole = utilizador?.role || 'atleta'; 

            // Esconder painéis de edição/registo se for atleta
            const escondeParaAtleta = (userRole === 'atleta');
            
            const formGolos = document.getElementById('form-adicionar-golo') || document.querySelector('.jogo-form-golo'); 
            if (formGolos) formGolos.classList.toggle('cal-mngr-hidden', escondeParaAtleta);

            const formCartoes = document.getElementById('form-adicionar-cartao') || document.querySelector('.jogo-form-cartao');
            if (formCartoes) formCartoes.classList.toggle('cal-mngr-hidden', escondeParaAtleta);

            const btnGuardarStats = document.getElementById('btn-guardar-stats');
            if (btnGuardarStats) btnGuardarStats.classList.toggle('cal-mngr-hidden', escondeParaAtleta);

            const btnGuardarAtletaStats = document.getElementById('btn-guardar-atleta-stats');
            if (btnGuardarAtletaStats) btnGuardarAtletaStats.classList.toggle('cal-mngr-hidden', escondeParaAtleta);

            const secCartoes = document.getElementById('secao-cartoes');
            if (secCartoes) secCartoes.classList.toggle('cal-mngr-hidden', !temCartoes);

            const grupoAssNossa = document.getElementById('golo-assistente-nossa-grupo');
            if (grupoAssNossa) grupoAssNossa.classList.toggle('cal-mngr-hidden', !temAssistencias);

            const tituloGolos = document.getElementById('titulo-secao-golos');
            if (tituloGolos) tituloGolos.textContent = `${unidade}s`;

            const bc = document.getElementById('jogo-breadcrumb-titulo');
            if (bc) bc.textContent = evento.titulo || 'Jogo';

            document.getElementById('jogo-nome-nossa').textContent = evento.nome_clube || evento.nome_equipa || '-';
            document.getElementById('jogo-nome-adversario').textContent = evento.equipa_rival || 'Adversário';

            const logoNossa = document.getElementById('jogo-logo-nossa');
            logoNossa.src = evento.logo_nossa || '';
            logoNossa.onerror = () => { logoNossa.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(evento.nome_clube||'N')}&background=0a3d80&color=fff&bold=true&size=80`; };

            const logoAdv = document.getElementById('jogo-logo-adversario');
            logoAdv.src = evento.equipa_rival_imagem || '';
            logoAdv.onerror = () => { logoAdv.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(evento.equipa_rival||'A')}&background=e2e8f0&color=0a3d80&bold=true&size=80`; };

            const d = new Date(evento.data_hora);
            document.getElementById('jogo-data').textContent =
                d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) +
                ' · ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            document.getElementById('jogo-local').textContent = evento.local || '';

            const tagOficial = document.getElementById('jogo-oficial-tag');
            if (evento.oficial) tagOficial.classList.remove('cal-mngr-hidden');

            const compContainer = document.getElementById('jogo-competicao-container');
            const compImagem = document.getElementById('jogo-competicao-imagem');
            const compNome = document.getElementById('jogo-competicao-nome');

            if (compContainer && compImagem && compNome) {
                if (evento.id_competicao) {
                    compNome.textContent = evento.nome_competicao || 'Competição';
                    compImagem.src = evento.imagem_competicao || '';
                    compImagem.onerror = () => { 
                        compImagem.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(evento.nome_competicao || 'C')}&background=d97706&color=fff&size=32`; 
                    };
                    compContainer.classList.remove('cal-mngr-hidden');
                } else {
                    compContainer.classList.add('cal-mngr-hidden');
                }
            }

            if (resultado) {
                document.getElementById('jogo-golos-nossa').textContent = resultado.golos_nossa;
                document.getElementById('jogo-golos-adversario').textContent = resultado.golos_adversario;
            } else {
                document.getElementById('jogo-golos-nossa').textContent = '-';
                document.getElementById('jogo-golos-adversario').textContent = '-';
            }

            // Atualizar labels dos selects de equipa com nomes reais
            const nomeNossa = evento.nome_clube || evento.nome_equipa || 'Nossa Equipa';
            const nomeAdv = evento.equipa_rival || 'Adversário';
            ['golo-equipa-tipo', 'cartao-equipa-tipo', 'pen-equipa-tipo'].forEach(selectId => {
                const sel = document.getElementById(selectId);
                if (!sel) return;
                sel.options[0].textContent = nomeNossa;
                sel.options[1].textContent = nomeAdv;
            });

            document.getElementById('secao-pos-jogo').classList.toggle('cal-mngr-hidden', !jogoPassado);
            document.getElementById('secao-pre-jogo').classList.toggle('cal-mngr-hidden', jogoPassado);

            const secaoConvocatoria = document.getElementById('secao-convocatoria');
            const dataAtual = new Date();
            const dataJogo = new Date(evento.data_hora);

            if (secaoConvocatoria) {
                if (dataJogo > dataAtual) {
                    secaoConvocatoria.classList.remove('cal-mngr-hidden');
                    renderizarZonaconvocatoria(userRole, atletas || [], convocatoria || []);
                } else {
                    secaoConvocatoria.classList.add('cal-mngr-hidden');
                }
            }

            if (!jogoPassado) return;

            document.getElementById('stats-label-nossa').textContent = evento.nome_clube || evento.nome_equipa || 'Nós';
            document.getElementById('stats-label-adversario').textContent = evento.equipa_rival || 'Adversário';

            const selectAtleta = document.getElementById('golo-atleta-select');
            const selectAssistente = document.getElementById('golo-assistente-select');
            if (selectAtleta && selectAssistente) {
                selectAtleta.innerHTML = '<option value="">Selecione o atleta...</option>';
                selectAssistente.innerHTML = '<option value="">Sem assistência</option>';
                (convocatoria || []).forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id_atleta || c.id; 
                    opt.textContent = c.nome_completo || 'Atleta Selecionado';
                    selectAtleta.appendChild(opt);
                    const opt2 = opt.cloneNode(true);
                    selectAssistente.appendChild(opt2);
                });
            }

            const selectCartaoAtleta = document.getElementById('cartao-atleta-select');
            if (selectCartaoAtleta) {
                selectCartaoAtleta.innerHTML = '<option value="">Selecione o atleta...</option>';
                (convocatoria || []).forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id_atleta || c.id; 
                    opt.textContent = c.nome_completo || 'Atleta Selecionado';
                    selectCartaoAtleta.appendChild(opt);
                });
            }

            // Preencher select de cobradores de penalidades
            const selectPenAtleta = document.getElementById('pen-atleta-select');
            if (selectPenAtleta) {
                selectPenAtleta.innerHTML = '<option value="">Selecione o atleta...</option>';
                (convocatoria || []).forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id_atleta || c.id;
                    opt.textContent = c.nome_completo || 'Atleta';
                    selectPenAtleta.appendChild(opt);
                });
            }

            // Forçar a atualização visual dos formulários de acordo com a equipa selecionada no momento
            const selectGoloEquipa = document.getElementById('golo-equipa-tipo');
            if (selectGoloEquipa) {
                const propria = selectGoloEquipa.value === 'nossa';
                document.getElementById('golo-nossa-grupo')?.classList.toggle('cal-mngr-hidden', !propria);
                document.getElementById('golo-adversario-grupo')?.classList.toggle('cal-mngr-hidden', propria);
                document.getElementById('golo-assistente-nossa-grupo')?.classList.toggle('cal-mngr-hidden', !propria || !temAssistencias);
                document.getElementById('golo-assistente-adversario-grupo')?.classList.toggle('cal-mngr-hidden', propria || !temAssistencias);
            }

            const selectCartaoEquipa = document.getElementById('cartao-equipa-tipo');
            if (selectCartaoEquipa) {
                const propria = selectCartaoEquipa.value === 'nossa';
                document.getElementById('cartao-nossa-grupo')?.classList.toggle('cal-mngr-hidden', !propria);
                document.getElementById('cartao-adversario-grupo')?.classList.toggle('cal-mngr-hidden', propria);
            }

            const selectPenEquipa = document.getElementById('pen-equipa-tipo');
            if (selectPenEquipa) {
                const propria = selectPenEquipa.value === 'nossa';
                document.getElementById('pen-nossa-grupo')?.classList.toggle('cal-mngr-hidden', !propria);
                document.getElementById('pen-adversario-grupo')?.classList.toggle('cal-mngr-hidden', propria);
            }

            // Chamadas das listagens
            renderizarGolos(golos || [], dadosJogo.penalidades || [], evento, userRole);
            renderizarCartoes(dadosJogo.cartoes || [], evento, userRole);
            renderizarPenalidades(dadosJogo.penalidades || [], evento, userRole);
            
            renderizarAtletaStats(dadosJogo.atleta_stats || [], convocatoria || [], userRole);
            renderizarStats(estatisticas, userRole);
        }

        function renderizarZonaconvocatoria(role, todosAtletas, jogadoresConvocados) {
            const listaContainer = document.getElementById('lista-convocados');
            if (!listaContainer) return;

            listaContainer.innerHTML = '';
            const jaTemConvocados = jogadoresConvocados.length > 0;

            if (role === 'treinador') {
                if (todosAtletas.length === 0) {
                    listaContainer.innerHTML = '<p class="jogo-empty-msg">Nenhum atleta associado a este escalão.</p>';
                    return;
                }

                const idsConvocados = new Set(jogadoresConvocados.map(c => parseInt(c.id_atleta || c.id)));

                todosAtletas.forEach(atleta => {
                    const isChecked = idsConvocados.has(parseInt(atleta.id)) ? 'checked' : '';
                    listaContainer.innerHTML += `
                        <label class="jogo-convocado-interactive-row" style="display: block; padding: 10px; margin: 5px 0; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer;">
                            <input type="checkbox" class="check-atleta-convocatoria" data-id="${atleta.id}" ${isChecked}>
                            <span style="margin-left: 8px;">${atleta.nome_completo}</span>
                        </label>
                    `;
                });

                let btnPublicar = document.getElementById('btn-publicar-convocatoria');
                if (!btnPublicar) {
                    btnPublicar = document.createElement('button');
                    btnPublicar.id = 'btn-publicar-convocatoria';
                    btnPublicar.className = 'jogo-btn-primary';
                    btnPublicar.style.display = 'block';
                    btnPublicar.style.margin = '20px auto 0 auto';
                    btnPublicar.style.padding = '10px 20px';
                    btnPublicar.style.borderRadius = '6px';
                    btnPublicar.style.color = '#fff';
                    btnPublicar.style.fontWeight = 'bold';
                    btnPublicar.style.cursor = 'pointer';
                    listaContainer.appendChild(btnPublicar);
                }

                if (jaTemConvocados) {
                    btnPublicar.textContent = 'Editar Convocatória';
                    btnPublicar.style.background = '#64748b'; 
                } else {
                    btnPublicar.textContent = 'Publicar Convocatória';
                    btnPublicar.style.background = '#2563eb'; 
                }
                
                btnPublicar.onclick = async () => {
                    const selecionados = [];
                    document.querySelectorAll('.check-atleta-convocatoria:checked').forEach(input => {
                        selecionados.push(parseInt(input.getAttribute('data-id')));
                    });

                    try {
                        const response = await fetch(`/mngr/api/jogo/${idJogo}/convocatoria`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ atletas: selecionados })
                        });

                        if (response.ok) {
                            window.location.reload();
                        } else {
                            const errData = await response.json().catch(() => ({}));
                            mostrarAlerta('Erro ao guardar convocatória: ' + (errData.error || response.status));
                        }
                    } catch (error) {
                        console.error('Erro na submissão:', error);
                        mostrarAlerta('Erro de comunicação com o servidor.');
                    }
                };

            } else {
                if (!jaTemConvocados) {
                    listaContainer.innerHTML = '<p class="jogo-pre-jogo-msg" id="msg-sem-convocados" style="color: #64748b; text-align: center;">Jogo sem convocatória por enquanto.</p>';
                } else {
                    let htmlList = '<div style="width: 100%; max-width: 400px; margin: 0 auto;">';
                    jogadoresConvocados.forEach(c => {
                        const nome = c.nome_completo || 'Atleta Selecionado';
                        const estadoLabel = c.estado ? ` <span style="font-size:0.8rem; padding: 2px 8px; border-radius:10px; background:#e2e8f0; color:#475569; margin-left: 5px; font-weight:600;">${c.estado}</span>` : '';
                        htmlList += `
                            <div style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 1rem; color: #1e293b; font-weight: 500;">
                                ${nome} ${estadoLabel}
                            </div>
                        `;
                    });
                    htmlList += '</div>';
                    listaContainer.innerHTML = htmlList;
                }
            }
        }

        function renderizarGolos(golos, penalidades, evento, role) {
            const lista = document.getElementById('lista-golos');
            if (!lista) return;

            // Identificar dinamicamente o emoji/ícone apropriado para o golo consoante a modalidade
            const modalidade = (configDesporto?.modalidade || evento?.nome_desporto || '').toLowerCase();
            let goloIcone = '⚽'; // Valor por defeito (Futebol)
            if (modalidade.includes('andebol')) {
                goloIcone = '🤾';
            } else if (modalidade.includes('hoquei') || modalidade.includes('hóquei')) {
                goloIcone = '🏑';
            }

            const penalidadesConvertidas = penalidades.filter(p => p.convertida).map(p => ({ ...p, _tipo: 'penalidade' }));
            const golosComTipo = golos.map(g => ({ ...g, _tipo: 'golo' }));
            const todos = [...golosComTipo, ...penalidadesConvertidas].sort((a, b) => (a.minuto ?? 999) - (b.minuto ?? 999));

            if (todos.length === 0) {
                const textMsg = configDesporto?.unidade_pontuacao ? `Sem ${configDesporto.unidade_pontuacao}s registados.` : 'Sem golos registados.';
                lista.innerHTML = `<p class="jogo-empty-msg">${textMsg}</p>`;
                return;
            }

            lista.innerHTML = '';
            todos.forEach(g => {
                if (g._tipo === 'penalidade') {
                    const nome = g.equipa_propria
                        ? (g.nome_completo || g.nome_cobrador || 'Atleta')
                        : (g.nome_cobrador || 'Adversário');
                    const equipaLabel = g.equipa_propria ? (evento.nome_clube || evento.nome_equipa || 'Nós') : (evento.equipa_rival || 'Adversário');
                    const minuto = g.minuto ? `${g.minuto}'` : '';
                    const btnRemoverPen = role === 'treinador'
                        ? `<button class="jogo-btn-remover-golo" data-pen-id="${g.id}" title="Remover penalidade">✕</button>`
                        : '';
                    lista.innerHTML += `
                        <div class="jogo-golo-item ${g.equipa_propria ? 'nossa' : 'adversario'}">
                            <div class="jogo-golo-info">
                                <span class="jogo-golo-icon">🎯</span>
                                <div>
                                    <span class="jogo-golo-nome">${nome} <span style="font-size:11px;color:#6366f1;font-weight:700;">(P)</span></span>
                                    ${minuto ? `<span class="jogo-golo-minuto">${minuto}</span>` : ''}
                                </div>
                            </div>
                            <div class="jogo-golo-right">
                                <span class="jogo-golo-equipa">${equipaLabel}</span>
                                ${btnRemoverPen}
                            </div>
                        </div>`;
                } else {
                    const marcadorEquipaPropria = g.autogolo ? !g.equipa_propria : g.equipa_propria;
                    const nomeMarcador = marcadorEquipaPropria
                        ? (g.nome_completo || g.nome_marcador || 'Atleta')
                        : (g.nome_marcador || 'Adversário');
                    const equipaLabel = g.equipa_propria ? (evento.nome_clube || evento.nome_equipa || 'Nós') : (evento.equipa_rival || 'Adversário');
                    const minuto = g.minuto ? `${g.minuto}'` : '';
                    const agTag = g.autogolo ? ' <span style="font-size:11px;color:#ef4444;font-weight:700;">(AG)</span>' : '';
                    const assistenteNome = g.nome_assistente_atleta || g.nome_assistente_texto || null;
                    const assistenteHtml = assistenteNome ? `<span class="jogo-golo-assistente">🅰 ${assistenteNome}</span>` : '';
                    const btnRemoverHtml = role === 'treinador'
                        ? `<button class="jogo-btn-remover-golo" data-id="${g.id}" title="Remover">✕</button>`
                        : '';

                    lista.innerHTML += `
                        <div class="jogo-golo-item ${g.equipa_propria ? 'nossa' : 'adversario'}">
                            <div class="jogo-golo-info">
                                <span class="jogo-golo-icon">${goloIcone}</span>
                                <div>
                                    <span class="jogo-golo-nome">${nomeMarcador}${agTag}</span>
                                    ${minuto ? `<span class="jogo-golo-minuto">${minuto}</span>` : ''}
                                    ${assistenteHtml}
                                </div>
                            </div>
                            <div class="jogo-golo-right">
                                <span class="jogo-golo-equipa">${equipaLabel}</span>
                                ${btnRemoverHtml}
                            </div>
                        </div>`;
                }
            });

            if (role === 'treinador') {
                lista.querySelectorAll('.jogo-btn-remover-golo[data-id]').forEach(btn => {
                    btn.addEventListener('click', () => removerGolo(btn.getAttribute('data-id')));
                });
                lista.querySelectorAll('.jogo-btn-remover-golo[data-pen-id]').forEach(btn => {
                    btn.addEventListener('click', () => removerPenalidade(btn.getAttribute('data-pen-id')));
                });
            }
        }

        function renderizarCartoes(cartoes, evento, role) {
            const lista = document.getElementById('lista-cartoes');
            if (!lista) return;

            if (cartoes.length === 0) {
                lista.innerHTML = '<p class="jogo-empty-msg">Sem cartões registados.</p>';
                return;
            }

            lista.innerHTML = '';
            cartoes.forEach(c => {
                const nome = c.nome_completo || c.nome_jogador || 'Jogador';
                const equipaLabel = c.equipa_propria ? (evento.nome_clube || evento.nome_equipa || 'Nós') : (evento.equipa_rival || 'Adversário');
                const minuto = c.minuto ? `${c.minuto}'` : '';
                
                let icone = '🟨';
                if (c.tipo === 'vermelho') {
                    icone = '🟥';
                } else if (c.tipo === '2min') {
                    icone = '⏱️ 2 min';
                }

                const btnRemoverHtml = (role === 'treinador') 
                    ? `<button class="jogo-btn-remover-golo" data-id="${c.id}" title="Remover cartão">✕</button>` 
                    : '';

                lista.innerHTML += `
                    <div class="jogo-golo-item ${c.equipa_propria ? 'nossa' : 'adversario'}">
                        <div class="jogo-golo-info">
                            <span class="jogo-golo-icon">${icone}</span>
                            <span class="jogo-golo-nome" style="margin-left: 8px;">${nome}</span>
                            ${minuto ? `<span class="jogo-golo-minuto">${minuto}</span>` : ''}
                        </div>
                        <div class="jogo-golo-right">
                            <span class="jogo-golo-equipa">${equipaLabel}</span>
                            ${btnRemoverHtml}
                        </div>
                    </div>`;
            });

            if (role === 'treinador') {
                lista.querySelectorAll('.jogo-btn-remover-golo').forEach(btn => {
                    btn.addEventListener('click', () => removerCartao(btn.getAttribute('data-id')));
                });
            }
        }

        function renderizarPenalidades(penalidades, evento, role) {
            const lista = document.getElementById('lista-penalidades');
            const formPen = document.getElementById('form-adicionar-penalidade');
            if (!lista) return;

            if (formPen) formPen.classList.toggle('cal-mngr-hidden', role === 'atleta');

            if (penalidades.length === 0) {
                lista.innerHTML = '<p class="jogo-empty-msg">Sem penalidades registadas.</p>';
            } else {
                lista.innerHTML = '';
                penalidades.forEach(p => {
                    const nome = p.equipa_propria
                        ? (p.nome_completo || p.nome_cobrador || 'Atleta')
                        : (p.nome_cobrador || 'Adversário');
                    const equipaLabel = p.equipa_propria ? (evento.nome_clube || evento.nome_equipa || 'Nós') : (evento.equipa_rival || 'Adversário');
                    const minuto = p.minuto ? `${p.minuto}'` : '';
                    const resultadoTag = p.convertida
                        ? '<span style="font-size:11px;color:#16a34a;font-weight:700;margin-left:6px;">✓ Convertida</span>'
                        : '<span style="font-size:11px;color:#ef4444;font-weight:700;margin-left:6px;">✕ Falhada</span>';
                    const btnRemoverHtml = (role === 'treinador')
                        ? `<button class="jogo-btn-remover-golo" data-id="${p.id}" title="Remover">✕</button>`
                        : '';

                    lista.innerHTML += `
                        <div class="jogo-golo-item ${p.equipa_propria ? 'nossa' : 'adversario'}">
                            <div class="jogo-golo-info">
                                <span class="jogo-golo-icon">🎯</span>
                                <div>
                                    <span class="jogo-golo-nome">${nome}${resultadoTag}</span>
                                    ${minuto ? `<span class="jogo-golo-minuto">${minuto}</span>` : ''}
                                </div>
                            </div>
                            <div class="jogo-golo-right">
                                <span class="jogo-golo-equipa">${equipaLabel}</span>
                                ${btnRemoverHtml}
                            </div>
                        </div>`;
                });

                if (role === 'treinador') {
                    lista.querySelectorAll('.jogo-btn-remover-golo').forEach(btn => {
                        btn.addEventListener('click', () => removerPenalidade(btn.getAttribute('data-id')));
                    });
                }
            }
        }

        function renderizarStats(stats, role) {
            const lista = document.getElementById('stats-lista');
            if (!lista) return;
            lista.innerHTML = '';

            let statsConfig = configDesporto?.estatisticas ?? [];
            
            if (statsConfig.length === 0) {
                lista.innerHTML = '<p class="jogo-empty-msg">Nenhuma categoria de estatística configurada para esta modalidade.</p>';
                return;
            }
            
            const isAtleta = (role === 'atleta');

            statsConfig.forEach(({ campo, label }) => {
                const vNossa = stats ? (stats[`${campo}_nossa`] ?? '0') : '0';
                const vAdv   = stats ? (stats[`${campo}_adversario`] ?? '0') : '0';

                if (isAtleta) {
                    lista.innerHTML += `
                        <div class="jogo-stat-row atleta-view" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                            <span style="font-weight: 600; font-size: 1.1rem; color: #1e3a8a; width: 50px; text-align: left;">${vNossa}</span>
                            <span class="jogo-stat-label" style="color: #475569; font-weight: 500;">${label}</span>
                            <span style="font-weight: 600; font-size: 1.1rem; color: #dc2626; width: 50px; text-align: right;">${vAdv}</span>
                        </div>`;
                } else {
                    lista.innerHTML += `
                        <div class="jogo-stat-row">
                            <input type="number" class="jogo-stat-input nossa" data-campo="${campo}_nossa" value="${vNossa}" min="0" placeholder="0">
                            <span class="jogo-stat-label">${label}</span>
                            <input type="number" class="jogo-stat-input adversario" data-campo="${campo}_adversario" value="${vAdv}" min="0" placeholder="0">
                        </div>`;
                }
            });
        }

        function renderizarAtletaStats(atletaStats, jogadoresConvocados, role) {
            const lista = document.getElementById('lista-atleta-stats');
            if (!lista) return;
            lista.innerHTML = '';

            if (jogadoresConvocados.length === 0) {
                lista.innerHTML = '<p class="jogo-empty-msg">Nenhum jogador foi convocado, logo não existem estatísticas individuais.</p>';
                return;
            }

            const statsMap = {};
            atletaStats.forEach(s => { statsMap[s.id_atleta] = s; });
            const isAtleta = (role === 'atleta');

            jogadoresConvocados.forEach(c => {
                const atletaId = c.id_atleta || c.id;
                const s = statsMap[atletaId] || {};
                const nome = c.nome_completo || 'Atleta Selecionado';
                const minJogados = s.minutos_jogados ?? '0';
                const notasTexto = s.notas ?? '';

                if (isAtleta) {
                    lista.innerHTML += `
                        <div class="jogo-atleta-stat-row atleta-view" style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid #f1f5f9;">
                            <span class="jogo-atleta-stat-nome" style="font-weight:500; color:#334155;">${nome}</span>
                            <div style="display: flex; gap: 15px; align-items: center;">
                                <span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 0.9rem; font-weight: 600;">${minJogados} min</span>
                                ${notasTexto ? `<span style="font-size: 0.85rem; color: #64748b; font-style: italic;">(${notasTexto})</span>` : ''}
                            </div>
                        </div>`;
                } else {
                    lista.innerHTML += `
                        <div class="jogo-atleta-stat-row" data-atleta="${atletaId}">
                            <span class="jogo-atleta-stat-nome">${nome}</span>
                            <input type="number" class="jogo-stat-input jogo-atleta-min" placeholder="Min." min="0" max="999" value="${s.minutos_jogados ?? ''}" title="Minutos jogados">
                            <input type="text" class="jogo-stat-input jogo-atleta-nota" placeholder="Nota (opcional)" value="${s.notas ?? ''}" title="Notas">
                        </div>`;
                }
            });
        }

        // ── Eventos de Adicionar ────────────────────────────────────
        document.getElementById('golo-equipa-tipo')?.addEventListener('change', function () {
            const propria = this.value === 'nossa';
            const temAss = configDesporto ? configDesporto.tem_assistencias : true;
            document.getElementById('golo-nossa-grupo')?.classList.toggle('cal-mngr-hidden', !propria);
            document.getElementById('golo-adversario-grupo')?.classList.toggle('cal-mngr-hidden', propria);
            document.getElementById('golo-assistente-nossa-grupo')?.classList.toggle('cal-mngr-hidden', !propria || !temAss);
            document.getElementById('golo-assistente-adversario-grupo')?.classList.toggle('cal-mngr-hidden', propria || !temAss);
        });

        document.getElementById('btn-adicionar-golo')?.addEventListener('click', async () => {
            const tipo = document.getElementById('golo-equipa-tipo').value;
            const equipaPropria = tipo === 'nossa';
            const minuto = document.getElementById('golo-minuto').value.trim();

            if (!minuto) return mostrarAlerta('Por favor, indique o minuto em que o golo ocorreu.','aviso');
            if (parseInt(minuto) > 120) return mostrarAlerta('O minuto não pode ser superior a 120.','aviso');

            const autogolo = document.getElementById('golo-autogolo').checked;
            const id_assistente = equipaPropria ? (document.getElementById('golo-assistente-select').value || null) : null;
            const nome_assistente = !equipaPropria ? (document.getElementById('golo-assistente-nome').value.trim() || null) : null;
            let payload = { equipa_propria: equipaPropria, minuto: parseInt(minuto), autogolo, id_assistente: id_assistente, nome_assistente: nome_assistente };

            if (equipaPropria) {
                const idAtleta = document.getElementById('golo-atleta-select').value;
                if (!idAtleta) return mostrarAlerta('Por favor, selecione o atleta da nossa equipa que marcou.','aviso');
                if (id_assistente && id_assistente === idAtleta) return mostrarAlerta('O marcador e o assistente não podem ser o mesmo jogador.','aviso');
                payload.id_atleta = idAtleta;
            } else {
                const nome = document.getElementById('golo-adversario-nome').value.trim();
                if (!nome) {
                    return mostrarAlerta('Por favor, indique o nome do marcador adversário.','aviso');
                }
                payload.nome_marcador = nome;
            }

            const res = await fetch(`/mngr/api/jogo/${idJogo}/golo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                if (document.getElementById('golo-equipa-tipo')) {
                    document.getElementById('golo-equipa-tipo').value = 'nossa';
                }
                document.getElementById('golo-minuto').value = '';
                document.getElementById('golo-atleta-select').value = '';
                document.getElementById('golo-adversario-nome').value = '';
                document.getElementById('golo-autogolo').checked = false;
                document.getElementById('golo-assistente-select').value = '';
                document.getElementById('golo-assistente-nome').value = '';
                await carregar();
            } else {
                mostrarAlerta('Erro ao adicionar golo.');
            }
        });

        document.getElementById('cartao-equipa-tipo')?.addEventListener('change', function () {
            const propria = this.value === 'nossa';
            document.getElementById('cartao-nossa-grupo')?.classList.toggle('cal-mngr-hidden', !propria);
            document.getElementById('cartao-adversario-grupo')?.classList.toggle('cal-mngr-hidden', propria);
        });

        document.getElementById('btn-adicionar-cartao')?.addEventListener('click', async () => {
            const tipo = document.getElementById('cartao-equipa-tipo').value;
            const equipaPropria = tipo === 'nossa';
            const tipoCartao = document.getElementById('cartao-tipo').value;
            const minuto = document.getElementById('cartao-minuto').value.trim();

            if (!minuto) return mostrarAlerta('Por favor, indique o minuto em que o cartão foi aplicado.','aviso');
            if (parseInt(minuto) > 120) return mostrarAlerta('O minuto não pode ser superior a 120.','aviso');

            if (!tipoCartao) {
                return mostrarAlerta('Por favor, selecione o tipo de cartão (Amarelo/Vermelho/2 minutos).','aviso');
            }

            let payload = { equipa_propria: equipaPropria, tipo: tipoCartao, minuto: parseInt(minuto) };

            if (equipaPropria) {
                const idAtleta = document.getElementById('cartao-atleta-select').value;
                if (!idAtleta) {
                    return mostrarAlerta('Por favor, selecione o atleta da nossa equipa que recebeu o cartão.','aviso');
                }
                payload.id_atleta = idAtleta;
            } else {
                const nome = document.getElementById('cartao-adversario-nome').value.trim();
                if (!nome) {
                    return mostrarAlerta('Por favor, indique o nome do jogador adversário.','aviso');
                }
                payload.nome_jogador = nome;
            }

            const res = await fetch(`/mngr/api/jogo/${idJogo}/cartao`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                if (document.getElementById('cartao-equipa-tipo')) {
                    document.getElementById('cartao-equipa-tipo').value = 'nossa';
                }
                document.getElementById('cartao-atleta-select').value = '';
                document.getElementById('cartao-adversario-nome').value = '';
                document.getElementById('cartao-minuto').value = '';
                await carregar();
            } else {
                mostrarAlerta('Erro ao registar cartão.');
            }
        });

        async function removerCartao(idCartao) {
            const conf = await window.mostrarConfirmacao('Tem a certeza que deseja remover este cartão?');
            if (!conf) return;
            const res = await fetch(`/mngr/api/jogo/${idJogo}/cartao/${idCartao}`, { method: 'DELETE' });
            if (res.ok) await carregar();
        }

        document.getElementById('pen-equipa-tipo')?.addEventListener('change', function () {
            const propria = this.value === 'nossa';
            document.getElementById('pen-nossa-grupo')?.classList.toggle('cal-mngr-hidden', !propria);
            document.getElementById('pen-adversario-grupo')?.classList.toggle('cal-mngr-hidden', propria);
        });

        document.getElementById('btn-adicionar-penalidade')?.addEventListener('click', async () => {
            const tipo = document.getElementById('pen-equipa-tipo').value;
            const equipaPropria = tipo === 'nossa';
            const minuto = document.getElementById('pen-minuto').value.trim();
            const convertida = document.getElementById('pen-convertida').checked;

            if (!minuto) return mostrarAlerta('Por favor, indique o minuto da penalidade.','aviso');
            if (parseInt(minuto) > 120) return mostrarAlerta('O minuto não pode ser superior a 120.','aviso');

            let payload = { equipa_propria: equipaPropria, minuto: parseInt(minuto), convertida };

            if (equipaPropria) {
                const idAtleta = document.getElementById('pen-atleta-select').value;
                if (!idAtleta) return mostrarAlerta('Por favor, selecione o atleta que cobrou a penalidade.','aviso');
                payload.id_atleta = idAtleta;
            } else {
                const nome = document.getElementById('pen-adversario-nome').value.trim();
                if (!nome) return mostrarAlerta('Por favor, indique o nome do cobrador adversário.','aviso');
                payload.nome_cobrador = nome;
            }

            const res = await fetch(`/mngr/api/jogo/${idJogo}/penalidade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                if (document.getElementById('pen-equipa-tipo')) {
                    document.getElementById('pen-equipa-tipo').value = 'nossa';
                }
                document.getElementById('pen-minuto').value = '';
                document.getElementById('pen-atleta-select').value = '';
                document.getElementById('pen-adversario-nome').value = '';
                document.getElementById('pen-convertida').checked = false;
                await carregar();
            } else {
                mostrarAlerta('Erro ao registar penalidade.');
            }
        });

        async function removerPenalidade(idPenalidade) {
            const conf = await window.mostrarConfirmacao('Tem a certeza que deseja remover esta penalidade?');
            if (!conf) return;
            const res = await fetch(`/mngr/api/jogo/${idJogo}/penalidade/${idPenalidade}`, { method: 'DELETE' });
            if (res.ok) await carregar();
        }

        async function removerGolo(idGolo) {
            const conf = await window.mostrarConfirmacao('Tem a certeza que deseja remover este golo?');
            if (!conf) return;
            const res = await fetch(`/mngr/api/jogo/${idJogo}/golo/${idGolo}`, { method: 'DELETE' });
            if (res.ok) await carregar();
        }

        document.getElementById('btn-guardar-stats')?.addEventListener('click', async () => {
            const payload = {};
            const inputs = document.querySelectorAll('.jogo-stat-row input');
            if (inputs.length === 0) return; 

            inputs.forEach(input => {
                payload[input.getAttribute('data-campo')] = parseInt(input.value) || 0;
            });

            const res = await fetch(`/mngr/api/jogo/${idJogo}/estatisticas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const btn = document.getElementById('btn-guardar-stats');
                const textoOriginal = btn.textContent;
                btn.textContent = '✓ Guardado!';
                btn.style.background = '#16a34a';
                setTimeout(() => {
                    btn.textContent = textoOriginal;
                    btn.style.background = '';
                }, 2000);
            } else {
                mostrarAlerta('Erro ao guardar estatísticas.');
            }
        });

        document.getElementById('btn-guardar-atleta-stats')?.addEventListener('click', async () => {
            const atletasPayload = [];
            const rows = document.querySelectorAll('.jogo-atleta-stat-row:not(.atleta-view)');
            if (rows.length === 0) return;

            rows.forEach(row => {
                const id_atleta = row.getAttribute('data-atleta');
                const minutos = row.querySelector('.jogo-atleta-min').value;
                const notas = row.querySelector('.jogo-atleta-nota').value.trim();
                atletasPayload.push({
                    id_atleta: parseInt(id_atleta),
                    minutos_jogados: minutos !== '' ? parseInt(minutos) : null,
                    notas: notas || null
                });
            });

            const res = await fetch(`/mngr/api/jogo/${idJogo}/atleta-stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ atletas: atletasPayload })
            });

            const btn = document.getElementById('btn-guardar-atleta-stats');
            if (res.ok) {
                const orig = btn.textContent;
                btn.textContent = '✓ Guardado!';
                btn.style.background = '#16a34a';
                setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 2000);
            } else {
                mostrarAlerta('Erro ao guardar minutos.');
            }
        });

        await carregar();
    }, 0);
})();