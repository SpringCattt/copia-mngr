// public/mngr/js/dashboard_dados.js
(function() {
    setTimeout(async function inicializarPainelDados() {
        try {
            const resposta = await fetch('/mngr/api/treinador/dashboard-dados');
            if (!resposta.ok) throw new Error(`Erro na rede: Status ${resposta.status}`);
            
            const dados = await resposta.json();
            if (dados.error) return;

            // =========================================================================
            // 1. ATUALIZAR DADOS DA EQUIPA E BANDEIRAS
            // =========================================================================
            if (dados.equipa) {
                const txtNome = document.querySelector('.team-name');
                if (txtNome && dados.equipa.nome) txtNome.textContent = dados.equipa.nome;
                
                const campoPais = document.querySelector('.pais-texto');
                const iconeBandeira = document.querySelector('.icon-flag');
                
                if (campoPais && dados.equipa.pais) {
                    campoPais.textContent = dados.equipa.pais;
                    if (iconeBandeira) iconeBandeira.textContent = obterEmojiBandeira(dados.equipa.pais);
                }
                
                const campoRegiao = document.querySelector('.regiao-texto');
                if (campoRegiao && dados.equipa.regiao) campoRegiao.textContent = dados.equipa.regiao;
                
                const logoImg = document.getElementById('equipa-foto');
                const logoPlaceholder = document.getElementById('equipa-foto-placeholder');
                if (logoImg && dados.equipa.logo) {
                    logoImg.src = dados.equipa.logo;
                    logoImg.style.display = 'block';
                    if (logoPlaceholder) logoPlaceholder.style.display = 'none';
                }
            }

            // =========================================================================
            // 2. ATUALIZAR ÚLTIMO EVENTO E BOTÃO
            // =========================================================================
            const seccaoUltimo = document.querySelectorAll('.event-section')[0];
            if (dados.ultimoEvento && seccaoUltimo) {
                const titulo = dados.ultimoEvento.titulo || "Evento Anterior";
                const logoOp = seccaoUltimo.querySelector('.opponent-logo');
                
                if (logoOp) {
                    logoOp.src = dados.ultimoEvento.logo_adversario_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(titulo)}&background=e2e8f0&color=0f172a&bold=true`;
                    logoOp.alt = titulo;
                }

                const tituloEl = seccaoUltimo.querySelector('.event-title') || seccaoUltimo.querySelector('h3');
                if (tituloEl) tituloEl.textContent = titulo;
                
                const tagEl = seccaoUltimo.querySelector('.league-tag');
                if (tagEl) tagEl.textContent = dados.ultimoEvento.tipo_evento || 'Evento';
                
                const dataFmt = formatarDataSPA(dados.ultimoEvento.data_hora);
                seccaoUltimo.querySelector('.event-meta').textContent = `${dataFmt}`;

                // Navegação SPA para o Calendário
                const btnUltimo = seccaoUltimo.querySelector('.btn-event-link');
                if (btnUltimo && dados.ultimoEvento.id) {
                    btnUltimo.addEventListener('click', () => {
                        window.location.href = `/mngr/dashboard/calendario?eventoId=${dados.ultimoEvento.id}`;
                    });
                }
            } else if (seccaoUltimo) {
                seccaoUltimo.style.display = 'none';
            }

            // =========================================================================
            // 3. ATUALIZAR PRÓXIMO EVENTO E BOTÃO
            // =========================================================================
            const seccaoProximo = document.querySelectorAll('.event-section')[1];
            if (dados.proximoEvento && seccaoProximo) {
                const titulo = dados.proximoEvento.titulo || "Próximo Evento";
                const logoProx = seccaoProximo.querySelector('.opponent-logo');
                
                if (logoProx) {
                    logoProx.src = dados.proximoEvento.logo_adversario_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(titulo)}&background=e2e8f0&color=0f172a&bold=true`;
                    logoProx.alt = titulo;
                }

                const tituloEl = seccaoProximo.querySelector('.event-title') || seccaoProximo.querySelector('h3');
                if (tituloEl) tituloEl.textContent = titulo;
                
                const tagEl = seccaoProximo.querySelector('.league-tag');
                if (tagEl) tagEl.textContent = dados.proximoEvento.tipo_evento || 'Evento';
                
                const dataFmt = formatarDataSPA(dados.proximoEvento.data_hora);
                seccaoProximo.querySelector('.event-meta').textContent = `${dataFmt}`;

                // Navegação SPA para o Calendário
                const btnProximo = seccaoProximo.querySelector('.btn-event-link');
                if (btnProximo && dados.proximoEvento.id) {
                    btnProximo.addEventListener('click', () => {
                        window.location.href = `/mngr/dashboard/calendario?eventoId=${dados.proximoEvento.id}`;
                    });
                }
            } else if (seccaoProximo) {
                seccaoProximo.style.display = 'none';
            }

            // =========================================================================
            // 4. CLASSIFICAÇÃO REAL DA COMPETIÇÃO (APENAS A NOSSA EQUIPA)
            // =========================================================================
            const tbody = document.getElementById('standings-body');
            const compSelect = document.getElementById('standings-comp-select');
            const compLabel = document.getElementById('standings-comp-label');

            const classificacoes = dados.classificacoes || [];

            function renderizarTabela(classificacao) {
                if (!tbody) return;

                const tabelaPai = tbody.closest('table');
                let thead = tabelaPai ? tabelaPai.querySelector('thead') : null;
                if (!thead && tabelaPai) {
                    thead = document.createElement('thead');
                    tabelaPai.insertBefore(thead, tbody);
                }

                if (!classificacao || !classificacao.tabela || classificacao.tabela.length === 0) {
                    if (thead) thead.innerHTML = '';
                    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#94a3b8; padding:20px;">Sem dados para esta competição.</td></tr>';
                    return;
                }

                const tipo = classificacao.tipo_competicao ? classificacao.tipo_competicao.toLowerCase() : 'liga';

                // 🌟 ATUALIZADO: Suportar as strings 'eliminatoria', 'grupo_eliminatorias', 'grupo+eliminatoria' e 'jogo unico'
                const esFormatoEliminatorio = (tipo === 'eliminatoria' || tipo === 'grupo_eliminatorias' || tipo === 'grupo+eliminatoria' || tipo === 'jogo unico');

                // 1. Redefinir Cabeçalhos dinamicamente consoante o formato mapeado
                if (thead) {
                    if (esFormatoEliminatorio) {
                        thead.innerHTML = `
                            <tr>
                                <th class="text-left">A Minha Equipa</th>
                                <th>Fase Atual</th>
                                <th>Estado</th>
                                <th>Jogos</th>
                                <th>Vitórias</th>
                                <th>Derrotas</th>
                            </tr>
                        `;
                    } else {
                        thead.innerHTML = `
                            <tr>
                                <th class="text-left">A Minha Equipa</th>
                                <th>J</th>
                                <th>V</th>
                                <th>E</th>
                                <th>D</th>
                                <th>GM</th>
                                <th>GS</th>
                                <th>DG</th>
                                <th>PTS</th>
                            </tr>
                        `;
                    }
                }

                // 2. Renderizar o registo único da nossa equipa processado pelo Backend
                tbody.innerHTML = classificacao.tabela.map((eq) => {
                    const rowClass = ' class="row-highlight"';
                    
                    const logo = eq.logo
                        ? `<img src="${eq.logo}" alt="${eq.nome}" class="table-team-logo" style="width:20px;height:20px;object-fit:contain;margin-right:6px;vertical-align:middle;">`
                        : `<span style="display:inline-block;width:20px;height:20px;background:#e2e8f0;border-radius:4px;margin-right:6px;vertical-align:middle;"></span>`;

                    if (esFormatoEliminatorio) {
                        // Captura a fase calculada matematicamente a partir do Backend
                        const fase = eq.fase_eliminatoria || 'Fase Inicial';
                        
                        // Formatação visual do Badge de Estado
                        const estado = eq.eliminado 
                            ? '<span style="color:#ef4444; font-weight:600; background:#fef2f2; padding:2px 8px; border-radius:12px; font-size:0.85rem;">Eliminado</span>' 
                            : '<span style="color:#22c55e; font-weight:600; background:#f0fdf4; padding:2px 8px; border-radius:12px; font-size:0.85rem;">Em prova</span>';

                        return `<tr${rowClass}>
                            <td class="text-left team-cell" style="font-weight:600;">${logo}${eq.nome}</td>
                            <td><span style="background:#f1f5f9; padding:3px 8px; border-radius:6px; font-size:0.9rem; font-weight:600; color:#0f172a;">${fase}</span></td>
                            <td>${estado}</td>
                            <td>${eq.jogos || 0}</td>
                            <td>${eq.vitorias || 0}</td>
                            <td>${eq.derrotas || 0}</td>
                        </tr>`;
                    } else {
                        // Formato Clássico de Pontos por Liga (Campeonato corrido)
                        const diff = eq.diferenca_golos >= 0 ? `+${eq.diferenca_golos}` : `${eq.diferenca_golos}`;
                        return `<tr${rowClass}>
                            <td class="text-left team-cell" style="font-weight:600;">${logo}${eq.nome}</td>
                            <td>${eq.jogos || 0}</td>
                            <td>${eq.vitorias || 0}</td>
                            <td>${eq.empates || 0}</td>
                            <td>${eq.derrotas || 0}</td>
                            <td>${eq.golos_marcados || 0}</td>
                            <td>${eq.golos_sofridos || 0}</td>
                            <td>${diff}</td>
                            <td><strong>${eq.pontos || 0}</strong></td>
                        </tr>`;
                    }
                }).join('');
            }

            if (classificacoes.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#94a3b8; padding:20px;">Sem competições ou resultados registados.</td></tr>';
            } else if (classificacoes.length === 1) {
                if (compLabel) compLabel.textContent = classificacoes[0].nome || 'Tabela';
                renderizarTabela(classificacoes[0]);
            } else {
                // Múltiplas competições — mostrar dropdown para trocar as tabelas
                if (compLabel) compLabel.style.display = 'none';
                if (compSelect) {
                    compSelect.style.display = 'inline-block';
                    compSelect.innerHTML = classificacoes.map((c, i) =>
                        `<option value="${i}">${c.nome}</option>`
                    ).join('');
                    renderizarTabela(classificacoes[0]);
                    compSelect.addEventListener('change', () => {
                        renderizarTabela(classificacoes[parseInt(compSelect.value)]);
                    });
                }
            }

        } catch (erro) {
            console.error('Falha ao renderizar dados do miolo da página:', erro);
        }

        function obterEmojiBandeira(nomePais) {
            const bandeiras = {
                'portugal': '🇵🇹', 'brasil': '🇧🇷', 'espanha': '🇪🇸', 'inglaterra': '🏴Ÿ §键³',
                'reino unido': '🇬🇧', 'frança': '🇫🇷', 'alemanha': '🇩🇪', 'itália': '🇮🇹',
                'holanda': '🇳🇱', 'eua': '🇺🇸', 'estados unidos': '🇺🇸', 'argentina': '🇦🇷'
            };
            const paisLimpo = nomePais.toLowerCase().trim();
            return bandeiras[paisLimpo] || '🏳️';
        }

        function formatarDataSPA(stringData) {
            if (!stringData) return "--/--/----";
            const d = new Date(stringData);
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const ano = d.getFullYear();
            const hora = String(d.getHours()).padStart(2, '0');
            const minutos = String(d.getMinutes()).padStart(2, '0');
            return `${dia}/${mes}/${ano} - ${hora}h${minutos}`;
        }
    }, 100);
})();