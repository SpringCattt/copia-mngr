(function() {
    setTimeout(async function inicializarAdminUtilizadores() {
        console.log("=== [SPA] Módulo de Gestão Admin Iniciado ===");

        // --- NAVEGAÇÃO POR QUERY PARAM (?tab=) ---
        const sections = document.querySelectorAll('.admin-section');
        const sectionMap = {
            'dashboard':    'sec-dashboard',
            'utilizadores': 'sec-utilizadores',
            'clubes':       'sec-clubes',
            'desportos':    'sec-desportos',
            'escaloes':     'sec-escaloes'
        };
        const tabAtiva = new URLSearchParams(window.location.search).get('tab') || 'dashboard';
        sections.forEach(s => s.classList.remove('active'));
        const sectionId = sectionMap[tabAtiva];
        if (sectionId) document.getElementById(sectionId)?.classList.add('active');

        const titulosSecao = {
            'dashboard':    'Dashboard',
            'utilizadores': 'Utilizadores',
            'clubes':       'Clubes Registados',
            'desportos':    'Desportos',
            'escaloes':     'Escalões'
        };
        const elTitulo = document.querySelector('.cal-mngr-title');
        if (elTitulo) elTitulo.textContent = titulosSecao[tabAtiva] || 'Gestão do Sistema';

        // --- VARIÁVEIS DE ESTADO ---
        let utilizadoresData = [];
        let clubesData = [];
        let ordemAscendente = true;

        // ==========================================
        // 1. GESTÃO DE UTILIZADORES E ORDENAÇÃO
        // ==========================================
        async function carregarUtilizadores() {
            try {
                const res = await fetch('/mngr/api/admin/utilizadores');
                const data = await res.json();
                if (data.success) {
                    utilizadoresData = data.utilizadores;
                    renderizarUtilizadores();
                }
            } catch (err) {
                console.error('Erro ao buscar utilizadores:', err);
            }
        }

        window.ordenarUtilizadores = function() {
            renderizarUtilizadores();
        };

        function renderizarUtilizadores() {
            const tbody = document.getElementById('tbody-utilizadores');
            const termoPesquisa = (document.getElementById('search-users')?.value || '').toLowerCase();
            const filtroRole = document.getElementById('filter-role')?.value || 'todos';
            const filtroEstado = document.getElementById('filter-estado-users')?.value || 'todos';
            const ordenacao = document.getElementById('orden-user')?.value || 'alfabetica';

            tbody.innerHTML = '';

            let filtrados = utilizadoresData.filter(u => {
                const nome = (u.nome || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                const role = (u.tipo_utilizador || '').toLowerCase();

                const isAtivo = u.ativo === true;
                const textoEstado = isAtivo ? 'ativo' : 'inativo';

                const passaPesquisa = nome.includes(termoPesquisa) || email.includes(termoPesquisa);
                const passaRole = filtroRole === 'todos' || role === filtroRole;
                const passaEstado = filtroEstado === 'todos' || textoEstado === filtroEstado;
                
                return passaPesquisa && passaRole && passaEstado;
            });

            filtrados.sort((a, b) => {
                let resultadoComparacao = 0;

                if (ordenacao === 'alfabetica') {
                    resultadoComparacao = (a.nome || '').localeCompare(b.nome || '');
                } else if (ordenacao === 'rol') {
                    resultadoComparacao = (a.tipo_utilizador || '').localeCompare(b.tipo_utilizador || '');
                } else if (ordenacao === 'data') {
                    resultadoComparacao = b.id - a.id; 
                } else if (ordenacao === 'estado') {
                    if (a.ativo === b.ativo) resultadoComparacao = 0;
                    else resultadoComparacao = a.ativo ? -1 : 1; 
                } else if (ordenacao === 'tempo') {
                    const tempoA = parseInt(a.tempo_uso_minutos) || 0;
                    const tempoB = parseInt(b.tempo_uso_minutos) || 0;
                    resultadoComparacao = tempoB - tempoA; 
                }

                return ordemAscendente ? resultadoComparacao : -resultadoComparacao;
            });

            if (filtrados.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum utilizador encontrado com estes filtros.</td></tr>`;
                return;
            }

            filtrados.forEach(u => {
                const isAtivo = u.ativo === true;
                const roleLower = u.tipo_utilizador ? u.tipo_utilizador.toLowerCase() : 'desconhecido';
                const tempoUso = u.tempo_uso_minutos ? `${u.tempo_uso_minutos} min` : '0 min';
                
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${u.nome || 'Sem nome'}</strong></td>
                        <td>${u.email || 'Sem email'}</td>
                        <td><span class="badge-role role-${roleLower}">${u.tipo_utilizador || 'N/A'}</span></td>
                        <td><strong style="color: #6366f1;">${tempoUso}</strong></td>
                        <td><span class="badge-status status-${isAtivo ? 'ativo' : 'inativo'}">${isAtivo ? 'Ativo' : 'Inativo'}</span></td>
                        <td>
                            <button class="btn-action btn-edit" style="background:#0ea5e9; margin-right:4px;" onclick="window.abrirModalVerUtilizador(${u.id}, '${u.nome}', '${roleLower}')">Perfil</button>
                            <button class="btn-action btn-edit" onclick="window.abrirModalEditarUtilizador(${u.id})">Conta</button>
                            <button class="btn-action btn-toggle ${isAtivo ? '' : 'ativar'}" onclick="window.toggleEstadoUtilizador(${u.id}, ${isAtivo})">
                                ${isAtivo ? 'Desativar' : 'Ativar'}
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        document.getElementById('search-users')?.addEventListener('input', renderizarUtilizadores);
        document.getElementById('filter-role')?.addEventListener('change', renderizarUtilizadores);
        document.getElementById('filter-estado-users')?.addEventListener('change', renderizarUtilizadores);
        document.getElementById('orden-user')?.addEventListener('change', renderizarUtilizadores);

        document.getElementById('btn-toggle-ordem')?.addEventListener('click', function() {
            ordemAscendente = !ordemAscendente;
            const icone = this.querySelector('svg');
            if (icone) icone.style.transform = ordemAscendente ? 'rotate(0deg)' : 'rotate(180deg)';
            renderizarUtilizadores();
        });

        // ==========================================
        // Funções de Ação de Utilizadores
        // ==========================================
        window.toggleEstadoUtilizador = async function(id, isAtivoAtual) {
            const confirmado = await window.mostrarConfirmacao(`Tem a certeza que deseja ${isAtivoAtual ? 'desativar' : 'ativar'} este utilizador?`);
            if(!confirmado) return;
            
            try {
                const res = await fetch('/mngr/api/admin/utilizadores/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id, ativo: !isAtivoAtual }) 
                });
                const data = await res.json();
                if (data.success) { 
                    mostrarAlerta(`Utilizador ${!isAtivoAtual ? 'ativado' : 'desativado'} com sucesso!`, 'sucesso');
                    await carregarUtilizadores(); 
                } 
                else { mostrarAlerta('Erro ao alterar o estado do utilizador.'); }
            } catch (err) { mostrarAlerta('Erro na comunicação com o servidor.'); }
        };

        window.abrirModalEditarUtilizador = function(id) {
            const u = utilizadoresData.find(user => String(user.id) === String(id));
            if (!u) return;
            document.getElementById('edit-user-id').value = u.id;
            document.getElementById('edit-user-nome').value = u.nome || '';
            document.getElementById('edit-user-email').value = u.email || '';
            document.getElementById('edit-user-tipo').value = (u.tipo_utilizador || 'atleta').toLowerCase();
            
            const modal = document.getElementById('modal-editar-utilizador');
            if(modal) modal.classList.remove('cal-mngr-hidden');
        };

        const formEditarUser = document.getElementById('form-editar-utilizador');
        if (formEditarUser) {
            formEditarUser.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('edit-user-id').value;
                const payload = {
                    nome: document.getElementById('edit-user-nome').value,
                    email: document.getElementById('edit-user-email').value,
                    tipo_utilizador: document.getElementById('edit-user-tipo').value
                };

                try {
                    const res = await fetch(`/mngr/api/admin/utilizadores/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (data.success) {
                        document.getElementById('modal-editar-utilizador').classList.add('cal-mngr-hidden');
                        mostrarAlerta('Utilizador atualizado com sucesso!', 'sucesso');
                        await carregarUtilizadores(); 
                    } else { mostrarAlerta(`Erro: ${data.error}`); }
                } catch (err) { mostrarAlerta('Erro na comunicação com o servidor.'); }
            });
        }

        // ==========================================
        // 2. GESTÃO DE CLUBES
        // ==========================================
        async function carregarClubes() {
            const tbody = document.getElementById('tbody-clubes');
            try {
                const res = await fetch('/mngr/api/admin/clubes');
                const data = await res.json();
                if (data.success) {
                    clubesData = data.clubes;
                    preencherFiltroDesportos(clubesData);
                    renderizarClubes();
                } else {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#dc2626; font-weight:bold; padding:20px;">Servidor: ${data.error}</td></tr>`;
                }
            } catch (err) {
                console.error('Erro ao buscar clubes:', err);
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#dc2626; font-weight:bold; padding:20px;">Falha de comunicação com o backend.</td></tr>`;
            }
        }

        function preencherFiltroDesportos(clubes) {
            const select = document.getElementById('filter-desporto-clubes');
            if (!select) return;
            const desportosUnicos = new Set();
            clubes.forEach(c => {
                c.equipas.forEach(eq => eq.desporto && desportosUnicos.add(eq.desporto));
                c.escaloes.forEach(esc => esc.desporto && desportosUnicos.add(esc.desporto));
            });
            select.innerHTML = '<option value="todos">Todas as Modalidades</option>';
            Array.from(desportosUnicos).sort().forEach(d => { select.innerHTML += `<option value="${d}">${d}</option>`; });
        }

        function renderizarClubes() {
            const tbody = document.getElementById('tbody-clubes');
            const termoPesquisa = (document.getElementById('search-clubs')?.value || '').toLowerCase();
            const filtroDesporto = document.getElementById('filter-desporto-clubes')?.value || 'todos';
            const filtroGestor = (document.getElementById('filtro-clube-gestor')?.value || '').toLowerCase();
            const filtroEstado = document.getElementById('filtro-clube-ativo')?.value || 'todos';

            tbody.innerHTML = '';

            const filtrados = clubesData.filter(c => {
                const local = `${c.regiao || ''} ${c.pais || ''}`.toLowerCase();
                const passaPesquisa = (c.nome || '').toLowerCase().includes(termoPesquisa) || local.includes(termoPesquisa);
                
                let passaDesporto = true;
                if (filtroDesporto !== 'todos') {
                    const temEquipa = c.equipas.some(eq => eq.desporto === filtroDesporto);
                    const temEscalao = c.escaloes.some(esc => esc.desporto === filtroDesporto);
                    passaDesporto = temEquipa || temEscalao;
                }

                const gestorNome = (c.gestor || '').toLowerCase();
                const passaGestor = gestorNome.includes(filtroGestor);

                let passaEstado = true;
                if (filtroEstado !== 'todos') {
                    const isAtivoStr = c.ativo === true ? 'true' : 'false';
                    passaEstado = (isAtivoStr === filtroEstado);
                }

                return passaPesquisa && passaDesporto && passaGestor && passaEstado;
            });

            if (filtrados.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum clube encontrado com estes filtros.</td></tr>`;
                return;
            }

            filtrados.forEach(c => {
                const isAtivo = c.ativo === true;
                const gestorStr = c.gestor ? c.gestor : '<span style="color:gray; font-style:italic;">Sem Gestor atribuído</span>';
                
                let escaloesHtml = '<div style="margin-bottom: 6px;"><strong style="font-size:11px; color:#64748b;">ESCALÕES:</strong><br>';
                if (c.escaloes && c.escaloes.length > 0) {
                    escaloesHtml += c.escaloes.map(esc => `<span style="display:inline-block; background:#f1f5f9; border: 1px solid #cbd5e1; padding:2px 6px; border-radius:4px; margin:2px 2px 2px 0; font-size:11px;">${esc.nome} <b style="color:#64748b; font-weight:normal;">(${esc.desporto || 'N/A'})</b></span>`).join('');
                } else { escaloesHtml += '<span style="color:gray; font-size:11px; font-style:italic;">Nenhum registado</span>'; }
                escaloesHtml += '</div>';

                let equipasHtml = '<div><strong style="font-size:11px; color:#64748b;">EQUIPAS:</strong><br>';
                if (c.equipas && c.equipas.length > 0) {
                    equipasHtml += c.equipas.map(eq => `<span style="display:inline-block; background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; margin:2px 2px 2px 0; font-size:11px; font-weight:bold;">${eq.nome} <span style="color:#0284c7; font-weight:normal">(${eq.desporto || 'N/A'})</span></span>`).join('');
                } else { equipasHtml += '<span style="color:gray; font-size:11px; font-style:italic;">Nenhuma registada</span>'; }
                equipasHtml += '</div>';

                tbody.innerHTML += `
                    <tr>
                        <td><strong style="font-size:14px; color:#1e3a8a;">${c.nome || 'Sem nome'}</strong></td>
                        <td>${c.regiao || ''}, ${c.pais || ''}</td>
                        <td>${gestorStr}</td>
                        <td>
                            <div style="display:flex; flex-direction:column; padding:4px 0;">
                                ${escaloesHtml}
                                ${equipasHtml}
                            </div>
                        </td>
                        <td><span class="badge-status status-${isAtivo ? 'ativo' : 'inativo'}">${isAtivo ? 'Ativo' : 'Inativo'}</span></td>
                        <td>
                            <button class="btn-action btn-edit" onclick="window.abrirModalEditarClube(${c.id})">Editar</button>
                            <button class="btn-action btn-toggle ${isAtivo ? '' : 'ativar'}" onclick="window.toggleEstadoClube(${c.id}, ${isAtivo})">
                                ${isAtivo ? 'Desativar' : 'Ativar'}
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        document.getElementById('search-clubs')?.addEventListener('input', renderizarClubes);
        document.getElementById('filtro-clube-gestor')?.addEventListener('input', renderizarClubes);
        document.getElementById('filter-desporto-clubes')?.addEventListener('change', renderizarClubes);
        document.getElementById('filtro-clube-ativo')?.addEventListener('change', renderizarClubes);

        window.toggleEstadoClube = async function(id, isAtivoAtual) {
            const confirmado = await window.mostrarConfirmacao(`Tem a certeza que deseja ${isAtivoAtual ? 'desativar' : 'ativar'} este clube? O gestor associado não poderá fazer operações.`);
            if(!confirmado) return;
            
            try {
                const res = await fetch('/mngr/api/admin/clubes/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id, ativo: !isAtivoAtual })
                });
                const data = await res.json();
                if (data.success) { 
                    mostrarAlerta(`Clube ${!isAtivoAtual ? 'ativado' : 'desativado'} com sucesso!`, 'sucesso');
                    await carregarClubes(); 
                }
            } catch (err) { mostrarAlerta('Erro na comunicação com o servidor.'); }
        };

        // ==========================================
        // 3. DASHBOARD E ESTATÍSTICAS
        // ==========================================
        async function carregarDashboard() {
            try {
                const res = await fetch('/mngr/api/admin/estatisticas');
                const data = await res.json();
                
                if (data.success) {
                    const mapping = {
                        'stat-atletas': data.stats.totalAtletas,
                        'stat-treinadores': data.stats.totalTreinadores,
                        'stat-gestores': data.stats.totalGestores,
                        'stat-clubes': data.stats.totalClubes,
                        'stat-tempo-atleta': data.stats.tempoAtletas + ' min',
                        'stat-tempo-treinador': data.stats.tempoTreinadores + ' min',
                        'stat-tempo-gestor': data.stats.tempoGestores + ' min'
                    };

                    Object.keys(mapping).forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.innerText = mapping[id] || 0;
                    });
                }
            } catch (err) {
                console.error("Erro ao carregar estatísticas do admin:", err);
            }
        }

        // --- FUNÇÕES DOS MODAIS ---
        window.abrirModalEditarClube = function(id) {
            const c = clubesData.find(clube => String(clube.id) === String(id));
            if (!c) return;

            document.getElementById('edit-clube-nome').innerText = c.nome;
            const listaEquipas = document.getElementById('lista-edit-equipas');
            const listaEscaloes = document.getElementById('lista-edit-escaloes');

            listaEquipas.innerHTML = '';
            listaEscaloes.innerHTML = '';

            if (c.equipas && c.equipas.length > 0) {
                c.equipas.forEach(eq => {
                    listaEquipas.innerHTML += `
                        <li style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 8px 12px; border-radius: 4px; margin-bottom: 5px; font-size: 13px;">
                            <span><strong>${eq.nome}</strong> <span style="color:#64748b;">(${eq.desporto || 'N/A'})</span></span>
                            <button class="btn-action btn-toggle" style="margin:0; padding: 4px 8px;" onclick="window.desativarEquipa(${eq.id}, ${c.id})">Remover</button>
                        </li>
                    `;
                });
            } else { listaEquipas.innerHTML = '<li style="color: #cbd5e1; font-style: italic; font-size: 13px;">Nenhuma equipa ativa.</li>'; }

            if (c.escaloes && c.escaloes.length > 0) {
                c.escaloes.forEach(esc => {
                    listaEscaloes.innerHTML += `
                        <li style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 8px 12px; border-radius: 4px; margin-bottom: 5px; font-size: 13px;">
                            <span><strong>${esc.nome}</strong> <span style="color:#64748b;">(${esc.desporto || 'N/A'})</span></span>
                            <button class="btn-action btn-toggle" style="margin:0; padding: 4px 8px;" onclick="window.desativarEscalao(${esc.id}, ${c.id})">Remover</button>
                        </li>
                    `;
                });
            } else { listaEscaloes.innerHTML = '<li style="color: #cbd5e1; font-style: italic; font-size: 13px;">Nenhum escalão ativo.</li>'; }

            document.getElementById('modal-editar-clube').classList.remove('cal-mngr-hidden');
        };

        window.desativarEquipa = async function(idEquipa, idClube) {
            const conf = await window.mostrarConfirmacao('Tem a certeza que deseja remover esta equipa?');
            if(!conf) return;

            try {
                const res = await fetch(`/mngr/api/admin/equipas/${idEquipa}/desativar`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    mostrarAlerta('Equipa removida com sucesso!', 'sucesso');
                    await carregarClubes();
                    window.abrirModalEditarClube(idClube); 
                } else { mostrarAlerta('Erro ao remover equipa.'); }
            } catch(e) { mostrarAlerta('Falha de comunicação.'); }
        };

        window.desativarEscalao = async function(idEscalao, idClube) {
            const conf = await window.mostrarConfirmacao('Tem a certeza que deseja remover este escalão?');
            if(!conf) return;

            try {
                const res = await fetch(`/mngr/api/admin/escaloes/${idEscalao}/desativar`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    mostrarAlerta('Escalão removido com sucesso!', 'sucesso');
                    await carregarClubes(); 
                    window.abrirModalEditarClube(idClube); 
                } else { mostrarAlerta('Erro ao remover escalão.'); }
            } catch(e) { mostrarAlerta('Falha de comunicação.'); }
        };

        window.abrirModalVerUtilizador = async function(id, nome, tipo) {
            document.getElementById('detalhes-id-utilizador').value = id;
            document.getElementById('detalhes-tipo-utilizador').value = tipo;
            document.getElementById('detalhes-user-nome').innerText = `${nome} (${tipo})`;
            
            const divCampos = document.getElementById('campos-dinamicos-perfil');
            const listaAssociacoes = document.getElementById('lista-associacoes-user');
            
            divCampos.innerHTML = '<p style="color:#0a3d80; grid-column: span 2; font-weight:bold; text-align:center;">A carregar dados...</p>';
            listaAssociacoes.innerHTML = '<li style="color:#64748b;">A carregar...</li>';
            
            document.getElementById('modal-ver-utilizador').classList.remove('cal-mngr-hidden');

            try {
                const res = await fetch(`/mngr/api/admin/utilizadores/${id}/detalhes?tipo=${tipo}`);
                const data = await res.json();
                
                if (data.success) {
                    const perf = data.perfil || {};
                    const assoc = data.associacoes || [];
                    
                    listaAssociacoes.innerHTML = '';
                    if (assoc.length === 0) {
                        listaAssociacoes.innerHTML = '<li style="font-style:italic; color:#94a3b8;">Nenhuma equipa ou clube associado.</li>';
                    } else {
                        assoc.forEach(a => {
                            if(tipo === 'gestor') {
                                listaAssociacoes.innerHTML += `<li style="margin-bottom:4px; color:#0f172a;">🛡️ <strong>${a.clube}</strong></li>`;
                            } else {
                                listaAssociacoes.innerHTML += `<li style="margin-bottom:4px; color:#0f172a;">⚽ <strong>${a.equipa}</strong> <span style="color:#64748b;">(${a.clube})</span></li>`;
                            }
                        });
                    }

                    const formataData = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
                    const hoje = new Date().toISOString().split('T')[0];
                    
                    const sWrapper = "display: flex; flex-direction: column;";
                    const sInput = "width: 100%; padding: 12px 15px; border-radius: 8px; border: 1px solid #e2e8f0; background-color: #f8fafc; color: #0a3d80; font-size: 14px; box-sizing: border-box; outline: none; margin-top: 6px;";
                    const sLabel = "color: #0a3d80; font-size: 13px; font-weight: 600;";

                    let htmlCampos = '';

                    if (tipo === 'atleta') {
                        htmlCampos = `
                            <div style="${sWrapper}"><label style="${sLabel}">Data Nascimento</label><input type="date" max="${hoje}" id="perf-nascimento" style="${sInput}" value="${formataData(perf.data_nascimento)}"></div>
                            <div style="${sWrapper}"><label style="${sLabel}">Género</label><select id="perf-genero" style="${sInput}"><option value="">A carregar...</option></select></div>
                            <div style="${sWrapper}"><label style="${sLabel}">Altura (cm)</label><input type="number" step="0.01" min="0" id="perf-altura" style="${sInput}" value="${perf.altura || ''}"></div>
                            <div style="${sWrapper}"><label style="${sLabel}">Peso (kg)</label><input type="number" step="0.01" min="0" id="perf-peso" style="${sInput}" value="${perf.peso || ''}"></div>
                            <div style="${sWrapper}"><label style="${sLabel}">Cidade</label><input type="text" id="perf-cidade" style="${sInput}" value="${perf.cidade || ''}"></div>
                            <div style="${sWrapper}"><label style="${sLabel}">Modalidade</label><select id="perf-modalidade" style="${sInput}"><option value="">A carregar...</option></select></div>
                        `;
                        divCampos.innerHTML = htmlCampos;
                        fetch('/mngr/api/generos').then(r => r.json()).then(d => {
                            const sel = document.getElementById('perf-genero');
                            if (sel && d.success) {
                                sel.innerHTML = '<option value="">Sem género</option>';
                                d.generos.forEach(g => { sel.innerHTML += `<option value="${g.id}" ${perf.id_genero == g.id ? 'selected' : ''}>${g.nome}</option>`; });
                            }
                        });
                        fetch('/mngr/api/desportos').then(r => r.json()).then(d => {
                            const sel = document.getElementById('perf-modalidade');
                            if (sel && d.success) {
                                sel.innerHTML = '<option value="">Sem modalidade</option>';
                                d.desportos.forEach(ds => { sel.innerHTML += `<option value="${ds.id}" ${perf.id_desporto == ds.id ? 'selected' : ''}>${ds.nome}</option>`; });
                            }
                        });
                    } else if (tipo === 'treinador') {
                        htmlCampos = `
                            <div style="${sWrapper}"><label style="${sLabel}">Data Nascimento</label><input type="date" max="${hoje}" id="perf-nascimento" style="${sInput}" value="${formataData(perf.data_nascimento)}"></div>
                            <div style="${sWrapper}"><label style="${sLabel}">Sexo</label><select id="perf-sexo" style="${sInput}"><option value="M" ${perf.sexo==='M'?'selected':''}>Masculino</option><option value="F" ${perf.sexo==='F'?'selected':''}>Feminino</option></select></div>
                            <div style="${sWrapper}"><label style="${sLabel}">Grau Treinador</label><input type="text" id="perf-grau" style="${sInput}" value="${perf.grau_treinador || ''}"></div>
                            <div style="${sWrapper}"><label style="${sLabel}">Modalidade</label><select id="perf-modalidade" style="${sInput}"><option value="">A carregar...</option></select></div>
                            <div style="${sWrapper}; grid-column: span 2;"><label style="${sLabel}">Cidade</label><input type="text" id="perf-cidade" style="${sInput}" value="${perf.cidade || ''}"></div>
                        `;
                        divCampos.innerHTML = htmlCampos;
                        fetch('/mngr/api/desportos').then(r => r.json()).then(d => {
                            const sel = document.getElementById('perf-modalidade');
                            if (sel && d.success) {
                                sel.innerHTML = '<option value="">Sem modalidade</option>';
                                d.desportos.forEach(ds => { sel.innerHTML += `<option value="${ds.id}" ${perf.id_desporto == ds.id ? 'selected' : ''}>${ds.nome}</option>`; });
                            }
                        });
                    } else if (tipo === 'gestor') {
                        htmlCampos = `
                            <div style="${sWrapper}"><label style="${sLabel}">Data Nascimento</label><input type="date" max="${hoje}" id="perf-nascimento" style="${sInput}" value="${formataData(perf.data_nascimento)}"></div>
                            <div style="${sWrapper}"><label style="${sLabel}">Sexo</label><select id="perf-sexo" style="${sInput}"><option value="M" ${perf.sexo==='M'?'selected':''}>Masculino</option><option value="F" ${perf.sexo==='F'?'selected':''}>Feminino</option></select></div>
                            <div style="${sWrapper}"><label style="${sLabel}">Início Carreira</label><input type="date" max="${hoje}" id="perf-carreira" style="${sInput}" value="${formataData(perf.data_inicio_carreira)}"></div>
                            <div style="${sWrapper}"><label style="${sLabel}">Cidade</label><input type="text" id="perf-cidade" style="${sInput}" value="${perf.cidade || ''}"></div>
                        `;
                    } else { divCampos.innerHTML = '<p style="color:#64748b; grid-column: span 2; text-align:center;">Não existem campos extra para Administradores.</p>'; return; }
                    if (tipo === 'gestor') divCampos.innerHTML = htmlCampos;
                } else { divCampos.innerHTML = `<p style="color:#ef4444; font-weight:bold; grid-column: span 2; text-align:center;">Erro: ${data.error}</p>`; }
            } catch (err) { divCampos.innerHTML = `<p style="color:#ef4444; font-weight:bold; grid-column: span 2; text-align:center;">Falha na comunicação com o servidor.</p>`; }
        };

        // ==========================================
        // GUARDAR EDIÇÃO DO PERFIL DO UTILIZADOR
        // ==========================================
        const formDetalhes = document.getElementById('form-detalhes-utilizador'); 
        if (formDetalhes) {
            formDetalhes.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const id_utilizador = document.getElementById('detalhes-id-utilizador').value;
                const tipo = document.getElementById('detalhes-tipo-utilizador').value;
                
                let dados = {};

                if (tipo === 'atleta') {
                    dados = {
                        data_nascimento: document.getElementById('perf-nascimento')?.value || null,
                        id_genero: document.getElementById('perf-genero')?.value || null,
                        altura: document.getElementById('perf-altura')?.value || null,
                        peso: document.getElementById('perf-peso')?.value || null,
                        cidade: document.getElementById('perf-cidade')?.value || null,
                        id_desporto: document.getElementById('perf-modalidade')?.value || null
                    };
                } else if (tipo === 'treinador') {
                    dados = {
                        data_nascimento: document.getElementById('perf-nascimento')?.value || null,
                        sexo: document.getElementById('perf-sexo')?.value || null,
                        grau_treinador: document.getElementById('perf-grau')?.value || null,
                        id_desporto: document.getElementById('perf-modalidade')?.value || null,
                        cidade: document.getElementById('perf-cidade')?.value || null
                    };
                } else if (tipo === 'gestor') {
                    dados = {
                        data_nascimento: document.getElementById('perf-nascimento')?.value || null,
                        sexo: document.getElementById('perf-sexo')?.value || null,
                        data_inicio_carreira: document.getElementById('perf-carreira')?.value || null,
                        cidade: document.getElementById('perf-cidade')?.value || null
                    };
                }

                try {
                    const res = await fetch(`/mngr/api/admin/utilizadores/${id_utilizador}/detalhes`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tipo_utilizador: tipo, dados: dados })
                    });
                    
                    const resposta = await res.json();
                    
                    if (resposta.success) {
                        mostrarAlerta('Perfil atualizado com sucesso!','sucesso');
                        document.getElementById('modal-ver-utilizador').classList.add('cal-mngr-hidden');
                    } else {
                        mostrarAlerta(`Erro ao atualizar: ${resposta.error}`);
                    }
                } catch (err) {
                    console.error("Erro no fetch:", err);
                    mostrarAlerta('Falha na comunicação com o servidor.');
                }
            });
        }

        // =========================================================
        // DESPORTOS — CONFIG MULTIDESPORTO
        // =========================================================
        async function carregarDesportos() {
            const res = await fetch('/mngr/api/admin/desportos-config');
            if (!res.ok) return;
            const desportos = await res.json();
            const lista = document.getElementById('desportos-lista');
            if (!lista) return;

            const formCriar = `
                <div class="admin-desp-card" style="border: 2px dashed #cbd5e1; background: #f8fafc;">
                    <h3 class="admin-desp-titulo" style="color:#475a6b;">+ Criar Novo Desporto</h3>
                    <div style="display:flex; gap:10px; align-items:flex-end;">
                        <div class="modal-input-group" style="flex:1; margin:0;">
                            <label>Nome do Desporto</label>
                            <input type="text" id="novo-desporto-nome" class="jogo-input" placeholder="Ex: Basquetebol, Andebol...">
                        </div>
                        <button class="btn-confirmar" id="btn-criar-desporto" style="white-space:nowrap;">Criar Desporto</button>
                    </div>
                </div>`;

            lista.innerHTML = formCriar + desportos.map(d => {
                const cfg = d.config || {};
                const stats = d.estatisticas || [];
                const tiposCartao = (cfg.tipos_cartao || ['amarelo','vermelho']).join(', ');

                const statsHtml = stats.length ? stats.map((s, idx) => `
                    <div class="admin-desp-stat-row" data-id="${s.id}" data-desporto="${d.id}">
                        <div class="stat-row-ordem">
                            <button class="stat-btn-ordem stat-btn-up" data-id="${s.id}" data-desporto="${d.id}" ${idx === 0 ? 'disabled' : ''} title="Mover para cima">▲</button>
                            <button class="stat-btn-ordem stat-btn-down" data-id="${s.id}" data-desporto="${d.id}" ${idx === stats.length - 1 ? 'disabled' : ''} title="Mover para baixo">▼</button>
                        </div>
                        <div class="stat-row-info" data-edit="false">
                            <span class="stat-view-label">${s.label} <small style="color:#94a3b8;">(${s.campo})</small></span>
                            <div class="stat-edit-fields" style="display:none; gap:6px; align-items:center;">
                                <input type="text" class="jogo-input stat-edit-label" value="${s.label}" placeholder="Nome">
                                <input type="text" class="jogo-input stat-edit-campo" value="${s.campo}" placeholder="chave">
                                <button class="btn-confirmar stat-btn-save" data-id="${s.id}" style="white-space:nowrap; padding:6px 10px;">✓</button>
                                <button class="stat-btn-cancel" data-id="${s.id}" style="background:none;border:none;cursor:pointer;font-size:16px;color:#64748b;" title="Cancelar">✕</button>
                            </div>
                        </div>
                        <div style="display:flex;gap:6px;flex-shrink:0;">
                            <button class="admin-desp-btn-edit stat-btn-editar" data-id="${s.id}" title="Editar">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="admin-desp-btn-rem stat-btn-remover" data-id="${s.id}" data-desporto="${d.id}" title="Remover">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>`).join('')
                    : '<p style="color:#94a3b8;font-size:13px;">Nenhuma estatística configurada.</p>';

                return `
                <div class="admin-desp-card" data-id="${d.id}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 class="admin-desp-titulo" style="margin:0;">${d.nome}</h3>
                        <button class="admin-desp-btn-rem desp-btn-remover-desporto" data-id="${d.id}" title="Remover desporto">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                    <div class="admin-desp-grid">
                        <div class="modal-input-group">
                            <label>Unidade de Pontuação</label>
                            <input type="text" class="desp-unidade" value="${cfg.unidade_pontuacao || 'Golo'}" placeholder="Golo, Ponto, Game...">
                        </div>
                        <div class="modal-input-group" style="justify-content:center;">
                            <label>Tem Assistências?</label>
                            <label class="cal-mngr-toggle" style="margin-top:8px;">
                                <input type="checkbox" class="desp-assistencias" ${cfg.tem_assistencias !== false ? 'checked' : ''}>
                                <span class="toggle-switch"></span>
                                <span class="toggle-text">Ativo</span>
                            </label>
                        </div>
                        <div class="modal-input-group" style="justify-content:center;">
                            <label>Tem Cartões?</label>
                            <label class="cal-mngr-toggle" style="margin-top:8px;">
                                <input type="checkbox" class="desp-cartoes" ${cfg.tem_cartoes !== false ? 'checked' : ''}>
                                <span class="toggle-switch"></span>
                                <span class="toggle-text">Ativo</span>
                            </label>
                        </div>
                        <div class="modal-input-group">
                            <label>Tipos de Cartão</label>
                            <input type="text" class="desp-tipos-cartao" value="${tiposCartao}" placeholder="amarelo, vermelho, azul...">
                        </div>
                    </div>
                    <button class="btn-confirmar desp-btn-guardar" data-id="${d.id}" style="margin-top:8px;">Guardar Configuração</button>

                    <div class="admin-desp-stats-titulo">Estatísticas</div>
                    <div class="admin-desp-stats-lista" id="stats-lista-${d.id}">${statsHtml}</div>

                    <div class="admin-desp-add-stat">
                        <input type="text" class="jogo-input desp-novo-campo" placeholder="chave (ex: ressaltos)">
                        <input type="text" class="jogo-input desp-novo-label" placeholder="nome (ex: Ressaltos)">
                        <button class="btn-confirmar desp-btn-add-stat" data-id="${d.id}">+ Adicionar</button>
                    </div>
                </div>`;
            }).join('');

            // Criar desporto
            document.getElementById('btn-criar-desporto')?.addEventListener('click', async () => {
                const nome = document.getElementById('novo-desporto-nome').value.trim();
                if (!nome) return mostrarAlerta('Indica o nome do desporto.','aviso');
                const r = await fetch('/mngr/api/admin/desportos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome })
                });
                if (r.ok) {
                    document.getElementById('novo-desporto-nome').value = '';
                    mostrarAlerta('Desporto criado com sucesso!', 'sucesso');
                    await carregarDesportos();
                } else {
                    const err = await r.json().catch(() => ({}));
                    mostrarAlerta(err.error || 'Erro ao criar desporto.');
                }
            });

            // Remover desporto
            lista.querySelectorAll('.desp-btn-remover-desporto').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const conf = await window.mostrarConfirmacao('Remover este desporto e toda a sua configuração?');
                    if (!conf) return;
                    
                    const id = btn.getAttribute('data-id');
                    const r = await fetch(`/mngr/api/admin/desportos/${id}`, { method: 'DELETE' });
                    if (r.ok) {
                        mostrarAlerta('Desporto removido com sucesso!', 'sucesso');
                        await carregarDesportos();
                    } else {
                        mostrarAlerta('Erro ao remover. Pode ter equipas associadas.');
                    }
                });
            });

            // Guardar config
            lista.querySelectorAll('.desp-btn-guardar').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const card = btn.closest('.admin-desp-card');
                    const id_desporto = btn.getAttribute('data-id');
                    const unidade_pontuacao = card.querySelector('.desp-unidade').value.trim() || 'Golo';
                    const tem_assistencias = card.querySelector('.desp-assistencias').checked;
                    const tem_cartoes = card.querySelector('.desp-cartoes').checked;
                    const tipos_cartao = card.querySelector('.desp-tipos-cartao').value
                        .split(',').map(t => t.trim()).filter(Boolean);

                    const res = await fetch('/mngr/api/admin/desportos-config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id_desporto, unidade_pontuacao, tem_cartoes, tipos_cartao, tem_assistencias })
                    });
                    if (res.ok) {
                        btn.textContent = '✓ Guardado!';
                        btn.style.background = '#16a34a';
                        setTimeout(() => { btn.textContent = 'Guardar Configuração'; btn.style.background = ''; }, 2000);
                    }
                });
            });

            // Adicionar estatística
            lista.querySelectorAll('.desp-btn-add-stat').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const card = btn.closest('.admin-desp-card');
                    const id_desporto = btn.getAttribute('data-id');
                    const campo = card.querySelector('.desp-novo-campo').value.trim().replace(/\s+/g, '_').toLowerCase();
                    const label = card.querySelector('.desp-novo-label').value.trim();
                    if (!campo || !label) return mostrarAlerta('Preenche a chave e o nome.','aviso');

                    const res = await fetch('/mngr/api/admin/desportos-config/estatistica', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id_desporto, campo, label })
                    });
                    if (res.ok) {
                        mostrarAlerta('Estatística adicionada com sucesso!', 'sucesso');
                        await carregarDesportos();
                    }
                });
            });

            // Remover estatística
            lista.querySelectorAll('.stat-btn-remover').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const conf = await window.mostrarConfirmacao('Remover esta estatística?');
                    if (!conf) return;

                    const id = btn.getAttribute('data-id');
                    const res = await fetch(`/mngr/api/admin/desportos-config/estatistica/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        mostrarAlerta('Estatística removida com sucesso!', 'sucesso');
                        await carregarDesportos();
                    }
                });
            });

            // Editar estatística — mostrar campos
            lista.querySelectorAll('.stat-btn-editar').forEach(btn => {
                btn.addEventListener('click', () => {
                    const row = btn.closest('.admin-desp-stat-row');
                    row.querySelector('.stat-view-label').style.display = 'none';
                    row.querySelector('.stat-edit-fields').style.display = 'flex';
                    btn.style.display = 'none';
                });
            });

            // Cancelar edição
            lista.querySelectorAll('.stat-btn-cancel').forEach(btn => {
                btn.addEventListener('click', () => {
                    const row = btn.closest('.admin-desp-stat-row');
                    row.querySelector('.stat-view-label').style.display = '';
                    row.querySelector('.stat-edit-fields').style.display = 'none';
                    row.querySelector('.stat-btn-editar').style.display = '';
                });
            });

            // Guardar edição
            lista.querySelectorAll('.stat-btn-save').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    const row = btn.closest('.admin-desp-stat-row');
                    const label = row.querySelector('.stat-edit-label').value.trim();
                    const campo = row.querySelector('.stat-edit-campo').value.trim();
                    if (!label || !campo) return mostrarAlerta('Preenche ambos os campos.','aviso');
                    const res = await fetch(`/mngr/api/admin/desportos-config/estatistica/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ label, campo })
                    });
                    if (res.ok) {
                        mostrarAlerta('Estatística atualizada com sucesso!', 'sucesso');
                        await carregarDesportos();
                    } else {
                        mostrarAlerta('Erro ao guardar.');
                    }
                });
            });

            // Mover estatística para cima
            lista.querySelectorAll('.stat-btn-up').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const idDesporto = btn.getAttribute('data-desporto');
                    const statsListaEl = document.getElementById(`stats-lista-${idDesporto}`);
                    const rows = [...statsListaEl.querySelectorAll('.admin-desp-stat-row')];
                    const idx = rows.findIndex(r => r.getAttribute('data-id') === btn.getAttribute('data-id'));
                    if (idx <= 0) return;
                    const ids = rows.map(r => r.getAttribute('data-id'));
                    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                    await fetch('/mngr/api/admin/desportos-config/reordenar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids })
                    });
                    await carregarDesportos();
                });
            });

            // Mover estatística para baixo
            lista.querySelectorAll('.stat-btn-down').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const idDesporto = btn.getAttribute('data-desporto');
                    const statsListaEl = document.getElementById(`stats-lista-${idDesporto}`);
                    const rows = [...statsListaEl.querySelectorAll('.admin-desp-stat-row')];
                    const idx = rows.findIndex(r => r.getAttribute('data-id') === btn.getAttribute('data-id'));
                    if (idx >= rows.length - 1) return;
                    const ids = rows.map(r => r.getAttribute('data-id'));
                    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                    await fetch('/mngr/api/admin/desportos-config/reordenar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids })
                    });
                    await carregarDesportos();
                });
            });
        }

        // =========================================================
        // ESCALÕES
        // =========================================================
        async function carregarEscaloes() {
            const [resEscaloes, resDesportos] = await Promise.all([
                fetch('/mngr/api/admin/escaloes'),
                fetch('/mngr/api/admin/desportos-config')
            ]);
            if (!resEscaloes.ok) return;
            const escaloes = await resEscaloes.json();
            const desportos = resDesportos.ok ? await resDesportos.json() : [];

            const selDesp = document.getElementById('novo-escalao-desporto');
            if (selDesp) {
                selDesp.innerHTML = '<option value="">Selecione...</option>' +
                    desportos.map(d => `<option value="${d.id}">${d.nome}</option>`).join('');
            }

            const lista = document.getElementById('escaloes-lista');
            if (!lista) return;

            if (escaloes.length === 0) {
                lista.innerHTML = '<p style="color:#94a3b8; font-size:13px;">Nenhum escalão criado ainda.</p>';
                return;
            }

            const generosMap = { '1': 'Masculino', '2': 'Feminino', '3': 'Misto' };
            const desportosOptsHtml = desportos.map(d => `<option value="${d.id}">${d.nome}</option>`).join('');

            lista.innerHTML = escaloes.map(e => {
                const generoLabel = generosMap[String(e.id_genero || e.genero)] || '-';
                const idades = (e.idade_min || e.idade_max)
                    ? ` · ${e.idade_min ?? '?'}-${e.idade_max ?? '?'} anos`
                    : '';
                const desportoLabel = desportos.find(d => d.id == e.id_tipo_desporto)?.nome || '-';
                return `
                <div class="admin-desp-card" data-id="${e.id}" style="padding:12px 16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong style="color:#0a3d80;">${e.nome}</strong>
                            <span style="color:#64748b; font-size:13px; margin-left:10px;">${desportoLabel} · ${generoLabel}${idades}</span>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="admin-desp-btn-edit btn-editar-escalao"
                                data-id="${e.id}"
                                data-nome="${e.nome}"
                                data-desporto="${e.id_tipo_desporto || ''}"
                                data-genero="${e.id_genero || e.genero || ''}"
                                data-idade-min="${e.idade_min ?? ''}"
                                data-idade-max="${e.idade_max ?? ''}"
                                title="Editar escalão">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="admin-desp-btn-rem btn-desativar-escalao" data-id="${e.id}" title="Desativar escalão">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('');

            // Preencher select de desportos no modal
            const selEditDesp = document.getElementById('edit-esc-desporto');
            if (selEditDesp) {
                selEditDesp.innerHTML = '<option value="">Selecione...</option>' +
                    desportos.map(d => `<option value="${d.id}">${d.nome}</option>`).join('');
            }

            const modal = document.getElementById('modal-editar-escalao');
            const form = document.getElementById('form-editar-escalao');

            lista.querySelectorAll('.btn-editar-escalao').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('edit-esc-id').value = btn.dataset.id;
                    document.getElementById('edit-esc-nome').value = btn.dataset.nome;
                    document.getElementById('edit-esc-desporto').value = btn.dataset.desporto;
                    document.getElementById('edit-esc-genero').value = btn.dataset.genero;
                    document.getElementById('edit-esc-idade-min').value = btn.dataset.idadeMin;
                    document.getElementById('edit-esc-idade-max').value = btn.dataset.idadeMax;
                    modal.classList.remove('cal-mngr-hidden');
                });
            });

            document.getElementById('btn-cancelar-modal-escalao').onclick = () => modal.classList.add('cal-mngr-hidden');

            form.onsubmit = async (e) => {
                e.preventDefault();
                const id = document.getElementById('edit-esc-id').value;
                const nome = document.getElementById('edit-esc-nome').value.trim();
                const id_tipo_desporto = document.getElementById('edit-esc-desporto').value;
                const genero = document.getElementById('edit-esc-genero').value;
                const idade_min = document.getElementById('edit-esc-idade-min').value || null;
                const idade_max = document.getElementById('edit-esc-idade-max').value || null;
                if (!nome) return mostrarAlerta('Nome obrigatório.','aviso');
                if (!id_tipo_desporto) return mostrarAlerta('Seleciona o desporto.','aviso');
                const r = await fetch(`/mngr/api/admin/escaloes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, genero, id_tipo_desporto, idade_min, idade_max })
                });
                if (r.ok) { 
                    modal.classList.add('cal-mngr-hidden'); 
                    mostrarAlerta('Escalão atualizado com sucesso!', 'sucesso');
                    await carregarEscaloes(); 
                }
                else mostrarAlerta('Erro ao guardar escalão.');
            };

            lista.querySelectorAll('.btn-desativar-escalao').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const conf = await window.mostrarConfirmacao('Remover este escalão?');
                    if (!conf) return;

                    const id = btn.getAttribute('data-id');
                    const r = await fetch(`/mngr/api/admin/escaloes/${id}/desativar`, { method: 'POST' });
                    if (r.ok) {
                        mostrarAlerta('Escalão removido com sucesso!', 'sucesso');
                        await carregarEscaloes();
                    } else {
                        mostrarAlerta('Erro ao remover escalão.');
                    }
                });
            });
        }

        document.getElementById('btn-criar-escalao')?.addEventListener('click', async () => {
            const nome = document.getElementById('novo-escalao-nome').value.trim();
            const genero = document.getElementById('novo-escalao-genero').value;
            const id_tipo_desporto = document.getElementById('novo-escalao-desporto').value;
            const idade_min = document.getElementById('novo-escalao-idade-min').value;
            const idade_max = document.getElementById('novo-escalao-idade-max').value;

            if (!nome) return mostrarAlerta('Indica o nome do escalão.', 'aviso');
            if (!id_tipo_desporto) return mostrarAlerta('Seleciona o desporto.', 'aviso');
            if (!genero) return mostrarAlerta('Seleciona o género.', 'aviso');

            const r = await fetch('/mngr/api/admin/escaloes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, genero, id_tipo_desporto, idade_min: idade_min || null, idade_max: idade_max || null })
            });
            if (r.ok) {
                document.getElementById('novo-escalao-nome').value = '';
                document.getElementById('novo-escalao-desporto').value = '';
                document.getElementById('novo-escalao-genero').value = '';
                document.getElementById('novo-escalao-idade-min').value = '';
                document.getElementById('novo-escalao-idade-max').value = '';
                mostrarAlerta('Escalão criado com sucesso!', 'sucesso');
                await carregarEscaloes();
            } else {
                const err = await r.json().catch(() => ({}));
                mostrarAlerta(err.error || 'Erro ao criar escalão.', 'erro');
            }
        });

        if (tabAtiva === 'desportos') carregarDesportos();
        if (tabAtiva === 'escaloes') carregarEscaloes();

        // --- INICIALIZAR DADOS ---
        await carregarDashboard();
        await carregarUtilizadores();
        await carregarClubes();

    }, 0);
})();