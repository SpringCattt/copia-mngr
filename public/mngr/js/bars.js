// public/mngr/js/bars.js

document.addEventListener("DOMContentLoaded", function () {
    const conteudoCentral = document.querySelector('.app-conteudo');

    if (!conteudoCentral) {
        console.error("Erro Crítico: Não foi encontrado o container '.app-conteudo' no teu dashboard.html.");
        return;
    }

    // =========================================================================
    // 1. CARREGAR A NAVBAR E A SIDEBAR FIXAS (A Moldura do SPA)
    // =========================================================================
    Promise.all([
        fetch('/mngr/components/navbar.html').then(res => {
            if (!res.ok) throw new Error("Navbar não encontrada");
            return res.text();
        }),
        fetch('/mngr/components/sidebar.html').then(res => {
            if (!res.ok) throw new Error("Sidebar não encontrada");
            return res.text();
        })
    ])
    .then(([navbarHtml, sidebarHtml]) => {
        document.getElementById('navbar-placeholder').innerHTML = navbarHtml;
        document.getElementById('sidebar-placeholder').innerHTML = sidebarHtml;

        // 🌟 DETETAR A ROTA ATUAL DO BROWSER E MAPEAR PARA O /VIEW CORRETO
        const urlAtual = window.location.pathname; 
        let rotaMiolo = '/mngr/treinador/treinador_index/view'; // Rota padrão por omissão

        if (urlAtual.includes('/treinador/treinador_jogo')) {
            rotaMiolo = '/mngr/treinador/treinador_jogo/view';
        } else if (urlAtual.includes('/gestorClube/equipas')) {
            rotaMiolo = '/mngr/gestorClube/equipas/view';
        } else if (urlAtual.includes('/gestorClube/equipa_detalhes')) {
            rotaMiolo = '/mngr/gestorClube/equipa_detalhes/view';
        }

        // Faz o fetch inicial anexando os query params (?escalao=Sub-18), se existirem
        carregarPedacoPagina(rotaMiolo + window.location.search, conteudoCentral);
        sincronizarMenuAtivo(urlAtual);
    })
    .catch(err => console.error('Erro ao montar a estrutura base do Dashboard:', err));


    // =========================================================================
    // 2. INTERCETAR CLIQUES EM LINKS DINÂMICOS (data-page)
    // =========================================================================
    document.addEventListener('click', function (evento) {
        // Deteta se o clique foi num elemento que tem [data-page] ou dentro dele (como um span ou icon)
        const alvoLink = evento.target.closest('[data-page]');
        
        if (alvoLink) {
            evento.preventDefault();
            
            let paginaAlvo = alvoLink.getAttribute('data-page'); // Ex: /mngr/dashboard/gestorClube/equipas
            
            if (paginaAlvo) {
                // Se o link contiver parâmetros de query (ex: ?escalao=Sub-18), limpamos para tratar em separado
                let queryParams = '';
                const pontoInterrogacao = paginaAlvo.indexOf('?');
                if (pontoInterrogacao !== -1) {
                    queryParams = paginaAlvo.substring(pontoInterrogacao);
                    paginaAlvo = paginaAlvo.substring(0, pontoInterrogacao);
                }

                // Atualiza a URL visível na barra do browser sem fazer reload
                window.history.pushState({}, '', paginaAlvo + queryParams);
                
                // Transforma a rota do browser (/mngr/dashboard/...) na rota de visualização do Express (.../view)
                let rotaMiolo = paginaAlvo.replace('/mngr/dashboard', '/mngr') + '/view';
                
                // Evita duplicar barras desnecessárias caso ocorra um erro de escrita
                rotaMiolo = rotaMiolo.replace('//', '/');

                carregarPedacoPagina(rotaMiolo + queryParams, conteudoCentral);
                sincronizarMenuAtivo(paginaAlvo);
            }
        }
    });


    // =========================================================================
    // 3. TRATAR O BOTÃO DE RECUAR/AVANÇAR DO BROWSER (popstate)
    // =========================================================================
    window.addEventListener('popstate', function() {
        const urlAtual = window.location.pathname;
        
        // Transforma a URL do histórico de volta para o endpoint do Express com /view
        let rotaMiolo = urlAtual.replace('/mngr/dashboard', '/mngr') + '/view';
        rotaMiolo = rotaMiolo.replace('//', '/');

        carregarPedacoPagina(rotaMiolo + window.location.search, conteudoCentral);
        sincronizarMenuAtivo(urlAtual);
    });


    // =========================================================================
    // 4. FUNÇÕES AUXILIARES (Carregamento de HTML e Injeção de Scripts)
    // =========================================================================
    function carregarPedacoPagina(url, container) {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Não foi possível encontrar a página de destino (Status: ${response.status}).`);
                return response.text();
            })
            .then(html => {
                // Injeta o HTML puro enviado pelo teu controller
                container.innerHTML = html;

                // 🌟 EXECUÇÃO DE SCRIPTS EMBUTIDOS
                // O innerHTML não executa blocos <script> por segurança, por isso recriamos os elementos manualmente
                const scripts = container.querySelectorAll('script');
                scripts.forEach(scriptAntigo => {
                    const novoScript = document.createElement('script');
                    if (scriptAntigo.src) {
                        // Se for um script externo (<script src="..."></script>)
                        novoScript.src = scriptAntigo.src;
                    } else {
                        // Se for código inline direto na página
                        novoScript.text = scriptAntigo.text;
                    }
                    document.body.appendChild(novoScript).parentNode.removeChild(novoScript);
                });
            })
            .catch(error => {
                console.error("Erro na navegação do painel:", error);
                container.innerHTML = `
                    <div style="padding: 30px; text-align: center; color: #627d98;">
                        <h2>Módulo Temporariamente Indisponível</h2>
                        <p>Não conseguimos carregar os dados a partir de: <strong>${url}</strong></p>
                        <p style="font-size: 13px; color: #9fb3c8;">Verifica se o teu indexRoutes.js tem a rota correta configurada.</p>
                    </div>
                `;
            });
    }

    // Sincroniza e ilumina a opção correta na tua Sidebar fixa
    function sincronizarMenuAtivo(urlCaminho) {
        document.querySelectorAll('.sidebar-menu .menu-item').forEach(li => {
            li.classList.remove('active');
            const link = li.querySelector('a');
            if (link && link.getAttribute('data-page') === urlCaminho) {
                li.classList.add('active');
            }
        });
    }
});