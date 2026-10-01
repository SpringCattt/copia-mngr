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
            document.getElementById('nav-nome-utilizador').textContent = dados.nomeUtilizador;
            const imagem = document.getElementById('nav-url-imagem');
            imagem.innerHTML = `<img src="${dados.urlImagem}" alt="Avatar" id="nav-avatar-imagem">`;

            if (dados.tipoUtilizador === 'admin') {
                document.getElementById('nav-nome-clube').style.display = 'none';
                document.getElementById('btn-notificacoes').closest('div').style.display = 'none';
                document.getElementById('btn-convites').closest('div').style.display = 'none';
                document.title = 'MNGR - Administração';
            } else {
                document.getElementById('nav-nome-clube').textContent = dados.nomeClube;
                document.title = `MNGR - ${dados.nomeClube}`;
                configurarDropdownNotificacoes();
                if (dados.tipoUtilizador === 'gestor') {
                    document.getElementById('btn-convites').closest('div').style.display = 'none';
                } else {
                    configurarDropdownConvites();
                }
            }

            // Configurar o comportamento do Dropdown do Perfil
            configurarDropdownPerfil();

            // Renderizar as opções de Sidebar dependendo do perfil
            renderizarSidebarPorPerfil(dados.tipoUtilizador, dados.nomeClube, dados.logoClube, dados.idEquipa, dados.urlImagem);
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
    function renderizarLogoClube(url) {
        if (!url) return icones.clube;
        const isPng = url.toLowerCase().endsWith('.png');
        if (isPng) {
            return `<img src="${url}" class="sidebar-clube-logo" alt="Logo Clube">`;
        }
        return `<span class="sidebar-clube-logo-bola"><img src="${url}" alt="Logo Clube"></span>`;
    }

    function renderizarSidebarPorPerfil(tipo, nomeClube, logoClube, idEquipa, urlImagem) {
        const sidebarContainer = document.getElementById('sidebar-dinamica');
        const logoBrandLink = document.getElementById('brand-logo-link');
        if (!sidebarContainer) return;

        // Definição dos SVGs dos ícones para manter o padrão visual original
        const icones = {
            treino: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="M4,16c0,2.206,1.794,4,4,4s4-1.794,4-4-1.794-4-4-4-4,1.794-4,4Zm7,0c0,1.654-1.346,3-3,3s-3-1.346-3-3,1.346-3,3-3,3,1.346,3,3Zm-1-11h-1V0h1V5Zm2.961,1.198l-.875-.483L14.503,1.337l.875,.483-2.417,4.377Zm-6.899,0L3.646,1.821l.875-.483,2.416,4.377-.875,.483Zm2.174,1.802C3.977,8,.371,11.212,.029,15.312c-.192,2.297,.607,4.563,2.192,6.219,1.512,1.579,3.605,2.469,5.787,2.469,.106,0,.212-.002,.319-.006,2.855-.114,5.552-1.931,6.87-4.628,.55-1.126,.82-2.296,.802-3.479-.012-.771,.504-1.425,1.226-1.556l6.775-1.232v-5.099H8.236Zm14.764,4.264l-5.954,1.083c-1.206,.219-2.066,1.294-2.047,2.556,.016,1.038-.213,2.027-.701,3.024-1.159,2.371-3.519,3.968-6.012,4.067-2.01,.092-3.957-.705-5.344-2.154-1.387-1.448-2.086-3.433-1.918-5.443,.3-3.587,3.467-6.396,7.211-6.396h14.764v3.264Z"/></svg>`,
            calendario: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="M10.5,13h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM14.5,13h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM18.5,13h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM10.5,18h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM6.5,13h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM6.5,18h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM14.5,18h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM18.5,18h-1c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM19.5,2h-1.5V.5c0-.276-.224-.5-.5-.5s-.5,.224-.5,.5v1.5H7V.5c0-.276-.224-.5-.5-.5s-.5,.224-.5,.5v1.5h-1.5C2.019,2,0,4.019,0,6.5v13c0,2.481,2.019,4.5,4.5,4.5h15c2.481,0,4.5-2.019,4.5-4.5V6.5c0-2.481-2.019-4.5-4.5-4.5ZM4.5,3h15c1.93,0,3.5,1.57,3.5,3.5v1.5H1v-1.5c0-1.93,1.57-3.5,3.5-3.5Zm15,20H4.5c-1.93,0-3.5-1.57-3.5-3.5V9H23v10.5c0,1.93-1.57,3.5-3.5,3.5Z"/></svg>`,
            equipas: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="m8,13c0,2.206,1.794,4,4,4s4-1.794,4-4-1.794-4-4-4-4,1.794-4,4Zm4-3c1.654,0,3,1.346,3,3s-1.346,3-3,3-3-1.346-3-3,1.346-3,3-3Zm6-2c2.206,0,4-1.794,4-4s-1.794-4-4-4-4,1.794-4,4,1.794,4,4,4Zm0-7c1.654,0,3,1.346,3,3s-1.346,3-3,3-3-1.346-3-3,1.346-3,3-3Zm6,11.5v2.5h-1v-2.5c0-.827-.673-1.5-1.5-1.5h-3.849c-.124-.349-.277-.684-.461-1h4.309c1.379,0,2.5,1.121,2.5,2.5Zm-6,9v2.5h-1v-2.5c0-.827-.673-1.5-1.5-1.5h-7c-.827,0-1.5.673-1.5,1.5v2.5h-1v-2.5c0-1.379,1.121-2.5,2.5-2.5h7c1.379,0,2.5,1.121,2.5,2.5ZM6,8c2.206,0,4-1.794,4-4S8.206,0,6,0,2,1.794,2,4s1.794,4,4,4Zm0-7c1.654,0,3,1.346,3,3s-1.346,3-3,3-3-1.346-3-3,1.346-3,3-3Zm-3.5,10c-.827,0-1.5.673-1.5,1.5v2.5H0v-2.5c0-1.379,1.121-2.5,2.5-2.5h4.309c-.183.316-.337.651-.461,1h-3.849Z"/></svg>`,
            mensagens: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="m19.5,3.998h-1.528C17.723,1.751,15.812-.002,13.5-.002H4.5C2.019-.002,0,2.017,0,4.498v13.854c0,.609.333,1.166.871,1.453.244.131.511.195.777.195.319,0,.638-.093.914-.277l3.524-2.349c.409,2.063,2.233,3.623,4.414,3.623h6.849l4.089,2.726c.276.185.594.277.914.277.266,0,.533-.064.777-.195.537-.287.871-.844.871-1.453v-13.854c0-2.481-2.019-4.5-4.5-4.5ZM2.007,18.892c-.203.135-.45.148-.665.032-.214-.114-.342-.328-.342-.571V4.498c0-1.93,1.57-3.5,3.5-3.5h9c1.93,0,3.5,1.57,3.5,3.5v8c0,1.93-1.57,3.5-3.5,3.5h-6.937c-.154,0-.285.054-.345.087l-4.211,2.806Zm20.993,3.461c0,.243-.128.457-.342.571-.214.115-.463.102-.665-.032l-4.215-2.81c-.082-.055-.179-.084-.277-.084h-7c-1.76,0-3.221-1.306-3.464-3h6.464c2.481,0,4.5-2.019,4.5-4.5v-7.5h1.5c1.93,0,3.5,1.57,3.5,3.5v13.854Z"/></svg>`,
            estatisticas: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="m24,23.524c0,.276-.225.5-.5.5h0l-20-.024c-1.929,0-3.5-1.57-3.5-3.5V.5C0,.224.224,0,.5,0s.5.224.5.5v20c0,1.378,1.122,2.5,2.5,2.5l20.001.024c.275,0,.499.225.499.5ZM5,12.524v6.976c0,.276.224.5.5.5s.5-.224.5-.5v-6.976c0-.276-.224-.5-.5-.5s-.5.224-.5.5Zm5-2v8.976c0,.276.224.5.5.5s.5-.224.5-.5v-8.976c0-.276-.224-.5-.5-.5s-.5.224-.5.5Zm5,3v5.976c0,.276.224.5.5.5s.5-.224.5-.5v-5.976c0-.276-.224-.5-.5-.5s-.5.224-.5.5Zm5-4.024v10c0,.276.224.5.5.5s.5-.224.5-.5v-10c0-.276-.224-.5-.5-.5s-.5.224-.5.5Zm-15.5-.5c.128,0,.256-.049.354-.146l4.474-4.474c.371-.371.974-.371,1.345,0l2.948,2.949c.762.759,1.998.759,2.76,0L22.854.854c.195-.195.195-.512,0-.707s-.512-.195-.707,0l-6.474,6.474c-.371.371-.975.371-1.346,0l-2.948-2.948c-.761-.761-1.998-.761-2.759,0l-4.474,4.474c-.195.195-.195.512,0,.707.098.098.226.146.354.146Z"/></svg>`,
            definicoes: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="M21,12c0-.622-.071-1.26-.211-1.899l2.998-1.85-3.151-5.106-2.998,1.851c-.801-.647-1.685-1.145-2.638-1.481V0h-6V3.514c-.953,.337-1.837,.834-2.638,1.481l-2.998-1.851L.213,8.251l2.998,1.85c-.14,.64-.211,1.277-.211,1.899s.071,1.26,.211,1.899L.213,15.749l3.151,5.106,2.998-1.851c.801,.647,1.685,1.145,2.638,1.481v3.514h6v-3.514c.953-.337,1.837-.834,2.638-1.481l2.998,1.851,3.151-5.106-2.998-1.85c.14-.64,.211-1.277,.211-1.899Zm1.411,4.075l-2.101,3.403-2.769-1.708c-.968,.911-2.139,1.583-3.541,1.985v3.244h-4v-3.244c-1.278-.331-2.461-.983-3.541-1.985l-2.769,1.708-2.101-3.403,2.769-1.709s-.358-.93-.358-2.366,.358-2.366,.358-2.366l-2.769-1.709,2.101-3.403,2.769,1.708c.977-.884,2.15-1.553,3.541-1.985V1h4v3.244c1.276,.324,2.454,.993,3.541,1.985l2.769-1.708,2.101,3.403-2.769,1.709s.358,.956,.358,2.366-.358,2.366-.358,2.366l2.769,1.709ZM12,8c-2.206,0-4,1.794-4,4s1.794,4,4,4,4-1.794,4-4-1.794-4-4-4Zm0,7c-1.654,0-3-1.346-3-3s1.346-3,3-3,3,1.346,3,3-1.346,3-3,3Z"/></svg>`,
            utilizadores: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="M16.5,12A2.5,2.5,0,1,0,14,9.5,2.5,2.5,0,0,0,16.5,12Zm-9,0A2.5,2.5,0,1,0,5,9.5,2.5,2.5,0,0,0,7.5,12Zm0,2c-2.33,0-7,1.17-7,3.5V19H14.5V17.5C14.5,15.17,9.83,14,7.5,14Zm9,0c-.29,0-.62,0-.95.05A5.63,5.63,0,0,1,16.5,17.5V19H24V17.5C24,15.17,19.33,14,16.5,14Z"/></svg>`,
            dados: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="M19,3H14.82A3,3,0,0,0,12,1a3,3,0,0,0-2.82,2H5A2,2,0,0,0,3,5V19a2,2,0,0,0,2,2H19a2,2,0,0,0,2-2V5A2,2,0,0,0,19,3Zm-7,1a1,1,0,1,1-1,1A1,1,0,0,1,12,4Zm4,12H8V14h8Zm0-4H8V10h8Zm0-4H8V6h8Z"/></svg>`,
            bola: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="m12,0C5.373,0,0,5.373,0,12s5.373,12,12,12,12-5.373,12-12S18.627,0,12,0Zm10.962,11.254c-1.267.847-2.53,1.359-3.97,1.591-.038-4.106-1.586-8.139-4.387-11.52,4.576,1.117,8.031,5.096,8.357,9.93ZM12,1c.352,0,.699.02,1.043.053,3.185,3.406,4.945,7.625,4.955,11.91-.323.023-.653.038-.998.038-1.697,0-3.21-.711-4.522-1.329-.107-3.848-2.075-7.41-5.241-9.571,1.444-.698,3.055-1.1,4.763-1.1ZM1,12c0-3.957,2.107-7.422,5.251-9.36,1.265.78,2.337,1.796,3.179,2.975-3.839,2.573-6.471,5.891-7.853,9.875-.369-1.098-.577-2.269-.577-3.49Zm1.175,4.918c1.185-4.268,3.809-7.789,7.809-10.472.928,1.586,1.451,3.401,1.498,5.286-3.331,2.032-5.462,5.718-5.504,9.461-1.616-1.062-2.929-2.538-3.803-4.276Zm9.825,6.082c-1.804,0-3.503-.445-5.007-1.218-.09-1.722.343-3.484,1.176-5.065,2.014,1.342,4.815,2.228,7.321,2.279,1.73,0,3.843-.239,5.515-.697-1.991,2.838-5.282,4.701-9.004,4.701Zm3.51-5.004c-2.35-.048-4.973-.883-6.837-2.144.858-1.32,2.007-2.464,3.36-3.284,1.346.633,3.047,1.432,4.967,1.432,2.292,0,4.173-.489,5.978-1.566-.065,1.651-.489,3.208-1.206,4.595-2.029.683-4.134,1.017-6.262.967Zm-.021,1c.133.003-.133,0,0,0h0Z"/></svg>`,
            escalao: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="M13,6H11A2,2,0,0,0,9,8V24h6V8A2,2,0,0,0,13,6Z"/><path d="M22,0H20a2,2,0,0,0-2,2V24h6V2A2,2,0,0,0,22,0Z"/><path d="M4,12H2a2,2,0,0,0-2,2V24H6V14A2,2,0,0,0,4,12Z"/></svg>`, 
            clube: `<svg class="menu-icon" viewBox="0 0 24 24"><path d="M19.949,2.644,12,.009,4.051,2.644A2.982,2.982,0,0,0,2,5.476V12c0,7.524,9.2,11.679,9.594,11.852l.354.157.368-.122C12.711,23.755,22,20.577,22,12V5.476A2.983,2.983,0,0,0,19.949,2.644ZM20,12c0,6.263-6.349,9.216-7.953,9.861C10.44,21.058,4,17.494,4,12V5.476a.994.994,0,0,1,.684-.944L12,2.106l7.316,2.426A.992.992,0,0,1,20,5.476Z"/></svg>`
        };

        let htmlSidebar = '';

        if (tipo === 'gestor') {
            logoBrandLink.setAttribute('data-page', '/mngr/gestorClube/inicio');
            htmlSidebar = `
                <li class="menu-item active"><a href="#" data-page="/mngr/gestorClube/inicio">${renderizarLogoClube(logoClube)}<span class="menu-text">${nomeClube}</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/calendario">${icones.calendario}<span class="menu-text">Calendário</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/gestorClube/equipas">${icones.equipas}<span class="menu-text">Equipas</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/mensagens">${icones.mensagens}<span class="menu-text">Mensagens</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/estatisticas">${icones.estatisticas}<span class="menu-text">Estatísticas</span></a></li>
            `;
        } else if (tipo === 'treinador') {
            logoBrandLink.setAttribute('data-page', '/mngr/treinador/treinador_index');
            const equipaItem = idEquipa
                ? `<li class="menu-item"><a href="#" data-page="/mngr/treinador/equipa?id=${idEquipa}">${icones.equipas}<span class="menu-text">Equipa</span></a></li>`
                : '';
            htmlSidebar = `
                <li class="menu-item active"><a href="#" data-page="/mngr/treinador/treinador_index">${renderizarLogoClube(logoClube)}<span class="menu-text">${nomeClube}</span></a></li>
                ${equipaItem}
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/calendario">${icones.calendario}<span class="menu-text">Calendário</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/treinador/treinos">${icones.treino}<span class="menu-text">Treinos</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/mensagens">${icones.mensagens}<span class="menu-text">Mensagens</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/estatisticas">${icones.estatisticas}<span class="menu-text">Estatísticas</span></a></li>
           `;
        } else if (tipo === 'atleta') {
            logoBrandLink.setAttribute('data-page', '/mngr/atleta/inicio');
            const avatarAtleta = urlImagem
                ? `<img src="${urlImagem}" class="sidebar-clube-logo" alt="Avatar" style="border-radius:50%; object-fit:cover;">`
                : icones.estatisticas;
            const temEquipa = nomeClube && nomeClube !== 'Sem Clube';
            htmlSidebar = temEquipa ? `
                <li class="menu-item active"><a href="#" data-page="/mngr/atleta/inicio">${avatarAtleta}<span class="menu-text">Dashboard</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/calendario">${icones.calendario}<span class="menu-text">Calendário</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/mensagens">${icones.mensagens}<span class="menu-text">Mensagens</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/dashboard/estatisticas">${icones.estatisticas}<span class="menu-text">Estatísticas</span></a></li>
                ` : `
                <li class="menu-item active"><a href="#" data-page="/mngr/atleta/inicio">${avatarAtleta}<span class="menu-text">Dashboard</span></a></li>
              `;
        } else if (tipo === 'admin') {
            logoBrandLink.setAttribute('data-page', '/mngr/admin/inicio?tab=dashboard');
            htmlSidebar = `
                <li class="menu-item"><a href="#" data-page="/mngr/admin/inicio?tab=dashboard">${icones.estatisticas}<span class="menu-text">Dashboard</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/admin/inicio?tab=utilizadores">${icones.equipas}<span class="menu-text">Utilizadores</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/admin/inicio?tab=clubes">${icones.clube}<span class="menu-text">Clubes</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/admin/inicio?tab=desportos">${icones.bola}<span class="menu-text">Desportos</span></a></li>
                <li class="menu-item"><a href="#" data-page="/mngr/admin/inicio?tab=escaloes">${icones.escalao}<span class="menu-text">Escalões</span></a></li>
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
                evento.stopPropagation();
                const estaVisivel = dropdown.style.display === 'block';
                // Fechar os outros dropdowns
                const dropdownNotif = document.getElementById('dropdown-notificacoes');
                const dropdownConvites = document.getElementById('dropdown-convites');
                if (dropdownNotif) dropdownNotif.style.display = 'none';
                if (dropdownConvites) dropdownConvites.style.display = 'none';
                dropdown.style.display = estaVisivel ? 'none' : 'block';
            });

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
                const dropdownConvites = document.getElementById('dropdown-convites');
                const dropdownPerfil = document.getElementById('navProfileDropdown');
                if (dropdownConvites) dropdownConvites.style.display = 'none';
                if (dropdownPerfil) dropdownPerfil.style.display = 'none';

                dropdownNotif.style.display = estaVisivel ? 'none' : 'block';

                if (!estaVisivel) {
                    buscarNotificacoes();
                }
            });

            // Fecha se clicarem fora
            document.addEventListener('click', function (evento) {
                if (!dropdownNotif.contains(evento.target) && !btnSino.contains(evento.target)) {
                    dropdownNotif.style.display = 'none';
                }
            });
        }

        // Verifica silenciosamente as notificações 1 segundo após carregar a página
        setTimeout(buscarNotificacoes, 1000);
    }

    // =========================================================================
    // 3.6. EVENTO DO MENU DROPDOWN DE CONVITES (CARTA)
    // =========================================================================
    function configurarDropdownConvites() {
        const btnCarta = document.getElementById('btn-convites');
        const dropdownConvites = document.getElementById('dropdown-convites');

        if (btnCarta && dropdownConvites) {
            btnCarta.addEventListener('click', function (evento) {
                evento.stopPropagation();
                const estaVisivel = dropdownConvites.style.display === 'block';
                const dropdownNotif = document.getElementById('dropdown-notificacoes');
                const dropdownPerfil = document.getElementById('navProfileDropdown');
                if (dropdownNotif) dropdownNotif.style.display = 'none';
                if (dropdownPerfil) dropdownPerfil.style.display = 'none';

                dropdownConvites.style.display = estaVisivel ? 'none' : 'block';

                if (!estaVisivel) {
                    buscarConvitesPendentes();
                }
            });

            // Fecha se clicarem fora
            document.addEventListener('click', function (evento) {
                if (!dropdownConvites.contains(evento.target) && !btnCarta.contains(evento.target)) {
                    dropdownConvites.style.display = 'none';
                }
            });
        }

        // Verifica silenciosamente os convites 1 segundo após carregar a página
        setTimeout(buscarConvitesPendentes, 1000);
    }

    // =========================================================================
    // Função que vai ao servidor buscar as NOTIFICAÇÕES (sino)
    // =========================================================================
    async function buscarNotificacoes() {
        const lista = document.getElementById('lista-notificacoes');
        const badge = document.getElementById('badge-notificacoes');
        if (!lista) return;

        lista.innerHTML = '<li style="padding: 15px; text-align: center; color: #64748b;">A procurar...</li>';

        try {
            const res = await fetch('/mngr/api/notificacoes');
            const data = await res.json();

            if (data.success) {
                lista.innerHTML = '';

                const naoVistas = data.notificacoes.filter(n => !n.visto);
                if (badge) badge.style.display = naoVistas.length > 0 ? 'block' : 'none';

                if (data.notificacoes.length === 0) {
                    lista.innerHTML = '<li style="padding: 15px; text-align: center; color: #94a3b8; font-size: 13px;">Sem notificações de momento.</li>';
                } else {
                    data.notificacoes.forEach(notif => {
                        const vistoCss = notif.visto
                            ? 'background-color: #ffffff;'
                            : 'background-color: #f0f9ff;';
                        const dataFormatada = new Date(notif.enviado_em).toLocaleDateString('pt-PT', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        });
                        lista.innerHTML += `
                            <li style="padding: 15px; border-bottom: 1px solid #f1f5f9; ${vistoCss} cursor: pointer;"
                                onclick="marcarNotificacaoVista(${notif.id}, '${notif.url_destino || ''}')">
                                <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #334155;">${notif.titulo}</p>
                                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; line-height: 1.4;">${notif.mensagem}</p>
                                <span style="font-size: 11px; color: #94a3b8;">${dataFormatada}</span>
                            </li>
                        `;
                    });
                }
            }
        } catch (err) {
            console.error("Erro ao buscar notificações:", err);
            lista.innerHTML = '<li style="padding: 15px; text-align: center; color: #ef4444; font-size: 13px;">Erro ao carregar notificações.</li>';
        }
    }

    // Função Global para marcar notificação como vista e navegar (se tiver url_destino)
    window.marcarNotificacaoVista = async function(id_notificacao, url_destino) {
        try {
            await fetch('/mngr/api/notificacoes/marcar-vista', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_notificacao })
            });
        } catch (err) {
            console.error("Erro ao marcar notificação como vista:", err);
        }
        // Atualizar a lista e o badge
        buscarNotificacoes();
        // Navegar se houver destino
        if (url_destino) {
            document.getElementById('dropdown-notificacoes').style.display = 'none';

            // Se for feedback de treino, abrir modal inline sem navegar
            const params = new URLSearchParams(url_destino.split('?')[1] || '');
            const idAvaliar = params.get('avaliar');
            if (idAvaliar) {
                (async () => {
                    try {
                        const r = await fetch(`/mngr/api/evento/${idAvaliar}`);
                        const ev = await r.json();
                        if (typeof window.abrirModalFeedbackCalendario === 'function') {
                            window.abrirModalFeedbackCalendario(idAvaliar, ev.titulo || '', ev.data_hora || new Date().toISOString());
                        }
                    } catch (e) {
                        if (typeof window.abrirModalFeedbackCalendario === 'function') {
                            window.abrirModalFeedbackCalendario(idAvaliar, 'Treino', new Date().toISOString());
                        }
                    }
                })();
                return;
            }

            window.history.pushState({}, '', url_destino);
            carregarPedacoPagina(url_destino, conteudoCentral);
            sincronizarMenuAtivo(url_destino);
        }
    };

    // =========================================================================
    // Função que vai ao servidor buscar os CONVITES PENDENTES (carta)
    // =========================================================================
    async function buscarConvitesPendentes() {
        const lista = document.getElementById('lista-convites');
        const badge = document.getElementById('badge-convites');
        if (!lista) return;

        lista.innerHTML = '<li style="padding: 15px; text-align: center; color: #64748b;">A procurar...</li>';

        try {
            const res = await fetch('/mngr/api/notificacoes/convites');
            const data = await res.json();

            if (data.success) {
                lista.innerHTML = '';

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
                mostrarAlerta(data.message);
            }
        } catch (err) {
            mostrarAlerta('Erro de comunicação com o servidor.');
        }
    };


    // =========================================================================
    // 4. INTERCETAR CLIQUES EM LINKS DINÂMICOS (data-page)
    // =========================================================================
    document.addEventListener('click', function (evento) {
        const alvoLink = evento.target.closest('[data-page]');

        if (alvoLink) {
            evento.preventDefault();

            // 🆕 "Definições" não navega — abre o vídeo em ecrã grande (todos os perfis)
            if (alvoLink.closest('.menu-item.settings')) {
                abrirModalDefinicoesVideo();
                return;
            }

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
    window.carregarPedacoPagina = carregarPedacoPagina;
    window.appConteudoCentral = conteudoCentral;
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
                        // Adiciona timestamp para forçar re-execução — sem isto o browser
                        // ignora scripts com o mesmo src que já foram carregados antes
                        const sep = scriptAntigo.src.includes('?') ? '&' : '?';
                        novoScript.src = scriptAntigo.src + sep + '_t=' + Date.now();
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
        // Normalizar a URL para o caso de estar em detalhes
        let urlParaComparar = urlCaminho;
        if (urlCaminho.includes('equipa_detalhes')) {
            urlParaComparar = '/mngr/gestorClube/equipas';
        }
        if (urlCaminho === '/mngr/admin/inicio') {
            urlParaComparar = '/mngr/admin/inicio?tab=dashboard';
        }

        document.querySelectorAll('.sidebar-menu .menu-item').forEach(li => {
            li.classList.remove('active');
            const link = li.querySelector('a');
            if (!link) return;
            const dataPage = link.getAttribute('data-page') || '';
            const dataPageBase = dataPage.split('?')[0];
            const urlBase = urlParaComparar.split('?')[0];
            if (dataPage === urlParaComparar || dataPageBase === urlBase) {
                li.classList.add('active');
            }
        });
    }
});

// Iniciar o 'heartbeat' quando o utilizador entra na plataforma
// Proteção com flag global para não registar múltiplos intervalos na navegação SPA
if (!window.__heartbeatAtivo) {
    window.__heartbeatAtivo = true;
    setInterval(() => {
        fetch('/mngr/api/ping-tempo', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).catch(() => {
            // Ignorar silenciosamente se houver um corte de rede temporário
        });
    }, 60000); // 60000 milissegundos = 1 minuto exato
}

// =========================================================================
// 🌟 SISTEMA GLOBAL DE POPUPS (Substitui os alerts nativos)
// =========================================================================
window.mostrarAlerta = function(mensagem, tipo = 'erro', tituloCustom = null) {
    const modal = document.getElementById('modal-alerta-global');
    
    // Fallback de segurança: Se o modal não existir no ecrã, usa o nativo
    if (!modal) {
        alert(mensagem); 
        return;
    }

    const tituloEl = document.getElementById('titulo-alerta-global');
    const msgEl = document.getElementById('mensagem-alerta-global');
    const iconeEl = document.getElementById('icone-alerta-global');
    const btnBotao = document.getElementById('btn-fechar-alerta-global');

    // Injetar o texto da mensagem
    msgEl.textContent = mensagem;

    // Configurar o Design consoante o tipo de alerta
    if (tipo === 'sucesso') {
        tituloEl.textContent = tituloCustom || 'Sucesso!';
        iconeEl.textContent = '✅';
        btnBotao.style.backgroundColor = '#10b981'; // Verde
    } else if (tipo === 'aviso') {
        tituloEl.textContent = tituloCustom || 'Atenção';
        iconeEl.textContent = '⚠️';
        btnBotao.style.backgroundColor = '#f59e0b'; // Laranja
    } else {
        tituloEl.textContent = tituloCustom || 'Erro';
        iconeEl.textContent = '❌';
        btnBotao.style.backgroundColor = '#ef4444'; // Vermelho
    }

    // Mostrar o Modal
    modal.style.display = 'flex';
    modal.classList.remove('cal-mngr-hidden');

    // Fechar ao clicar no OK
    btnBotao.onclick = function() {
        modal.style.display = 'none';
        modal.classList.add('cal-mngr-hidden');
    };
};

// Função Global de Confirmação (Popup)
window.mostrarConfirmacao = function(mensagem) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '99999';

        const modal = document.createElement('div');
        modal.style.backgroundColor = '#ffffff';
        modal.style.padding = '24px 32px';
        modal.style.borderRadius = '8px';
        modal.style.width = '400px';
        modal.style.maxWidth = '90%';
        modal.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        modal.style.textAlign = 'center';
        modal.style.fontFamily = 'system-ui, -apple-system, sans-serif';

        const icone = document.createElement('div');
        icone.innerHTML = '⚠️';
        icone.style.fontSize = '32px';
        icone.style.marginBottom = '16px';

        const texto = document.createElement('p');
        texto.innerText = mensagem;
        texto.style.color = '#334155';
        texto.style.fontSize = '16px';
        texto.style.fontWeight = '500';
        texto.style.marginBottom = '24px';

        const divBotoes = document.createElement('div');
        divBotoes.style.display = 'flex';
        divBotoes.style.justifyContent = 'center';
        divBotoes.style.gap = '12px';

        const btnCancelar = document.createElement('button');
        btnCancelar.innerText = 'Cancelar';
        btnCancelar.style.padding = '8px 16px';
        btnCancelar.style.backgroundColor = '#94a3b8';
        btnCancelar.style.color = '#ffffff';
        btnCancelar.style.border = 'none';
        btnCancelar.style.borderRadius = '6px';
        btnCancelar.style.cursor = 'pointer';
        btnCancelar.style.fontWeight = 'bold';

        const btnConfirmar = document.createElement('button');
        btnConfirmar.innerText = 'Confirmar';
        btnConfirmar.style.padding = '8px 16px';
        btnConfirmar.style.backgroundColor = '#ef4444';
        btnConfirmar.style.color = '#ffffff';
        btnConfirmar.style.border = 'none';
        btnConfirmar.style.borderRadius = '6px';
        btnConfirmar.style.cursor = 'pointer';
        btnConfirmar.style.fontWeight = 'bold';

        btnCancelar.onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };

        btnConfirmar.onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };

        divBotoes.appendChild(btnCancelar);
        divBotoes.appendChild(btnConfirmar);
        modal.appendChild(icone);
        modal.appendChild(texto);
        modal.appendChild(divBotoes);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
};