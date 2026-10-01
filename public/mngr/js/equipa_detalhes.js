// public/mngr/js/equipa_detalhes.js
(function() {
    function obterIdEquipaDoURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    // 🌟 2. CORREÇÃO CRÍTICA: FUNÇÃO SPA QUE EXTRAI E EXECUTA OS SCRIPTS INJETADOS
    async function navegarSPA(e, url) {
        e.preventDefault();
        window.history.pushState({}, '', url);
        
        try {
            const res = await fetch(url, { headers: { 'x-solicitado-por': 'SPA' } });
            if (res.ok) {
                const html = await res.text();
                const container = document.getElementById('main-content') || document.querySelector('.main-content') || document.querySelector('main');
                if (container) {
                    container.innerHTML = html;
                    
                    // Recriar os elementos de script para obrigar o browser a executá-los
                    const scripts = container.querySelectorAll('script');
                    scripts.forEach(oldScript => {
                        const newScript = document.createElement('script');
                        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                        oldScript.parentNode.replaceChild(newScript, oldScript);
                    });
                } else {
                    window.location.href = url;
                }
            } else {
                window.location.href = url;
            }
        } catch (err) {
            window.location.href = url;
        }
    }

    async function inicializarPaginaDetalhes() {
        const idEquipa = obterIdEquipaDoURL();

        if (!idEquipa || idEquipa === 'null') {
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) pageTitle.textContent = "Erro: Equipa não especificada.";
            return;
        }

        // 🌟 1. FORÇAR A SIDEBAR A MANTER-SE ATIVA NAS EQUIPAS
        setTimeout(() => {
            document.querySelectorAll('.sidebar-menu a, .sidebar a, .nav-item').forEach(el => el.classList.remove('active'));
            const linkEquipas = document.querySelector('a[href="/mngr/gestorClube/equipas"]');
            if (linkEquipas) {
                linkEquipas.classList.add('active');
                const liPai = linkEquipas.closest('li');
                if (liPai) liPai.classList.add('active');
            }
        }, 80);

        // Ativar Breadcrumb SPA
        const breadLinkListagem = document.querySelector('.breadcrumbs a[href="/mngr/gestorClube/equipas"]');
        if (breadLinkListagem) {
            breadLinkListagem.addEventListener('click', (e) => navegarSPA(e, '/mngr/gestorClube/equipas'));
        }

        const elFotoEquipa = document.querySelector('.js-team-photo');
        const elBreadcrumbModalidade = document.getElementById('breadcrumb-modalidade');
        const elBreadcrumbEscalao = document.getElementById('breadcrumb-escalao');
        const elPageTitle = document.getElementById('page-title');

        try {
            const resCabeçalho = await fetch(`/mngr/api/equipa/${idEquipa}`);
            const dadosCabecalho = await resCabeçalho.json();

            if (!dadosCabecalho.success) {
                if (elPageTitle) elPageTitle.textContent = dadosCabecalho.message || "Equipa não encontrada.";
                return;
            }

            const equipa = dadosCabecalho.equipa || (dadosCabecalho.dados ? dadosCabecalho.dados.equipa : null) || dadosCabecalho;

            if (elFotoEquipa) {
                const urlFoto = equipa.foto_url || `https://dummyimage.com/150x150/e2e8f0/627d98.png&text=${encodeURIComponent(equipa.nome || 'Equipa')}`;
                elFotoEquipa.src = urlFoto;
                elFotoEquipa.alt = equipa.nome || "Foto da Equipa";
            }

            if (elPageTitle) elPageTitle.textContent = equipa.nome || "Equipa Sem Nome";
            if (elBreadcrumbModalidade) elBreadcrumbModalidade.textContent = equipa.desporto_nome || "Modalidade";
            if (elBreadcrumbEscalao) elBreadcrumbEscalao.textContent = equipa.escalao_nome || "Escalão";

            const elBreadcrumbEquipa = document.getElementById('breadcrumb-nome-equipa');
            if (elBreadcrumbEquipa) elBreadcrumbEquipa.textContent = equipa.nome;

            carregarPlantel(idEquipa);
            carregarCompeticoes(idEquipa);

        } catch (err) { console.error(err); }
    }

    async function carregarCompeticoes(idEquipa) {
        const container = document.getElementById('secao-competicoes');
        if (!container) return;

        try {
            const res = await fetch(`/mngr/api/equipa/${idEquipa}/competicoes`);
            const data = await res.json();

            if (!data.success || data.competicoes.length === 0) {
                container.innerHTML = '';
                return;
            }

            const tipoLabel = { liga: 'Liga', eliminatoria: 'Eliminatória', jogo_unico: 'Jogo Único', grupo_eliminatorias: 'Grupos + Eliminatórias' };
            const tipoOpcoes = Object.entries(tipoLabel).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

            container.innerHTML = `<h2 class="section-title">Competições</h2>` + data.competicoes.map(comp => {
                const jogosHtml = comp.jogos.length === 0
                    ? `<p style="color:#94a3b8;font-size:13px;margin:8px 0 0;">Sem jogos registados nesta competição.</p>`
                    : comp.jogos.map(j => {
                        const dataHora = j.data_hora ? new Date(j.data_hora).toLocaleDateString('pt-PT', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
                        const resultado = (j.golos_nossa !== null && j.golos_adversario !== null)
                            ? `<strong style="color:#0a3d80;">${j.golos_nossa} – ${j.golos_adversario}</strong>`
                            : `<span style="color:#94a3b8;font-size:13px;">Por jogar</span>`;
                        const estadoBadge = j.estado === 'concluido'
                            ? `<span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:20px;font-size:11px;">Concluído</span>`
                            : j.estado === 'ativo'
                            ? `<span style="background:#fef9c3;color:#ca8a04;padding:2px 8px;border-radius:20px;font-size:11px;">Em curso</span>`
                            : `<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:20px;font-size:11px;">Agendado</span>`;
                        const rivalImg = j.equipa_rival_imagem
                            ? `<img src="${j.equipa_rival_imagem}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;border:1px solid #e2e8f0;">`
                            : `<div style="width:32px;height:32px;border-radius:6px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#94a3b8;">?</div>`;
                        return `
                            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
                                ${rivalImg}
                                <div style="flex:1;">
                                    <div style="font-size:13px;font-weight:600;color:#334155;">vs ${j.equipa_rival || 'Adversário'}</div>
                                    <div style="font-size:11px;color:#94a3b8;">${dataHora}</div>
                                </div>
                                <div style="display:flex;align-items:center;gap:8px;">${resultado}${estadoBadge}</div>
                            </div>`;
                    }).join('');

                return `
                    <div class="card" style="border-radius:16px;padding:0;margin-bottom:14px;overflow:hidden;">
                        <div class="comp-header" data-id="${comp.id}" style="display:flex;align-items:center;gap:16px;padding:16px 20px;cursor:pointer;user-select:none;">
                            <img src="${comp.url_imagem || ''}" alt="${comp.nome}"
                                 style="width:52px;height:52px;border-radius:10px;object-fit:cover;border:1px solid #e2e8f0;flex-shrink:0;"
                                 onerror="this.style.display='none'">
                            <div style="flex:1;">
                                <h4 style="margin:0;font-size:15px;color:#0a3d80;">${comp.nome}</h4>
                                <span style="font-size:12px;color:#64748b;">${tipoLabel[comp.tipo] || comp.tipo} · ${comp.nparticipantes} equipas · ${comp.jogos.length} jogo(s)</span>
                            </div>
                            <button class="comp-btn-edit btn-action btn-edit" data-id="${comp.id}" onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:6px;">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Editar
                            </button>
                            <svg class="comp-chevron" data-id="${comp.id}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="transition:transform 0.2s;flex-shrink:0;"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                        <div class="comp-edit-panel" data-id="${comp.id}" style="display:none;padding:0 20px 16px;border-top:1px solid #f1f5f9;background:#fafbfc;">
                            <form class="comp-form-edit" data-id="${comp.id}" enctype="multipart/form-data" style="display:grid;grid-template-columns:1.5fr 1fr 80px 1fr auto;gap:10px;align-items:flex-end;padding-top:14px;">
                                <div class="modal-input-group" style="margin:0;">
                                    <label>Nome</label>
                                    <input type="text" name="nome_competicao" class="jogo-input" value="${comp.nome}" required>
                                </div>
                                <div class="modal-input-group" style="margin:0;">
                                    <label>Tipo</label>
                                    <select name="tipo_competicao" class="jogo-input" required>
                                        ${Object.entries(tipoLabel).map(([v,l]) => `<option value="${v}"${comp.tipo===v?' selected':''}>${l}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="modal-input-group" style="margin:0;">
                                    <label>Nº Eq.</label>
                                    <input type="number" name="num_equipas" class="jogo-input" value="${comp.nparticipantes}" min="1" required>
                                </div>
                                <div class="modal-input-group" style="margin:0;">
                                    <label>Nova Imagem</label>
                                    <div class="file-upload-wrapper">
                                        <input type="file" id="edit-img-${comp.id}" name="imagem_competicao" class="file-input-hidden" accept="image/png,image/jpeg,image/webp">
                                        <label for="edit-img-${comp.id}" class="main-input file-upload-label" style="padding:8px 10px;"><span>Opcional...</span></label>
                                    </div>
                                </div>
                                <button type="submit" class="btn-confirmar" style="white-space:nowrap;align-self:flex-end;">Guardar</button>
                            </form>
                        </div>
                        <div class="comp-jogos-panel" data-id="${comp.id}" style="display:none;padding:0 20px 16px;border-top:1px solid #f1f5f9;">
                            ${jogosHtml}
                        </div>
                    </div>`;
            }).join('');

            // Accordion — toggle jogos ao clicar no cabeçalho
            container.querySelectorAll('.comp-header').forEach(header => {
                header.addEventListener('click', () => {
                    const id = header.dataset.id;
                    const jogosPanel = container.querySelector(`.comp-jogos-panel[data-id="${id}"]`);
                    const chevron = container.querySelector(`.comp-chevron[data-id="${id}"]`);
                    const aberto = jogosPanel.style.display !== 'none';
                    jogosPanel.style.display = aberto ? 'none' : 'block';
                    chevron.style.transform = aberto ? '' : 'rotate(180deg)';
                });
            });

            // Botão editar — toggle painel de edição
            container.querySelectorAll('.comp-btn-edit').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const panel = container.querySelector(`.comp-edit-panel[data-id="${id}"]`);
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                });
            });

            // Submit edição
            container.querySelectorAll('.comp-form-edit').forEach(form => {
                const id = form.dataset.id;
                const imgInput = form.querySelector(`#edit-img-${id}`);
                const imgLabel = imgInput ? imgInput.parentElement.querySelector('.file-upload-label span') : null;
                if (imgInput && imgLabel) imgInput.onchange = e => { imgLabel.textContent = e.target.files[0]?.name || 'Opcional...'; };

                form.addEventListener('submit', async e => {
                    e.preventDefault();
                    const btn = form.querySelector('button[type=submit]');
                    btn.disabled = true; btn.textContent = 'A guardar...';
                    try {
                        const res = await fetch(`/mngr/api/competicao/${id}/editar`, { method: 'POST', body: new FormData(form) });
                        const data = await res.json();
                        if (res.ok && data.success) {
                            carregarCompeticoes(idEquipa);
                        } else {
                            mostrarAlerta(data.message || 'Erro ao guardar.', 'erro');
                            btn.disabled = false; btn.textContent = 'Guardar';
                        }
                    } catch { 
                        mostrarAlerta('Erro de ligação.', 'erro'); 
                        btn.disabled = false; btn.textContent = 'Guardar'; 
                    }
                });
            });

        } catch (err) {
            console.error('Erro ao carregar competições:', err);
        }
    }

    async function carregarPlantel(idEquipa) {
        const containerAtletas = document.getElementById('table-atletas');
        const containerTecnica = document.getElementById('table-equipa-tecnica');
        
        if (containerAtletas) containerAtletas.innerHTML = `<tr><td colspan="5" style="text-align: center;">A carregar atletas...</td></tr>`;
        if (containerTecnica) containerTecnica.innerHTML = `<tr><td colspan="4" style="text-align: center;">A carregar equipa técnica...</td></tr>`;

        try {
            const res = await fetch(`/mngr/api/equipa/${idEquipa}/plantel`);
            const dados = await res.json();

            if (!dados.success || !dados.membros) {
                if(containerAtletas) containerAtletas.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Erro ao obter plantel.</td></tr>`;
                return;
            }

            const atletas = dados.membros.filter(m => m.cargo === 'Atleta');
            const equipaTecnica = dados.membros.filter(m => m.cargo === 'Treinador' || m.cargo === 'Staff');

            if (containerTecnica) {
                if (equipaTecnica.length === 0) {
                    containerTecnica.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">Nenhum membro na equipa técnica.</td></tr>`;
                } else {
                    containerTecnica.innerHTML = "";
                    equipaTecnica.forEach(membro => {
                        const idade = membro.idade ? `${membro.idade} anos` : '-';
                        containerTecnica.innerHTML += `
                            <tr>
                                <td class="text-left">
                                    <div style="font-weight: 500;">${membro.nome_utilizador}</div>
                                    <div style="font-size: 12px;">${membro.email}</div>
                                </td>
                                <td>${idade}</td>
                                <td>${membro.cargo}</td>
                                <td style="text-align: right; display: flex; justify-content: flex-end; gap: 8px;">
                                    <button class="btn-acao-tabela btn-trocar-treinador" title="Trocar Treinador" data-id="${membro.id}" data-nome="${membro.nome_utilizador}">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="17 1 21 5 17 9"></polyline>
                                            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                            <polyline points="7 23 3 19 7 15"></polyline>
                                            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                                        </svg>
                                    </button>
                                    <button class="btn-acao-tabela btn-remover-membro" title="Eliminar" data-id="${membro.id}" data-nome="${membro.nome_utilizador}" data-cargo="${membro.cargo}">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });

                    // Ligar botões de trocar treinador
                    containerTecnica.querySelectorAll('.btn-trocar-treinador').forEach(btn => {
                        btn.addEventListener('click', () => abrirModalTrocarTreinador(btn.dataset.id, btn.dataset.nome, idEquipa));
                    });
                }
            }

            if (containerAtletas) {
                if (atletas.length === 0) {
                    containerAtletas.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">Nenhum atleta nesta equipa.</td></tr>`;
                } else {
                    containerAtletas.innerHTML = "";
                    atletas.forEach(membro => {
                        const idade = membro.idade ? `${membro.idade} anos` : '-';
                        const altura = membro.altura ? `${membro.altura}m` : '-';
                        const peso = membro.peso ? `${membro.peso}kg` : '-';
                        const badgeSubir = membro.subir_escalao
                            ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600;margin-left:6px;" title="Este atleta deve subir de escalão na próxima época">↑ Subir de Escalão</span>`
                            : '';

                        containerAtletas.innerHTML += `
                            <tr>
                                <td class="text-left">
                                    <div style="font-weight: 500; display:flex; align-items:center; flex-wrap:wrap; gap:2px;">
                                        <a href="/mngr/atleta/detalhes?id=${membro.id}&idEquipa=${idEquipa}" class="link-spa-atleta" style="color: #0284c7; text-decoration: none; font-weight: 600; transition: color 0.15s ease-in-out;">
                                            ${membro.nome_utilizador}
                                        </a>
                                        ${badgeSubir}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-muted);">${membro.email}</div>
                                </td>
                                <td>${idade}</td>
                                <td>${altura}</td>
                                <td>${peso}</td>
                                <td style="text-align: right; display: flex; justify-content: flex-end; gap: 8px;">
                                    <button class="btn-acao-tabela btn-editar-atleta" title="Editar" data-id="${membro.id}" data-nome="${membro.nome_utilizador}" data-altura="${membro.altura || ''}" data-peso="${membro.peso || ''}">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button class="btn-acao-tabela btn-mudar-escalao" title="Mudar de Escalão" data-id="${membro.id}" data-nome="${membro.nome_utilizador}">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                                        </svg>
                                    </button>
                                    <button class="btn-acao-tabela btn-remover-membro" title="Eliminar" data-id="${membro.id}" data-nome="${membro.nome_utilizador}" data-cargo="${membro.cargo}">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });

                    // Associa a navegação SPA de forma segura a cada atleta renderizado na lista
                    document.querySelectorAll('.link-spa-atleta').forEach(link => {
                        link.addEventListener('click', (e) => navegarSPA(e, link.getAttribute('href')));
                    });
                }
            }
            // Ativar botões de remover e editar membro
            ativarBotoesRemover(idEquipa);
            ativarBotoesEditarAtleta(idEquipa);
            ativarBotoesMudarEscalao(idEquipa);

        } catch (error) { console.error(error); }
    }

    function ativarBotoesRemover(idEquipa) {
        const modal = document.getElementById('modal-confirmar-remover');
        const texto = document.getElementById('confirmar-remover-texto');
        const btnConfirmar = document.getElementById('btn-confirmar-remover');
        const btnCancelar = document.getElementById('btn-cancelar-remover');
        if (!modal) return;

        let dadosPendentes = null;

        document.querySelectorAll('.btn-remover-membro').forEach(btn => {
            btn.addEventListener('click', () => {
                dadosPendentes = { id: btn.dataset.id, nome: btn.dataset.nome, cargo: btn.dataset.cargo };
                texto.textContent = `Tem a certeza que quer remover "${dadosPendentes.nome}" da equipa?`;
                modal.style.display = 'flex';
            });
        });

        btnCancelar.addEventListener('click', () => {
            modal.style.display = 'none';
            dadosPendentes = null;
        });

        btnConfirmar.addEventListener('click', async () => {
            if (!dadosPendentes) return;
            btnConfirmar.disabled = true;
            btnConfirmar.textContent = 'A remover...';

            try {
                const { id, nome, cargo } = dadosPendentes;
                const res = await fetch('/mngr/equipa/remover-membro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idEquipa, idMembro: id, cargo })
                });
                const data = await res.json();
                modal.style.display = 'none';
                dadosPendentes = null;
                if (data.success) {
                    mostrarAlerta(`${nome} foi removido da equipa.`, 'sucesso');
                    carregarPlantel(idEquipa);
                } else {
                    mostrarAlerta(data.message || 'Erro ao remover membro.', 'erro');
                }
            } catch {
                mostrarAlerta('Erro de ligação ao servidor.', 'erro');
            } finally {
                btnConfirmar.disabled = false;
                btnConfirmar.textContent = 'Sim, remover';
            }
        });
    }

    function ativarBotoesEditarAtleta(idEquipa) {
        const modal = document.getElementById('modal-editar-atleta');
        const inputId = document.getElementById('editar-atleta-id');
        const inputNome = document.getElementById('editar-atleta-nome');
        const inputAltura = document.getElementById('editar-atleta-altura');
        const inputPeso = document.getElementById('editar-atleta-peso');
        const btnFechar = document.getElementById('btn-fechar-editar-atleta');
        const form = document.getElementById('form-editar-atleta');
        if (!modal) return;

        document.querySelectorAll('.btn-editar-atleta').forEach(btn => {
            btn.addEventListener('click', () => {
                inputId.value = btn.dataset.id;
                inputNome.textContent = btn.dataset.nome;
                inputAltura.value = btn.dataset.altura || '';
                inputPeso.value = btn.dataset.peso || '';
                modal.style.display = 'flex';
            });
        });

        btnFechar.addEventListener('click', () => { modal.style.display = 'none'; });
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = inputId.value;
            const altura = inputAltura.value ? parseFloat(inputAltura.value) : null;
            const peso = inputPeso.value ? parseFloat(inputPeso.value) : null;
            const btnSubmit = form.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'A guardar...';
            try {
                const res = await fetch(`/mngr/api/atleta/editar/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ altura, peso })
                });
                const data = await res.json();
                modal.style.display = 'none';
                if (data.success) {
                    mostrarAlerta('Dados do atleta atualizados com sucesso.', 'sucesso');
                    carregarPlantel(idEquipa);
                } else {
                    mostrarAlerta(data.message || 'Erro ao guardar alterações.', 'erro');
                }
            } catch {
                mostrarAlerta('Erro de ligação ao servidor.', 'erro');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Guardar';
            }
        });
    }

    function ativarBotoesMudarEscalao(idEquipa) {
        const modal = document.getElementById('modal-mudar-escalao');
        const texto = document.getElementById('mudar-escalao-texto');
        const select = document.getElementById('select-equipa-destino');
        const aviso = document.getElementById('mudar-escalao-aviso');
        const form = document.getElementById('form-mudar-escalao');
        const btnFechar = document.getElementById('btn-fechar-mudar-escalao');
        const btnCancelar = document.getElementById('btn-cancelar-mudar-escalao');
        if (!modal) return;

        let atletaAtual = null;

        const fecharModal = () => { modal.style.display = 'none'; atletaAtual = null; };

        document.querySelectorAll('.btn-mudar-escalao').forEach(btn => {
            btn.addEventListener('click', async () => {
                atletaAtual = { id: btn.dataset.id, nome: btn.dataset.nome };
                texto.textContent = atletaAtual.nome;
                select.innerHTML = '<option value="">A verificar requisitos...</option>';
                aviso.style.display = 'none';
                modal.style.display = 'flex';

                try {
                    const res = await fetch(`/mngr/api/equipa/${idEquipa}/outras-equipas-clube?id_atleta=${atletaAtual.id}`);
                    const data = await res.json();
                    if (data.success && data.equipas.length > 0) {
                        select.innerHTML = '<option value="">Selecionar equipa...</option>' +
                            data.equipas.map(eq => {
                                const idades = (eq.idade_min || eq.idade_max)
                                    ? ` · ${eq.idade_min ?? '?'}-${eq.idade_max ?? '?'} anos`
                                    : '';
                                return `<option value="${eq.id}">${eq.nome} — ${eq.nome_escalao || 'Sem escalão'}${idades}</option>`;
                            }).join('');
                    } else {
                        select.innerHTML = '<option value="">Nenhuma equipa disponível</option>';
                        aviso.style.display = 'block';
                    }
                } catch {
                    select.innerHTML = '<option value="">Erro ao carregar</option>';
                }
            });
        });

        btnFechar?.addEventListener('click', fecharModal);
        btnCancelar.addEventListener('click', fecharModal);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!atletaAtual || !select.value) return;
            const btnSubmit = form.querySelector('[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'A mover...';
            try {
                const res = await fetch(`/mngr/api/equipa/${idEquipa}/mudar-escalao`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_atleta: atletaAtual.id, id_equipa_destino: select.value })
                });
                const data = await res.json();
                fecharModal();
                if (data.success) {
                    mostrarAlerta('Atleta movido de escalão com sucesso.', 'sucesso');
                    carregarPlantel(idEquipa);
                } else {
                    mostrarAlerta(data.message || 'Erro ao mover atleta.', 'erro');
                }
            } catch {
                mostrarAlerta('Erro de ligação ao servidor.', 'erro');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Confirmar';
            }
        });
    }

    setTimeout(() => {
        const btnAddMember = document.getElementById('btn-add-member');
        const memberModal = document.getElementById('add-member-modal');
        const closeMemberModal = document.getElementById('close-member-modal');
        const tabNewAccount = document.getElementById('tab-new-account');
        const tabInvite = document.getElementById('tab-invite');
        const formNewAccount = document.getElementById('form-new-account');
        const formInvite = document.getElementById('form-invite');
        const selectCargoNew = document.getElementById('new-member-role');
        const selectCargoInvite = document.getElementById('invite-member-role');
        const campoNascimento = document.getElementById('campo-nascimento-atleta');
        const inputNascimento = document.getElementById('new-member-nascimento');

        if (selectCargoNew && campoNascimento) {
            selectCargoNew.addEventListener('change', () => {
                const isAtleta = selectCargoNew.value === 'Atleta';
                campoNascimento.style.display = isAtleta ? 'block' : 'none';
                if (inputNascimento) inputNascimento.required = isAtleta;
            });
        }

        function abrirModalMembro(cargoPredefinido) {
            if (!memberModal) return;
            if (formNewAccount) formNewAccount.reset();
            if (formInvite) formInvite.reset();
            if (campoNascimento) { campoNascimento.style.display = 'none'; if (inputNascimento) inputNascimento.required = false; }

            memberModal.style.display = 'flex';
            if (selectCargoNew && cargoPredefinido) {
                selectCargoNew.value = cargoPredefinido;
                const isAtleta = cargoPredefinido === 'Atleta';
                if (campoNascimento) campoNascimento.style.display = isAtleta ? 'block' : 'none';
                if (inputNascimento) inputNascimento.required = isAtleta;
            }
            if (selectCargoInvite && cargoPredefinido) selectCargoInvite.value = cargoPredefinido;
        }

        if (btnAddMember) btnAddMember.addEventListener('click', () => abrirModalMembro('')); 
        if (closeMemberModal) closeMemberModal.addEventListener('click', () => { memberModal.style.display = 'none'; });

        if (tabNewAccount && tabInvite && formNewAccount && formInvite) {
            tabNewAccount.addEventListener('click', () => {
                formNewAccount.style.display = 'flex';
                formInvite.style.display = 'none';
                tabNewAccount.classList.add('btn-tab-active');
                tabNewAccount.classList.remove('btn-tab-inactive');
                tabInvite.classList.add('btn-tab-inactive');
                tabInvite.classList.remove('btn-tab-active');
            });

            tabInvite.addEventListener('click', () => {
                formInvite.style.display = 'flex';
                formNewAccount.style.display = 'none';
                tabInvite.classList.add('btn-tab-active');
                tabInvite.classList.remove('btn-tab-inactive');
                tabNewAccount.classList.add('btn-tab-inactive');
                tabNewAccount.classList.remove('btn-tab-active');
            });
        }

        if (formNewAccount) {
            formNewAccount.addEventListener('submit', async (e) => {
                e.preventDefault();
                const idEquipa = obterIdEquipaDoURL();
                const nome = document.getElementById('new-member-name').value.trim();
                const email = document.getElementById('new-member-email').value.trim();
                const password = document.getElementById('new-member-password').value;
                const cargo = document.getElementById('new-member-role').value;
                const data_nascimento = inputNascimento ? inputNascimento.value : null;

                const response = await fetch('/mngr/equipa/criar-membro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idEquipa, nome, email, password, cargo, data_nascimento })
                });
                const data = await response.json();

                if (data.success) {
                    if (memberModal) memberModal.style.display = 'none';
                    formNewAccount.reset();
                    if (campoNascimento) { campoNascimento.style.display = 'none'; if (inputNascimento) inputNascimento.required = false; }
                    mostrarAlerta(`A conta de ${nome} foi criada e associada à equipa!`, 'sucesso');
                    carregarPlantel(obterIdEquipaDoURL());
                } else {
                    mostrarAlerta(data.message || 'Erro ao criar membro.', 'erro');
                }
            });
        }

        if (formInvite) {
            formInvite.addEventListener('submit', async (e) => {
                e.preventDefault();
                const idEquipa = obterIdEquipaDoURL();
                const email = document.getElementById('invite-member-email').value.trim();
                const cargo = document.getElementById('invite-member-role').value;

                const response = await fetch('/mngr/equipa/convidar-membro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idEquipa, email, cargo })
                });
                const data = await response.json();

                if (data.success) {
                    if (memberModal) memberModal.style.display = 'none';
                    formInvite.reset();
                    mostrarAlerta(`O convite foi enviado para ${email} com sucesso!`, 'sucesso');
                    carregarPlantel(obterIdEquipaDoURL());
                } else {
                    mostrarAlerta(data.message || 'Erro ao enviar convite.', 'erro');
                }
            });
        }
    }, 100);

    setTimeout(inicializarPaginaDetalhes, 0);

    window.obterIdEquipaDoURL = obterIdEquipaDoURL;
    window.atualizarDadosEquipaInterface = inicializarPaginaDetalhes;

    const btnEditarEquipa = document.getElementById('btn-edit-team');
    const modalEditar = document.getElementById('modal-editar-equipa');
    const btnFecharEditarX = document.getElementById('btn-fechar-editar');
    const formEditarEquipa = document.getElementById('form-editar-equipa');
    const inputNome = document.getElementById('edit-nome-equipa');
    const inputEpoca = document.getElementById('edit-epoca-equipa');

    function fecharModalEditar() {
        if (!modalEditar) return;
        modalEditar.classList.add('modal-escondido');
        modalEditar.style.display = 'none';
        if (formEditarEquipa) formEditarEquipa.reset();
    }

    if (btnEditarEquipa && modalEditar) {
        btnEditarEquipa.addEventListener('click', () => {
            const elPageTitle = document.getElementById('page-title');
            const seletorEpoca = document.getElementById('season-selector');
            if (inputNome && elPageTitle) inputNome.value = elPageTitle.textContent;
            if (inputEpoca && seletorEpoca) inputEpoca.value = seletorEpoca.value;
            modalEditar.classList.remove('modal-escondido');
            modalEditar.style.display = 'flex';
        });
    }

    if (btnFecharEditarX) btnFecharEditarX.addEventListener('click', fecharModalEditar);

    if (formEditarEquipa) {
        formEditarEquipa.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idEquipa = obterIdEquipaDoURL();
            if (!idEquipa) return;

            const formData = new FormData(formEditarEquipa);
            const resposta = await fetch(`/mngr/equipas/editar/${idEquipa}`, { method: 'POST', body: formData });

            if (resposta.ok) {
                mostrarAlerta('Informações da equipa atualizadas com sucesso!', 'sucesso');
                fecharModalEditar();
                await inicializarPaginaDetalhes();
            }
        });
    }

    // --- FORM CRIAR COMPETIÇÃO ---
    // --- FORM CRIAR COMPETIÇÃO ---
    const formAddCompeticao = document.getElementById('form-add-competicao');
    const compIdEquipa = document.getElementById('comp-id-equipa');
    const compImagem = document.getElementById('comp-imagem');
    const compImagemLabel = compImagem ? compImagem.parentElement.querySelector('.file-upload-label span') : null;
    
    // 🌟 SELETORES PARA A LÓGICA DA FASE INICIAL
    const compTipo = document.getElementById('comp-tipo');
    const grupoFaseInicial = document.getElementById('grupo-fase-inicial');
    const compFase = document.getElementById('comp-fase');
    const opcaoFaseGrupos = document.getElementById('opcao-fase-grupos'); // Seletor adicionado

    if (compIdEquipa) compIdEquipa.value = obterIdEquipaDoURL() || '';

    if (compImagem && compImagemLabel) {
        compImagem.onchange = (e) => {
            compImagemLabel.textContent = e.target.files[0]?.name || 'Selecionar...';
        };
    }

    // 🌟 LÓGICA DINÂMICA ATUALIZADA: Tratar "Fase de Grupos" mediante o formato
    if (compTipo && grupoFaseInicial && compFase) {
        compTipo.addEventListener('change', function() {
            const valor = this.value;
            
            if (valor === 'eliminatoria' || valor === 'grupo_eliminatorias') {
                grupoFaseInicial.style.display = 'block';
                compFase.required = true;

                if (valor === 'eliminatoria') {
                    // Esconder a "Fase de Grupos" e saltar para a primeira eliminatória realista
                    if (opcaoFaseGrupos) opcaoFaseGrupos.style.display = 'none';
                    if (compFase.value === 'grupos' || !compFase.value) {
                        compFase.value = '128'; // Define 32 avos por defeito para não ficar com Grupos selecionado
                    }
                } else if (valor === 'grupo_eliminatorias') {
                    // Mostrar novamente a "Fase de Grupos" porque este formato a inclui
                    if (opcaoFaseGrupos) opcaoFaseGrupos.style.display = 'block';
                    compFase.value = 'grupos'; // Define Fase de Grupos por defeito
                }

            } else {
                // Formatos normais (Liga, Jogo Único) escondem totalmente a combo
                grupoFaseInicial.style.display = 'none';
                compFase.required = false;
                compFase.value = '';
            }
        });
    }

    if (formAddCompeticao) {
        formAddCompeticao.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(formAddCompeticao);
            if (!fd.get('imagem_competicao') || fd.get('imagem_competicao').size === 0) {
                mostrarAlerta('A imagem é obrigatória.', 'aviso');
                return;
            }
            const btn = formAddCompeticao.querySelector('button[type=submit]');
            btn.disabled = true;
            btn.textContent = 'A guardar...';
            try {
                const res = await fetch('/mngr/criar-competicao', { method: 'POST', body: fd });
                const data = await res.json();
                if (res.ok && data.success) {
                    mostrarAlerta(`Competição "${data.competicao.nome}" criada com sucesso!`, 'sucesso');
                    formAddCompeticao.reset();
                    if (compImagemLabel) compImagemLabel.textContent = 'Selecionar...';
                    
                    // 🌟 Resetar a visibilidade do campo após o submit com sucesso
                    if (grupoFaseInicial) grupoFaseInicial.style.display = 'none';
                    
                    const idEquipa = obterIdEquipaDoURL();
                    if (idEquipa) carregarCompeticoes(idEquipa);
                } else {
                    mostrarAlerta(data.message || 'Erro ao criar competição.', 'erro');
                }
            } catch {
                mostrarAlerta('Erro de ligação ao servidor.', 'erro');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Criar Competição';
            }
        });
    }
    // === TROCAR TREINADOR ===
    const modalTrocar = document.getElementById('modal-trocar-treinador');
    const btnFecharTrocar = document.getElementById('btn-fechar-trocar-treinador');
    const formTrocar = document.getElementById('form-trocar-treinador');
    const selectEquipaDestino = document.getElementById('select-equipa-destino-treinador');
    const labelTreinadorAtual = document.getElementById('trocar-treinador-atual');
    const inputIdTreinador = document.getElementById('trocar-treinador-id');

    if (btnFecharTrocar) btnFecharTrocar.addEventListener('click', () => { if (modalTrocar) modalTrocar.style.display = 'none'; });

    async function abrirModalTrocarTreinador(idTreinador, nomeTreinador, idEquipa) {
        if (!modalTrocar) return;
        if (labelTreinadorAtual) labelTreinadorAtual.textContent = `Treinador: ${nomeTreinador}`;
        if (inputIdTreinador) inputIdTreinador.value = idTreinador;
        if (selectEquipaDestino) selectEquipaDestino.innerHTML = '<option value="" disabled selected>A carregar...</option>';
        modalTrocar.style.display = 'flex';

        try {
            const res = await fetch(`/mngr/api/equipa/${idEquipa}/equipas-mesma-modalidade`);
            const data = await res.json();
            if (data.success && data.equipas.length > 0) {
                selectEquipaDestino.innerHTML = '<option value="" disabled selected>Escolha a equipa destino...</option>';
                data.equipas.forEach(eq => {
                    selectEquipaDestino.innerHTML += `<option value="${eq.id}">${eq.nome}</option>`;
                });
            } else {
                selectEquipaDestino.innerHTML = '<option value="" disabled selected>Sem outras equipas da mesma modalidade</option>';
            }
        } catch {
            selectEquipaDestino.innerHTML = '<option value="" disabled selected>Erro ao carregar equipas</option>';
        }
    }

    if (formTrocar) {
        formTrocar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idEquipa = obterIdEquipaDoURL();
            const idTreinador = inputIdTreinador.value;
            const idDestino = selectEquipaDestino.value;
            if (!idDestino) return;

            const btn = formTrocar.querySelector('button[type=submit]');
            btn.disabled = true;
            btn.textContent = 'A mover...';

            try {
                const res = await fetch('/mngr/equipa/mover-treinador', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idEquipaOrigem: idEquipa, idTreinador, idEquipaDestino: idDestino })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    modalTrocar.style.display = 'none';
                    mostrarAlerta('Treinador movido com sucesso!', 'sucesso');
                    carregarPlantel(idEquipa);
                } else {
                    mostrarAlerta(data.message || 'Erro ao mover treinador.', 'erro');
                }
            } catch {
                mostrarAlerta('Erro ao comunicar com o servidor.', 'erro');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Confirmar Mudança';
            }
        });
    }
})();