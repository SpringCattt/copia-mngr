// public/mngr/js/atleta_detalhes.js
(function() {
    setTimeout(async function inicializarDetalhesAtleta() {
        console.log("=== [SPA] Módulo de Detalhes do Atleta Iniciado ===");

        const parametros = new URLSearchParams(window.location.search);
        const idAtleta = parametros.get('id');
        const idEquipaOrigem = parametros.get('idEquipa'); 

        if (!idAtleta) {
            console.error("ID do atleta em falta no URL.");
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

        // Seletores DOM
        const lblNome = document.getElementById('detalhe-nome');
        const lblIdade = document.getElementById('detalhe-idade');
        const lblModalidade = document.getElementById('detalhe-modalidade');
        const lblEquipa = document.getElementById('detalhe-equipa');
        const imgFoto = document.getElementById('foto-atleta');
        
        const lblNascimento = document.getElementById('detalhe-nascimento');
        const lblAltura = document.getElementById('detalhe-altura');
        const lblPeso = document.getElementById('detalhe-peso');
        const lblEntrada = document.getElementById('detalhe-entrada');
        const lblEmail = document.getElementById('detalhe-email');
        const lblCidade = document.getElementById('detalhe-cidade');

        const breadLinkEquipa = document.getElementById('breadcrumb-link-equipa');
        const breadLinkListagem = document.querySelector('.breadcrumbs a[href="/mngr/gestorClube/equipas"]');
        const breadNomeAtleta = document.getElementById('breadcrumb-nome-atleta');

        // Modais
        const modalEditar = document.getElementById('modal-editar-atleta');
        const btnAbrirEditar = document.getElementById('btn-abrir-editar-atleta');
        const btnFecharEditar = document.getElementById('btn-fechar-editar-atleta');
        const formEditar = document.getElementById('form-editar-atleta');

        const urlListagemGeral = '/mngr/gestorClube/equipas';
        const urlDestinoEquipa = idEquipaOrigem ? `/mngr/gestorClube/equipa_detalhes?id=${idEquipaOrigem}` : urlListagemGeral;
        
        if (breadLinkEquipa) {
            breadLinkEquipa.setAttribute('href', urlDestinoEquipa);
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
                        
                        // Varre e força a execução de todos os ficheiros javascript injetados por innerHTML
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

        if (breadLinkEquipa) breadLinkEquipa.addEventListener('click', (e) => navegarSPA(e, urlDestinoEquipa));
        if (breadLinkListagem) breadLinkListagem.addEventListener('click', (e) => navegarSPA(e, urlListagemGeral));

        async function carregarFichaAtleta() {
            try {
                const urlPedido = idEquipaOrigem ? `/mngr/api/atleta/detalhes/${idAtleta}?idEquipa=${idEquipaOrigem}` : `/mngr/api/atleta/detalhes/${idAtleta}`;
                const res = await fetch(urlPedido);
                const resultado = await res.json();

                if (!resultado.success) return;

                const { atleta, stats } = resultado.dados;

                // Preencher Perfil e Cabeçalhos
                lblNome.textContent = atleta.nome;
                breadNomeAtleta.textContent = atleta.nome;
                breadLinkEquipa.textContent = atleta.equipa_nome || "Equipa";
                lblIdade.textContent = atleta.idade ? `${atleta.idade} anos` : '-';
                lblModalidade.textContent = atleta.desporto_nome || 'Não definida';
                lblEquipa.textContent = atleta.equipa_nome || 'Sem Equipa';

                // 🌟 CORREÇÃO CRÍTICA DA FOTO:
                if (atleta.url_imagem && atleta.url_imagem.trim() !== '') {
                    imgFoto.src = atleta.url_imagem;
                } else {
                    imgFoto.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(atleta.nome)}&background=e2e8f0&color=0284c7&bold=true&size=200`;
                }

                imgFoto.alt = `Foto de ${atleta.nome}`;

                // Preencher Biografia com os campos existentes na BD
                lblNascimento.textContent = atleta.data_nascimento_formatada || 'Não definida';
                lblAltura.textContent = atleta.altura ? `${parseInt(atleta.altura)} cm` : 'Não definido';
                lblPeso.textContent = atleta.peso ? `${parseInt(atleta.peso)} kg` : 'Não definido';
                lblEntrada.textContent = atleta.data_entrada_formatada || 'Sem registo';
                lblEmail.textContent = atleta.email || 'Sem registo';
                lblCidade.textContent = atleta.cidade || 'Não informada';

                if (stats) {
                    document.getElementById('stat-jogos').textContent = stats.jogos || 0;
                    document.getElementById('stat-minutos').textContent = stats.minutos || 0;
                    document.getElementById('stat-golos').textContent = stats.golos || 0;
                    document.getElementById('stat-assists').textContent = stats.assistencias || 0;
                }
            } catch (err) { console.error(err); }
        }

        await carregarFichaAtleta();

        if (btnAbrirEditar) {
            btnAbrirEditar.addEventListener('click', () => {
                document.getElementById('edit-altura').value = parseInt(lblAltura.textContent) || '';
                document.getElementById('edit-peso').value = parseInt(lblPeso.textContent) || '';
                modalEditar.style.display = 'flex';
            });
        }

        if (btnFecharEditar) btnFecharEditar.addEventListener('click', () => modalEditar.style.display = 'none');

        if (formEditar) {
            formEditar.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btnSubmit = formEditar.querySelector('button[type="submit"]');
                if (btnSubmit) {
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = 'A guardar...';
                }

                const dadosForm = {
                    altura: document.getElementById('edit-altura').value || null,
                    peso: document.getElementById('edit-peso').value || null
                };

                try {
                    const response = await fetch(`/mngr/api/atleta/editar/${idAtleta}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dadosForm)
                    });
                    
                    const data = await response.json();

                    if (response.ok && data.success) {
                        modalEditar.style.display = 'none';
                        mostrarAlerta('Dados do atleta atualizados com sucesso!', 'sucesso');
                        await carregarFichaAtleta();
                    } else {
                        mostrarAlerta(data.message || 'Erro ao guardar alterações.', 'erro');
                    }
                } catch (err) {
                    mostrarAlerta('Erro de ligação ao servidor.', 'erro');
                } finally {
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.textContent = 'Guardar';
                    }
                }
            });
        }
    }, 0);
})();