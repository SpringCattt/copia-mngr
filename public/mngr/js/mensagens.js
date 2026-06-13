(function() {
    setTimeout(async function inicializarChat() {
        console.log("=== [SPA] Módulo de Chat Dinâmico com Auto-Refresh Iniciado ===");

        let contactoAtivoId = null; 
        let conversaAtivaId = null; 
        let totalMensagensAtuais = 0; 
        
        const btnEnviar = document.querySelector('.btn-send');
        const inputMensagem = document.querySelector('.message-input');
        const inputPesquisaConversa = document.getElementById('pesquisaConversaAtiva');

        const modalNovaConversa = document.getElementById('modalNovaConversa');
        const btnAbrirModal = document.querySelector('.btn-new-chat');
        const btnFecharModal = document.getElementById('btnFecharModal');
        
        const gridDesportos = document.getElementById('gridDesportos');
        const listaNovosContactos = document.getElementById('listaNovosContactos');
        const modalNavHeader = document.getElementById('modalNavHeader');
        const btnVoltarDesportos = document.getElementById('btnVoltarDesportos');
        const tituloDesportoAtivo = document.getElementById('tituloDesportoAtivo');

        let todosContactosCache = []; 

        await carregarListaDeContactos();

        // 🔄 LOOP DE ATUALIZAÇÃO AUTOMÁTICA
        setInterval(async () => {
            await carregarListaDeContactos();
            if (contactoAtivoId) {
                await carregarHistoricoComContacto(contactoAtivoId, true);
            }
        }, 3000); 

        async function carregarListaDeContactos() {
            try {
                // CORREÇÃO 1: Rota ajustada para /mensagens/
                const res = await fetch('/mngr/api/mensagens/contactos');
                const dados = await res.json();
                const chatList = document.querySelector('.chat-list');
                
                const itemAtivoAntes = document.querySelector('.chat-item.active');
                const idAtivoAntes = itemAtivoAntes ? itemAtivoAntes.getAttribute('data-id') : null;

                chatList.innerHTML = ''; 

                if (dados.contactos.length === 0) {
                    chatList.innerHTML = '<p style="padding:20px; color:var(--text-muted); text-align:center;">Sem conversas ativas.</p>';
                    return;
                }

                dados.contactos.forEach(c => {
                    const iniciais = c.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    const classeAtiva = (c.id == idAtivoAntes) ? 'active' : '';
                    
                    const badge = (c.unread_count > 0 && c.id != idAtivoAntes) 
                        ? `<span class="unread-badge">${c.unread_count}</span>` 
                        : '';
                    
                    chatList.innerHTML += `
                        <div class="chat-item ${classeAtiva}" data-id="${c.id}">
                            <img src="../images/${c.id}.jpg" alt="Foto" class="chat-avatar" onerror="this.src='https://dummyimage.com/100x100/e2e8f0/627d98.png&text=${iniciais}'">
                            <div class="chat-item-content">
                                <div class="chat-item-header">
                                    <span class="chat-name">${c.nome}</span>
                                    ${badge}
                                </div>
                                <div class="chat-item-message"><p style="text-transform: capitalize; font-size:12px; color:gray;">${c.tipo_utilizador || 'Membro'}</p></div>
                            </div>
                        </div>
                    `;
                });
                atribuirEventosClique();
            } catch (err) { console.error("Erro no fetch de contactos:", err); }
        }

        function atribuirEventosClique() {
            const items = document.querySelectorAll('.chat-item');
            items.forEach(contacto => {
                contacto.addEventListener('click', async function() {
                    items.forEach(c => c.classList.remove('active'));
                    this.classList.add('active');
                    
                    const novoId = this.getAttribute('data-id');
                    if (contactoAtivoId !== novoId) {
                        contactoAtivoId = novoId;
                        totalMensagensAtuais = 0; 
                    }
                    
                    document.querySelector('.chat-active-name').textContent = this.querySelector('.chat-name').textContent;
                    document.querySelector('#active-avatar').src = this.querySelector('img').src;
                    
                    const badge = this.querySelector('.unread-badge');
                    if (badge) badge.remove();

                    // CORREÇÃO 2: Rota ajustada para /mensagens/lidas/
                    fetch(`/mngr/api/mensagens/lidas/${contactoAtivoId}`, { method: 'POST' });

                    await carregarHistoricoComContacto(contactoAtivoId, false);
                });
            });
        }

        async function carregarHistoricoComContacto(idDestinatario, emSegundoPlano = false) {
            try {
                // CORREÇÃO 3: Rota ajustada para /mensagens/conversa/
                const res = await fetch(`/mngr/api/mensagens/conversa/${idDestinatario}`);
                const dados = await res.json();
                conversaAtivaId = dados.id_conversa;
                
                if (emSegundoPlano && dados.mensagens.length === totalMensagensAtuais) {
                    return; 
                }

                if (emSegundoPlano && dados.mensagens.length > totalMensagensAtuais) {
                    // CORREÇÃO 4: Rota ajustada para /mensagens/lidas/
                    fetch(`/mngr/api/mensagens/lidas/${idDestinatario}`, { method: 'POST' });
                }

                totalMensagensAtuais = dados.mensagens.length;
                const janelaMensagens = document.querySelector('.chat-history');
                janelaMensagens.innerHTML = ''; 

                if (dados.mensagens.length === 0) {
                    janelaMensagens.innerHTML = `<div style="display: flex; height: 100%; align-items: center; justify-content: center; color: var(--text-muted); text-align: center;">Escreve uma mensagem para iniciar a conversa!</div>`;
                    return;
                }

                dados.mensagens.forEach(msg => {
                    const tipoBalao = (msg.id_remetente === dados.meu_id) ? 'sent' : 'received';
                    janelaMensagens.innerHTML += `<div class="message-bubble ${tipoBalao}"><p>${msg.mensagem}</p><span class="message-time">${msg.hora || '...'}</span></div>`;
                });
                
                fazerScrollParaFundo();
            } catch (err) { console.error(err); }
        }

        if (btnEnviar) btnEnviar.addEventListener('click', enviarMensagemBD);
        if (inputMensagem) inputMensagem.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagemBD(); });

        async function enviarMensagemBD() {
            const texto = inputMensagem.value.trim();
            if (texto === '' || !contactoAtivoId) return;

            try {
                // CORREÇÃO 5: Rota ajustada para /mensagens/enviar
                const res = await fetch('/mngr/api/mensagens/enviar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_conversa: conversaAtivaId, id_destinatario: contactoAtivoId, texto_mensagem: texto })
                });

                const resultado = await res.json();
                if (resultado.success) {
                    inputMensagem.value = ''; 
                    conversaAtivaId = resultado.id_conversa; 
                    await carregarHistoricoComContacto(contactoAtivoId, false); 
                    await carregarListaDeContactos(); 
                }
            } catch (err) { console.error(err); }
        }

        function fazerScrollParaFundo() {
            const janelaMensagens = document.querySelector('.chat-history');
            if (janelaMensagens) janelaMensagens.scrollTop = janelaMensagens.scrollHeight;
        }

        if (inputPesquisaConversa) {
            inputPesquisaConversa.addEventListener('input', function() {
                const termo = this.value.toLowerCase().trim(); 
                document.querySelectorAll('.chat-item').forEach(contacto => {
                    const nome = contacto.querySelector('.chat-name').textContent.toLowerCase();
                    contacto.style.display = nome.includes(termo) ? 'flex' : 'none';
                });
            });
        }

        if (btnAbrirModal && modalNovaConversa) {
            btnAbrirModal.addEventListener('click', async () => {
                modalNovaConversa.style.display = 'flex';
                await abrirEPrepararModal();
            });

            btnFecharModal.addEventListener('click', () => {
                modalNovaConversa.style.display = 'none';
            });
            
            btnVoltarDesportos.addEventListener('click', () => {
                listaNovosContactos.style.display = 'none';
                modalNavHeader.style.display = 'none';
                gridDesportos.style.display = 'grid';
            });
        }

        async function abrirEPrepararModal() {
            listaNovosContactos.innerHTML = '<p style="font-size: 13px; color: var(--text-muted);">A carregar membros...</p>';
            listaNovosContactos.style.display = 'flex';
            gridDesportos.style.display = 'none';
            modalNavHeader.style.display = 'none';

            try {
                // CORREÇÃO 6: Rota ajustada para /mensagens/sugestoes
                const res = await fetch('/mngr/api/mensagens/sugestoes');
                const dados = await res.json();

                if (dados.success && dados.contactos.length > 0) {
                    todosContactosCache = dados.contactos; 
                    const desportosUnicos = [...new Set(todosContactosCache.map(c => c.desporto).filter(Boolean))];

                    if (desportosUnicos.length > 0) {
                        desenharGrelhaDesportos(desportosUnicos);
                        gridDesportos.style.display = 'grid';
                        listaNovosContactos.style.display = 'none';
                    } else {
                        renderizarListaContactos(todosContactosCache);
                    }
                } else {
                    listaNovosContactos.innerHTML = '<p style="font-size: 13px; color: var(--text-muted);">Já tens conversas com todos os membros disponíveis!</p>';
                }
            } catch (err) { console.error("Erro:", err); }
        }

        function getEmojiDesporto(desporto) {
            const d = desporto.toLowerCase();
            if (d.includes('futebol') || d.includes('futsal')) return '⚽';
            if (d.includes('basket') || d.includes('basquetebol')) return '🏀';
            if (d.includes('andebol')) return '🤾‍♂️';
            if (d.includes('volei')) return '🏐';
            if (d.includes('natacao') || d.includes('natação')) return '🏊‍♂️';
            if (d.includes('atletismo')) return '🏃‍♂️';
            if (d.includes('tenis') || d.includes('ténis') || d.includes('padel')) return '🎾';
            return '🏅'; 
        }

        function desenharGrelhaDesportos(desportos) {
            gridDesportos.innerHTML = '';
            desportos.forEach(desporto => {
                gridDesportos.innerHTML += `
                    <div class="sport-card" data-sport="${desporto}">
                        <span class="sport-card-icon">${getEmojiDesporto(desporto)}</span>
                        <span class="sport-card-title">${desporto}</span>
                    </div>
                `;
            });

            document.querySelectorAll('.sport-card').forEach(card => {
                card.addEventListener('click', function() {
                    const desportoEscolhido = this.getAttribute('data-sport');
                    gridDesportos.style.display = 'none';
                    tituloDesportoAtivo.textContent = desportoEscolhido;
                    modalNavHeader.style.display = 'flex';
                    listaNovosContactos.style.display = 'flex';
                    
                    const contactosFiltrados = todosContactosCache.filter(c => c.desporto === desportoEscolhido);
                    renderizarListaContactos(contactosFiltrados);
                });
            });
        }

        function renderizarListaContactos(listaArray) {
            listaNovosContactos.innerHTML = '';
            let equipaAtual = '';
            let cargoAtual = '';

            listaArray.forEach(c => {
                if (c.equipa_nome !== equipaAtual) {
                    equipaAtual = c.equipa_nome;
                    cargoAtual = ''; 
                    listaNovosContactos.innerHTML += `
                        <div style="margin-top: 15px; padding-bottom: 5px; border-bottom: 2px solid #e2e8f0;">
                            <h4 style="margin: 0; font-size: 14px; font-weight: bold; color: var(--text-primary); text-transform: uppercase;">
                                🛡️ ${equipaAtual}
                            </h4>
                        </div>`;
                }
                
                if (c.cargo !== cargoAtual) {
                    cargoAtual = c.cargo;
                    listaNovosContactos.innerHTML += `
                        <p style="font-size: 11px; font-weight: bold; color: var(--text-muted); margin: 8px 0 4px 10px; text-transform: uppercase;">
                            ${cargoAtual}
                        </p>`;
                }
                
                const iniciais = c.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                listaNovosContactos.innerHTML += `
                    <div class="novo-contacto-item start-chat-btn" data-id="${c.id}" data-nome="${c.nome}" data-tipo="${c.tipo_utilizador}" style="margin-left: 10px;">
                        <img src="https://dummyimage.com/100x100/e2e8f0/627d98.png&text=${iniciais}" class="chat-avatar" style="width: 32px; height: 32px;">
                        <div>
                            <h4 style="margin: 0; font-size: 13px; color: var(--text-primary);">${c.nome}</h4>
                        </div>
                    </div>
                `;
            });

            ativarCliquesNovosContactos();
        }

        function ativarCliquesNovosContactos() {
            document.querySelectorAll('.start-chat-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    const nome = this.getAttribute('data-nome');
                    const tipo = this.getAttribute('data-tipo');
                    const iniciais = nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                    modalNovaConversa.style.display = 'none';

                    let contactoNaLista = document.querySelector(`.chat-item[data-id="${id}"]`);
                    
                    if (!contactoNaLista) {
                        const htmlNovoItem = `
                            <div class="chat-item" data-id="${id}">
                                <img src="https://dummyimage.com/100x100/e2e8f0/627d98.png&text=${iniciais}" class="chat-avatar">
                                <div class="chat-item-content">
                                    <div class="chat-item-header"><span class="chat-name">${nome}</span></div>
                                    <div class="chat-item-message"><p style="text-transform: capitalize; font-size:12px; color:gray;">${tipo || 'Membro'}</p></div>
                                </div>
                            </div>
                        `;
                        const chatList = document.querySelector('.chat-list');
                        if(chatList.innerHTML.includes("Sem conversas ativas")) chatList.innerHTML = '';
                        
                        chatList.insertAdjacentHTML('afterbegin', htmlNovoItem);
                        atribuirEventosClique(); 
                        contactoNaLista = document.querySelector(`.chat-item[data-id="${id}"]`);
                    }

                    contactoNaLista.click();
                });
            });
        }
    }, 0); 
})();