// public/mngr/js/treinador_equipa.js
(function() {
    function obterIdEquipaDoURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    async function inicializar() {
        const idEquipa = obterIdEquipaDoURL();

        if (!idEquipa || idEquipa === 'null') {
            const el = document.getElementById('page-title');
            if (el) el.textContent = 'Erro: Equipa não especificada.';
            return;
        }

        try {
            const res = await fetch(`/mngr/api/equipa/${idEquipa}`, { headers: { 'x-solicitado-por': 'SPA' } });
            const data = await res.json();

            if (!data.success) {
                const el = document.getElementById('page-title');
                if (el) el.textContent = data.message || 'Equipa não encontrada.';
                return;
            }

            const equipa = data.dados?.equipa || data.equipa || data;

            const elFoto = document.querySelector('.js-team-photo');
            if (elFoto) {
                elFoto.src = equipa.foto_url || `https://dummyimage.com/150x150/e2e8f0/627d98.png&text=${encodeURIComponent(equipa.nome || 'Equipa')}`;
                elFoto.alt = equipa.nome || 'Equipa';
            }

            const elTitle = document.getElementById('page-title');
            if (elTitle) elTitle.textContent = equipa.nome || 'Equipa';

            const elBreadcrumb = document.getElementById('breadcrumb-nome-equipa');
            if (elBreadcrumb) elBreadcrumb.textContent = equipa.nome || 'Equipa';

            await carregarPlantel(idEquipa);
            await carregarCompeticoes(idEquipa);

        } catch (err) {
            console.error('Erro ao carregar equipa:', err);
        }
    }

    async function carregarPlantel(idEquipa) {
        const containerAtletas = document.getElementById('table-atletas');
        const containerTecnica = document.getElementById('table-equipa-tecnica');

        if (containerAtletas) containerAtletas.innerHTML = `<tr><td colspan="4" style="text-align:center;">A carregar...</td></tr>`;
        if (containerTecnica) containerTecnica.innerHTML = `<tr><td colspan="3" style="text-align:center;">A carregar...</td></tr>`;

        try {
            const res = await fetch(`/mngr/api/equipa/${idEquipa}/plantel`, { headers: { 'x-solicitado-por': 'SPA' } });
            const dados = await res.json();

            if (!dados.success || !dados.membros) {
                if (containerAtletas) containerAtletas.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">Erro ao obter plantel.</td></tr>`;
                return;
            }

            const atletas = dados.membros.filter(m => m.cargo === 'Atleta');
            const equipaTecnica = dados.membros.filter(m => m.cargo === 'Treinador' || m.cargo === 'Staff');

            if (containerTecnica) {
                if (equipaTecnica.length === 0) {
                    containerTecnica.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-secondary);">Nenhum membro na equipa técnica.</td></tr>`;
                } else {
                    containerTecnica.innerHTML = equipaTecnica.map(m => {
                        const idade = m.idade ? `${m.idade} anos` : '-';
                        return `
                            <tr>
                                <td class="text-left">
                                    <div style="font-weight:500;">${m.nome_utilizador}</div>
                                    <div style="font-size:12px;color:var(--text-muted);">${m.email}</div>
                                </td>
                                <td>${idade}</td>
                                <td>${m.cargo}</td>
                            </tr>`;
                    }).join('');
                }
            }

            if (containerAtletas) {
                if (atletas.length === 0) {
                    containerAtletas.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);">Nenhum atleta nesta equipa.</td></tr>`;
                } else {
                    containerAtletas.innerHTML = atletas.map(m => {
                        const idade = m.idade ? `${m.idade} anos` : '-';
                        const altura = m.altura ? `${m.altura}m` : '-';
                        const peso = m.peso ? `${m.peso}kg` : '-';
                        const badgeSubir = m.subir_escalao
                            ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600;margin-left:6px;" title="Este atleta deve subir de escalão na próxima época">↑ Subir de Escalão</span>`
                            : '';
                        return `
                            <tr>
                                <td class="text-left">
                                    <div style="font-weight:500;display:flex;align-items:center;flex-wrap:wrap;gap:2px;">
                                        <a href="/mngr/atleta/detalhes?id=${m.id}&idEquipa=${idEquipa}" class="link-spa-atleta" style="color:#0284c7;text-decoration:none;font-weight:600;">
                                            ${m.nome_utilizador}
                                        </a>
                                        ${badgeSubir}
                                    </div>
                                    <div style="font-size:12px;color:var(--text-muted);">${m.email}</div>
                                </td>
                                <td>${idade}</td>
                                <td>${altura}</td>
                                <td>${peso}</td>
                            </tr>`;
                    }).join('');
                }
            }

        } catch (err) {
            console.error('Erro ao carregar plantel:', err);
        }
    }

    async function carregarCompeticoes(idEquipa) {
        const container = document.getElementById('secao-competicoes');
        if (!container) return;

        try {
            const res = await fetch(`/mngr/api/equipa/${idEquipa}/competicoes`, { headers: { 'x-solicitado-por': 'SPA' } });
            const data = await res.json();

            if (!data.success || data.competicoes.length === 0) {
                container.innerHTML = '';
                return;
            }

            const tipoLabel = { liga: 'Liga', eliminatoria: 'Eliminatória', jogo_unico: 'Jogo Único', grupo_eliminatorias: 'Grupos + Eliminatórias' };

            container.innerHTML = `<h2 class="section-title">Competições</h2>` + data.competicoes.map(comp => {
                const jogosHtml = comp.jogos.length === 0
                    ? `<p style="color:#94a3b8;font-size:13px;margin:8px 0 0;">Sem jogos registados nesta competição.</p>`
                    : comp.jogos.map(j => {
                        const dataHora = j.data_hora
                            ? new Date(j.data_hora).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '—';
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
                            <svg class="comp-chevron" data-id="${comp.id}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="transition:transform 0.2s;flex-shrink:0;"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                        <div class="comp-jogos-panel" data-id="${comp.id}" style="display:none;padding:0 20px 16px;border-top:1px solid #f1f5f9;">
                            ${jogosHtml}
                        </div>
                    </div>`;
            }).join('');

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

        } catch (err) {
            console.error('Erro ao carregar competições:', err);
        }
    }

    inicializar();
})();
