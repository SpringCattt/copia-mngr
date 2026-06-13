// public/mngr/js/bars.js

document.addEventListener("DOMContentLoaded", function () {
    const conteudoCentral = document.querySelector('.app-conteudo');

    if (!conteudoCentral) {
        console.error("Erro Crítico: Não foi encontrado o container '.app-conteudo' no teu dashboard.html.");
        return;
    }

    const opcoesFetchSPA = {
        headers: { 'X-Solicitado-Por': 'SPA' }
    };

// =========================================================================
// 1. CARREGAR A MOLDURA E CONFIGURAR O PERFIL DINÂMICO
// =========================================================================
Promise.all([
    fetch('/mngr/components/navbar.html', opcoesFetchSPA).then(res => {
        if (!res.ok) throw new Error("Navbar não encontrada");
        return res.text();
    }),
    fetch('/mngr/components/sidebar.html', opcoesFetchSPA).then(res => {
        if (!res.ok) throw new Error("Sidebar não encontrada");
        return res.text();
    })
])
.then(async ([navbarHtml, sidebarHtml]) => {
    document.getElementById('navbar-placeholder').innerHTML = navbarHtml;
    document.getElementById('sidebar-placeholder').innerHTML = sidebarHtml;

    // Pede os dados reais da sessão à API do Backend
    try {
        const dadosRes = await fetch('/mngr/api/layout-dados');
        const dados = await dadosRes.json();

        if (dados.success) {
            // Injetar dados na Navbar
            document.getElementById('nav-nome-clube').textContent = dados.nomeClube;
            document.getElementById('nav-nome-utilizador').textContent = dados.nomeUtilizador;

            // 🌟 ADICIONA ESTA LINHA AQUI PARA ATUALIZAR O TITULO DA PÁGINA:
            document.title = `MNGR - ${dados.nomeClube}`;

            // Configurar o comportamento do Dropdown do Perfil
            configurarDropdownPerfil();

            //Configurar o Dropdown das Notificações
            configurarDropdownNotificacoes();

            // Renderizar as opções de Sidebar dependendo do perfil
            renderizarSidebarPorPerfil(dados.tipoUtilizador, dados.nomeClube);
        }
    } catch (apiErr) {
        console.error("Erro ao puxar dados de sessão para o layout:", apiErr);
    }

    // Executar o roteamento inicial com base na URL activa do browser
    const urlAtual = window.location.pathname; 
    let rotaMiolo = urlAtual;

    if (urlAtual === '/mngr/dashboard') {
        rotaMiolo = '/mngr/treinador/treinador_index'; 
    }

    carregarPedacoPagina(rotaMiolo + window.location.search, conteudoCentral);
})
.catch(err => console.error('Erro ao montar a estrutura base do Dashboard:', err));


    // =========================================================================
    // 2. DICIONÁRIO DE RENDERIZAÇÃO DA SIDEBAR CONFORME O PERFIL
    // =========================================================================
    function renderizarSidebarPorPerfil(tipo, nomeClube) {
        const sidebarContainer = document.getElementById('sidebar-dinamica');
        const logoBrandLink = document.getElementById('brand-logo-link');
        if (!sidebarContainer) return;

        // Definição dos SVGs dos ícones para manter o padrão visual original
        const icones = {
            clube: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="M4,16c0,2.206,1.794,4,4,4s4-1.794,4-4-1.794-4-4-4-4,1.794-4,4Zm7,0c0,1.654-1.346,3-3,3s-3-1.346-3-3,1.346-3,3-3,3,1.346,3,3Zm-1-11h-1V0h1V5Zm2.961,1.198l-.875-.483L14.503,1.337l.875,.483-2.417,4.377Zm-6.899,0L3.646,1.821l.875-.483,2.416,4.377-.875,.483Zm2.174,1.802C3.977,8,.371,11.212,.029,15.312c-.192,2.297,.607,4.563,2.192,6.219,1.512,1.579,3.605,2.469,5.787,2.469,.106,0,.212-.002,.319-.006,2.855-.114,5.552-1.931,6.87-4.628,.55-1.126,.82-2.296,.802-3.479-.012-.771,.504-1.425,1.226-1.556l6.775-1.232v-5.099H8.236Zm14.764,4.264l-5.954,1.083c-1.206,.219-2.066,1.294-2.047,2.556,.016,1.038-.213,2.027-.701,3.024-1.159,2.371-3.519,3.968-6.012,4.067-2.01,.092-3.957-.705-5.344-2.154-1.387-1.448-2.086-3.433-1.918-5.443,.3-3.587,3.467-6.396,7.211-6.396h14.764v3.264Z"/></svg>`,
            calendario: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="M10.5,13h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM14.5,13h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM18.5,13h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM10.5,18h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM6.5,13h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM6.5,18h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM14.5,18h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM18.5,18h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM19.5,2h-1.5V.5c0-.276-.224-.5-.5-.5s-.5,.224-.5,.5v1.5H7V.5c0-.276-.224-.5-.5-.5s-.5,.224-.5,.5v1.5h-1.5C2.019,2,0,4.019,0,6.5v13c0,2.481,2.019,4.5,4.5,4.5h15c2.481,0,4.5-2.019,4.5-4.5V6.5c0-2.481-2.019-4.5-4.5-4.5ZM4.5,3h15c1.93,0,3.5,1.57,3.5,3.5v1.5H1v-1.5c0-1.93,1.57-3.5,3.5-3.5Zm15,20H4.5c-1.93,0-3.5-1.57-3.5-3.5V9H23v10.5c0,1.93-1.57,3.5-3.5,3.5Z"/></svg>`,
            equipas: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="m8,13c0,2.206,1.794,4,4,4s4-1.794,4-4-1.794-4-4-4-4,1.794-4,4Zm4-3c1.654,0,3,1.346,3,3s-1.346,3-3,3-3-1.346-3-3,1.346-3,3-3Zm6-2c2.206,0,4-1.794,4-4s-1.794-4-4-4-4,1.794-4,4,1.794,4,4,4Zm0-7c1.654,0,3,1.346,3,3s-1.346,3-3,3-3-1.346-3-3,1.346-3,3-3Zm6,11.5v2.5h-1v-2.5c0-.827-.673-1.5-1.5-1.5h-3.849c-.124-.349-.277-.684-.461-1h4.309c1.379,0,2.5,1.121,2.5,2.5Zm-6,9v2.5h-1v-2.5c0-.827-.673-1.5-1.5-1.5h-7c-.827,0-1.5.673-1.5,1.5v2.5h-1v-2.5c0-1.379,1.121-2.5,2.5-2.5h7c1.379,0,2.5,1.121,2.5,2.5ZM6,8c2.206,0,4-1.794,4-4S8.206,0,6,0,2,1.794,2,4s1.794,4,4,4Zm0-7c1.654,0,3,1.346,3,3s-1.346,3-3,3-3-1.346-3-3,1.346-3,3-3Zm-3.5,10c-.827,0-1.5.673-1.5,1.5v2.5H0v-2.5c0-1.379,1.121-2.5,2.5-2.5h4.309c-.183.316-.337.651-.461,1h-3.849Z"/></svg>`,
            mensagens: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="m19.5,3.998h-1.528C17.723,1.751,15.812-.002,13.5-.002H4.5C2.019-.002,0,2.017,0,4.498v13.854c0,.609.333,1.166.871,1.453.244.131.511.195.777.195.319,0,.638-.093.914-.277l3.524-2.349c.409,2.063,2.233,3.623,4.414,3.623h6.849l4.089,2.726c.276.185.594.277.914.277.266,0,.533-.064.777-.195.537-.287.871-.844.871-1.453v-13.854c0-2.481-2.019-4.5-4.5-4.5ZM2.007,18.892c-.203.135-.45.148-.665.032-.214-.114-.342-.328-.342-.571V4.498c0-1.93,1.57-3.5,3.5-3.5h9c1.93,0,3.5,1.57,3.5,3.5v8c0,1.93-1.57,3.5-3.5,3.5h-6.937c-.154,0-.285.054-.345.087l-4.211,2.806Zm20.993,3.461c0,.243-.128.457-.342.571-.214.115-.463.102-.665-.032l-4.215-2.81c-.082-.055-.179-.084-.277-.084h-7c-1.76,0-3.221-1.306-3.464-3h6.464c2.481,0,4.5-2.019,4.5-4.5v-7.5h1.5c1.93,0,3.5,1.57,3.5,3.5v13.854Z"/></svg>`,
            estatisticas: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="m24,23.524c0,.276-.225.5-.5.5h0l-20-.024c-1.929,0-3.5-1.57-3.5-3.5V.5C0,.224.224,0,.5,0s.5.224.5.5v20c0,1.378,1.122,2.5,2.5,2.5l20.001.024c.275,0,.499.225.499.5ZM5,12.524v6.976c0,.276.224.5.5.5s.5-.224.5-.5v-6.976c0-.276-.224-.5-.5-.5s-.5.224-.5.5Zm5-2v8.976c0,.276.224.5.5.5s.5-.224.5-.5v-8.976c0-.276-.224-.5-.5-.5s-.5.224-.5.5Zm5,3v5.976c0,.276.224.5.5.5s.5-.224.5-.5v-5.976c0-.276-.224-.5-.5-.5s-.5.224-.5.5Zm5-4.024v10c0,.276.224.5.5.5s.5-.224.5-.5v-10c0-.276-.224-.5-.5-.5s-.5.224-.5.5Zm-15.5-.5c.128,0,.256-.049.354-.146l4.474-4.474c.371-.371.974-.371,1.345,0l2.948,2.949c.762.759,1.998.759,2.76,0L22.854.854c.195-.195.195-.512,0-.707s-.512-.195-.707,0l-6.474,6.474c-.371.371-.975.371-1.346,0l-2.948-2.948c-.761-.761-1.998-.761-2.759,0l-4.474,4.474c-.195.195-.195.512,0,.707.098.098.226.146.354.146Z"/></svg>`,
            definicoes: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="M21,12c0-.622-.071-1.26-.211-1.899l2.998-1.85-3.151-5.106-2.998,1.851c-.801-.647-1.685-1.145-2.638-1.481V0h-6V3.514c-.953,.337-1.837,.834-2.638,1.481l-2.998-1.851L.213,8.251l2.998,1.85c-.14,.64-.211,1.277-.211,1.899s.071,1.26,.211,1.899L.213,15.749l3.151,5.106,2.998-1.851c.801,.647,1.685,1.145,2.638,1.481v3.514h6v-3.514c.953-.337,1.837-.834,2.638-1.481l2.998,1.851,3.151-5.106-2.998-1.85c.14-.64,.211-1.277,.211-1.899Zm1.411,4.075l-2.101,3.403-2.769-1.708c-.968,.911-2.139,1.583-3.541,1.985v3.244h-4v-3.244c-1.278-.331-2.461-.983-3.541-1.985l-2.769,1.708-2.101-3.403,2.769-1.709s-.358-.93-.358-2.366,.358-2.366,.358-2.366l-2.769-1.709,2.101-3.403,2.769,1.708c.977-.884,2.15-1.553,3.541-1.985V1h4v3.244c1.276,.324,2.454,.993,3.541,1.985l2.769-1.708,2.101,3.403-2.769,1.709s.358,.956,.358,2.366-.358,2.366-.358,2.366l2.769,1.709ZM12,8c-2.206,0-4,1.794-4,4s1.794,4,4,4,4-1.794,4-4-1.794-4-4-4Zm0,7c-1.654,0-3-1.346-3-3s1.346-3,3-3,3,1.346,3,3-1.346,3-3,3Z"/></svg>`
        };

        let htmlSidebar = '';

        if (tipo === 'gestor') {
            logoBrandLink.setAttribute('data-page', '#');
            htmlSidebar = `
                <li class="menu-item active"><a href="#" data-page="#">${icones.clube}<span class="menu-text">${nomeClube}</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/calendario">${icones.calendario}<span class="menu-text">Calendário</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/gestorClube/equipas">${icones.equipas}<span class="menu-text">Equipas</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/mensagens">${icones.mensagens}<span class="menu-text">Mensagens</span></a></li>
                <li class="menu-item"><a href="#" data-page="#">${icones.estatisticas}<span class="menu-text">Estatísticas</span></a></li>
                <li class="menu-item settings"><a href="#" data-page="#">${icones.definicoes}<span class="menu-text">Definições</span></a></li>
            `;
        } else if (tipo === 'treinador') {
            logoBrandLink.setAttribute('data-page', '/mngr/treinador/treinador_index');
            htmlSidebar = `
                <li class="menu-item active"><a href="#" data-page="/mngr/treinador/treinador_index">${icones.clube}<span class="menu-text">${nomeClube}</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/calendario">${icones.calendario}<span class="menu-text">Calendário</span></a></li>
                <li class="menu-item"><a href="#" data-page="#">${icones.equipas}<span class="menu-text">Equipa</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/mensagens">${icones.mensagens}<span class="menu-text">Mensagens</span></a></li>
                <li class="menu-item"><a href="#" data-page="#">${icones.estatisticas}<span class="menu-text">Estatísticas</span></a></li>
                <li class="menu-item settings"><a href="#" data-page="#">${icones.definicoes}<span class="menu-text">Definições</span></a></li>
            `;
        } else if (tipo === 'atleta') {
            logoBrandLink.setAttribute('data-page', '/mngr/atleta/inicio');
            htmlSidebar = `
                <li class="menu-item active"><a href="#" data-page="/mngr/atleta/inicio">${icones.clube}<span class="menu-text">${nomeClube}</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/calendario">${icones.calendario}<span class="menu-text">Calendário</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/mensagens">${icones.mensagens}<span class="menu-text">Mensagens</span></a></li>
                <li class="menu-item"><a href="#" data-page="#">${icones.estatisticas}<span class="menu-text">Estatísticas</span></a></li>
                <li class="menu-item settings"><a href="#" data-page="#">${icones.definicoes}<span class="menu-text">Definições</span></a></li>
            `;
        }

        sidebarContainer.innerHTML = htmlSidebar;
        sincronizarMenuAtivo(window.location.pathname + window.location.search);
    }

    // =========================================================================
    // 3. EVENTO DO MENU DROPDOWN DO PERFIL
    // =========================================================================
    function configurarDropdownPerfil() {
        const btnPerfil = document.getElementById('userProfileBtn');
        const dropdown = document.getElementById('navProfileDropdown');

        if (btnPerfil && dropdown) {
            btnPerfil.addEventListener('click', function (evento) {
                evento.stopPropagation(); // Evita propagação para o document
                const estaVisivel = dropdown.style.display === 'block';
                dropdown.style.display = estaVisivel ? 'none' : 'block';
            });

            // Fecha o dropdown de forma intuitiva caso cliquem fora dele
            document.addEventListener('click', function () {
                dropdown.style.display = 'none';
            });
        }
    }
    // =========================================================================
    // 3.5. EVENTO DO MENU DROPDOWN DE NOTIFICAÇÕES (SINO)
    // =========================================================================
    function configurarDropdownNotificacoes() {
        const btnSino = document.getElementById('btn-notificacoes');
        const dropdownNotif = document.getElementById('dropdown-notificacoes');

        if (btnSino && dropdownNotif) {
            btnSino.addEventListener('click', function (evento) {
                evento.stopPropagation(); 
                const estaVisivel = dropdownNotif.style.display === 'block';
                dropdownNotif.style.display = estaVisivel ? 'none' : 'block';
                
                // Se está a abrir, vai buscar as novidades à Base de Dados
                if (!estaVisivel) {
                    buscarConvitesPendentes();
                }
            });

            // Fecha se clicarem fora
            document.addEventListener('click', function (evento) {
                if (!dropdownNotif.contains(evento.target) && !btnSino.contains(evento.target)) {
                    dropdownNotif.style.display = 'none';
                }
            });
        }

        // Verifica silenciosamente os convites 1 segundo após carregar a página
        setTimeout(buscarConvitesPendentes, 1000);
    }

    // Função que vai ao servidor ver se há convites
    async function buscarConvitesPendentes() {
        const lista = document.getElementById('lista-notificacoes');
        const badge = document.getElementById('badge-notificacoes');
        if (!lista) return;

        lista.innerHTML = '<li style="padding: 15px; text-align: center; color: #64748b;">A procurar...</li>';

        try {
            const res = await fetch('/mngr/api/notificacoes/convites');
            const data = await res.json();

            if (data.success) {
                lista.innerHTML = '';
                
                // Mostrar ou esconder a bolinha vermelha
                if (badge) badge.style.display = data.convites.length > 0 ? 'block' : 'none';

                if (data.convites.length === 0) {
                    lista.innerHTML = '<li style="padding: 15px; text-align: center; color: #94a3b8; font-size: 13px;">Sem convites de momento.</li>';
                } else {
                    data.convites.forEach(convite => {
                        lista.innerHTML += `
                            <li style="padding: 15px; border-bottom: 1px solid #f1f5f9;">
                                <p style="margin: 0 0 10px 0; font-size: 13px; color: #334155; line-height: 1.4;">
                                    O clube <strong>${convite.clube_nome}</strong> convidou-te para a equipa <strong>${convite.equipa_nome}</strong>.
                                </p>
                                <div style="display: flex; gap: 8px;">
                                    <button onclick="responderConvite(${convite.id_convite}, 'Aceitar')" style="flex: 1; padding: 8px; background-color: #16a34a; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: opacity 0.2s;">Aceitar</button>
                                    <button onclick="responderConvite(${convite.id_convite}, 'Rejeitar')" style="flex: 1; padding: 8px; background-color: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: opacity 0.2s;">Rejeitar</button>
                                </div>
                            </li>
                        `;
                    });
                }
            }
        } catch (err) {
            console.error("Erro ao buscar convites:", err);
            lista.innerHTML = '<li style="padding: 15px; text-align: center; color: #ef4444; font-size: 13px;">Erro ao carregar convites.</li>';
        }
    }

    // Função Global (window) para os botões do HTML conseguirem chamá-la
    window.responderConvite = async function(id_convite, resposta) {
        try {
            const res = await fetch('/mngr/api/notificacoes/responder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_convite, resposta })
            });
            const data = await res.json();
            
            if (data.success) {
                // Se aceitou, dá refresh à página toda para o layout (Sidebar/Nome do Clube) atualizar automaticamente!
                if (resposta === 'Aceitar') {
                    window.location.reload(); 
                } else {
                    buscarConvitesPendentes(); // Se rejeitou, apenas atualiza a lista de convites
                }
            } else {
                alert(data.message);
            }
        } catch (err) {
            alert('Erro de comunicação com o servidor.');
        }
    };


    // =========================================================================
    // 4. INTERCETAR CLIQUES EM LINKS DINÂMICOS (data-page)
    // =========================================================================
    document.addEventListener('click', function (evento) {
        const alvoLink = evento.target.closest('[data-page]');
        
        if (alvoLink) {
            evento.preventDefault();
            let paginaAlvo = alvoLink.getAttribute('data-page');
            
            // Evita que links sem rota definida ("#") limpem ou quebrem o miolo do SPA
            if (!paginaAlvo || paginaAlvo === '#') return;
            
            let queryParams = '';
            const pontoInterrogacao = paginaAlvo.indexOf('?');
            if (pontoInterrogacao !== -1) {
                queryParams = paginaAlvo.substring(pontoInterrogacao);
                paginaAlvo = paginaAlvo.substring(0, pontoInterrogacao);
            }

            window.history.pushState({}, '', paginaAlvo + queryParams);
            
            carregarPedacoPagina(paginaAlvo + queryParams, conteudoCentral);
            sincronizarMenuAtivo(paginaAlvo + queryParams);
        }
    });


    // =========================================================================
    // 5. TRATAR O BOTÃO DE RECUAR/AVANÇAR DO BROWSER (popstate)
    // =========================================================================
    window.addEventListener('popstate', function() {
        const urlAtual = window.location.pathname;
        carregarPedacoPagina(urlAtual + window.location.search, conteudoCentral);
        sincronizarMenuAtivo(urlAtual + window.location.search);
    });


    // =========================================================================
    // 6. FUNÇÃO AUXILIAR DE INJEÇÃO
    // =========================================================================
    function carregarPedacoPagina(url, container) {
        if (!url || url === '#') return;

        fetch(url, opcoesFetchSPA)
            .then(response => {
                if (!response.ok) throw new Error(`Status: ${response.status}`);
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;

                const scripts = container.querySelectorAll('script');
                scripts.forEach(scriptAntigo => {
                    const novoScript = document.createElement('script');
                    if (scriptAntigo.src) {
                        novoScript.src = scriptAntigo.src;
                    } else {
                        novoScript.text = scriptAntigo.text;
                    }
                    document.body.appendChild(novoScript).parentNode.removeChild(novoScript);
                });
            })
            .catch(error => {
                console.error("Erro na navegação:", error);
                container.innerHTML = `
                    <div style="padding: 30px; text-align: center; color: #627d98;">
                        <h2>Módulo Temporariamente Indisponível</h2>
                        <p>Não conseguimos processar o pedido para: <strong>${url}</strong></p>
                    </div>
                `;
            });
    }

    function sincronizarMenuAtivo(urlCaminho) {
        document.querySelectorAll('.sidebar-menu .menu-item').forEach(li => {
            li.classList.remove('active');
            const link = li.querySelector('a');
            if (link && link.getAttribute('data-page') === urlCaminho && urlCaminho !== '#') {
                li.classList.add('active');
            }
        });
    }
});