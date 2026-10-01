// public/mngr/js/mensagens.js
(function() {
    function obterUrlFoto(urlBd, nome) {
        if (urlBd && typeof urlBd === 'string' && urlBd.trim() !== '') {
            if (urlBd.startsWith('http')) return urlBd;
            if (urlBd.startsWith('/')) return urlBd;
            return `/mngr/images/${urlBd}`; 
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=e2e8f0&color=0284c7&bold=true`;
    }

    function formatarDataChat(dataString) {
        if (!dataString) return '';
        
        const partes = dataString.split('-');
        if (partes.length !== 3) return dataString;

        const dataMsg = new Date(partes[0], partes[1] - 1, partes[2]);
        const hoje = new Date();
        const ontem = new Date();
        ontem.setDate(hoje.getDate() - 1);

        hoje.setHours(0,0,0,0);
        ontem.setHours(0,0,0,0);
        dataMsg.setHours(0,0,0,0);

        if (dataMsg.getTime() === hoje.getTime()) return 'Hoje';
        if (dataMsg.getTime() === ontem.getTime()) return 'Ontem';
        
        return dataMsg.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }); 
    }

    // Escapa texto para usar em atributos HTML (evita quebrar o markup e protege contra XSS básico)
    function escaparAtributo(texto) {
        if (texto === null || texto === undefined) return '';
        return String(texto)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Corta texto longo para preview da resposta (mantém legibilidade no "quote")
    function truncarTexto(texto, max = 80) {
        if (!texto) return '';
        return texto.length > max ? texto.slice(0, max) + '…' : texto;
    }

    setTimeout(async function inicializarChat() {
        console.log("=== [SPA] Módulo de Chat Iniciado ===");

        let contactoAtivoId = null; 
        let conversaAtivaId = null; 
        let totalMensagensAtuais = 0; 
        let conversaPendente = null; 
        let mensagemEmResposta = null; // { id, texto, nomeRemetente }
        let assinaturaListaContactosAtual = ''; // usado para evitar re-render desnecessário (bug do "batimento")

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

        // Barra de "a responder a..." que aparece por cima do input
        const footerInput = document.querySelector('.chat-input-area');
        const replyBar = document.createElement('div');
        replyBar.className = 'reply-preview-bar';
        replyBar.style.display = 'none';
        replyBar.innerHTML = `
            <div class="reply-preview-content">
                <span class="reply-preview-label"></span>
                <p class="reply-preview-text"></p>
            </div>
            <button type="button" class="reply-preview-close" title="Cancelar resposta">✖</button>
        `;
        if (footerInput && footerInput.parentNode) {
            footerInput.parentNode.insertBefore(replyBar, footerInput);
        }
        const replyPreviewLabel = replyBar.querySelector('.reply-preview-label');
        const replyPreviewText = replyBar.querySelector('.reply-preview-text');
        const btnCancelarResposta = replyBar.querySelector('.reply-preview-close');

        btnCancelarResposta.addEventListener('click', cancelarResposta);

        function definirMensagemEmResposta(id, texto, nomeRemetente) {
            if (!id) return;
            mensagemEmResposta = { id, texto, nomeRemetente };
            replyPreviewLabel.textContent = nomeRemetente ? `A responder a ${nomeRemetente}` : 'A responder';
            replyPreviewText.textContent = truncarTexto(texto, 100);
            replyBar.style.display = 'flex';
            if (inputMensagem) inputMensagem.focus();
        }

        function cancelarResposta() {
            mensagemEmResposta = null;
            replyBar.style.display = 'none';
        }

        let todosContactosCache = []; 

        await carregarListaDeContactos();

        // Abrir conversa específica se vier da notificação (?conversa=X), caso contrário abre a primeira
        const params = new URLSearchParams(window.location.search);
        const idConversaParam = params.get('conversa');
        if (idConversaParam) {
            try {
                const res = await fetch(`/mngr/api/mensagens/por-conversa/${idConversaParam}`);
                const dados = await res.json();
                if (dados.success) {
                    const chatItem = document.querySelector(`.chat-item[data-id="${dados.contacto_id}"]`);
                    if (chatItem) chatItem.click();
                }
            } catch (err) { console.error("Erro ao abrir conversa por notificação:", err); }
        } else {
            const primeiroItem = document.querySelector('.chat-item');
            if (primeiroItem) primeiroItem.click();
        }

        setInterval(async () => {
            await carregarListaDeContactos();
            if (contactoAtivoId) {
                await carregarHistoricoComContacto(contactoAtivoId, true);
            }
        }, 3000); 

        async function carregarListaDeContactos() {
            try {
                const res = await fetch('/mngr/api/mensagens/contactos');
                const dados = await res.json();
                const chatList = document.querySelector('.chat-list');
                const idAtivoAntes = contactoAtivoId; 

                // --- CORREÇÃO DO "BATIMENTO" (flash/latido na lista de chats) ---
                // O código original reescrevia SEMPRE o innerHTML da lista de contactos
                // a cada 3 segundos, mesmo quando nada tinha mudado. Isso forçava o browser
                // a recarregar/repintar todos os avatares e linhas, criando aquele "piscar"
                // visual constante em vários chats.
                // Agora construímos uma "assinatura" simples dos dados recebidos e só
                // voltamos a desenhar a lista se algo realmente mudou (nova mensagem,
                // novo contacto, contador de não-lidas diferente, troca de conversa ativa).
                const listaParaAssinatura = (dados.contactos || []).map(c => `${c.id}:${c.unread_count || 0}:${c.nome}`);
                if (conversaPendente && !(dados.contactos || []).some(c => c.id == conversaPendente.id)) {
                    listaParaAssinatura.unshift(`pendente:${conversaPendente.id}`);
                }
                listaParaAssinatura.push(`ativo:${idAtivoAntes || ''}`);
                const novaAssinatura = listaParaAssinatura.join('|');

                if (novaAssinatura === assinaturaListaContactosAtual) {
                    return; // nada mudou, não repintar (evita o "batimento")
                }
                assinaturaListaContactosAtual = novaAssinatura;

                let htmlLista = '';

                if (conversaPendente && !dados.contactos.some(c => c.id == conversaPendente.id)) {
                    const c = conversaPendente;
                    const classeAtiva = (c.id == idAtivoAntes) ? 'active' : '';
                    htmlLista += `
                        <div class="chat-item ${classeAtiva}" data-id="${c.id}" data-foto="${c.foto}">
                            <img src="${c.foto}" alt="Foto" class="chat-avatar">
                            <div class="chat-item-content">
                                <div class="chat-item-header"><span class="chat-name">${c.nome}</span></div>
                                <div class="chat-item-message"><p style="text-transform: capitalize; font-size:12px; color:gray;">${c.tipo || 'Membro'}</p></div>
                            </div>
                        </div>
                    `;
                }

                if (dados.contactos && dados.contactos.length > 0) {
                    dados.contactos.forEach(c => {
                        const classeAtiva = (c.id == idAtivoAntes) ? 'active' : '';
                        const badge = (c.unread_count > 0 && c.id != idAtivoAntes) ? `<span class="unread-badge">${c.unread_count}</span>` : '';
                        const fotoUrl = obterUrlFoto(c.url_imagem, c.nome);
                        
                        htmlLista += `
                            <div class="chat-item ${classeAtiva}" data-id="${c.id}" data-foto="${fotoUrl}">
                                <img src="${fotoUrl}" alt="Foto" class="chat-avatar">
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
                }

                if (htmlLista === '') {
                    chatList.innerHTML = '<p style="padding:20px; color:var(--text-muted); text-align:center;">Sem conversas ativas.</p>';
                } else {
                    chatList.innerHTML = htmlLista;
                    atribuirEventosClique();
                }
            } catch (err) { console.error(err); }
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
                        cancelarResposta();
                    }
                    
                    document.querySelector('.chat-active-name').textContent = this.querySelector('.chat-name').textContent;
                    document.querySelector('#active-avatar').src = this.getAttribute('data-foto');
                    
                    const badge = this.querySelector('.unread-badge');
                    if (badge) badge.remove();

                    // No mobile, ao abrir uma conversa, mostra a área de chat e esconde a sidebar
                    document.querySelector('.chat-wrapper').classList.add('mostrar-conversa');

                    fetch(`/mngr/api/mensagens/lidas/${contactoAtivoId}`, { method: 'POST' });
                    await carregarHistoricoComContacto(contactoAtivoId, false);
                });
            });
        }

        // Botão de "voltar" para a lista de conversas no mobile
        const btnVoltarLista = document.createElement('button');
        btnVoltarLista.type = 'button';
        btnVoltarLista.className = 'btn-voltar-lista';
        btnVoltarLista.innerHTML = '⬅️';
        btnVoltarLista.title = 'Voltar às conversas';
        const chatActiveUser = document.querySelector('.chat-active-user');
        if (chatActiveUser && chatActiveUser.parentNode) {
            chatActiveUser.parentNode.insertBefore(btnVoltarLista, chatActiveUser);
        }
        btnVoltarLista.addEventListener('click', () => {
            document.querySelector('.chat-wrapper').classList.remove('mostrar-conversa');
        });

        function renderizarMensagens(dados) {
            const janelaMensagens = document.querySelector('.chat-history');
            janelaMensagens.innerHTML = ''; 

            if (dados.mensagens.length === 0) {
                janelaMensagens.innerHTML = `<div style="display: flex; height: 100%; align-items: center; justify-content: center; color: var(--text-muted); text-align: center;">Escreve uma mensagem para iniciar a conversa!</div>`;
                return;
            }

            let ultimaData = null; 
            const frag = document.createElement('div');

            dados.mensagens.forEach(msg => {
                if (msg.data_completa && msg.data_completa !== ultimaData) {
                    const dataFormatada = formatarDataChat(msg.data_completa);
                    frag.innerHTML += `
                        <div class="chat-date-separator" style="text-align: center; margin: 20px 0;">
                            <span style="background: #e2e8f0; padding: 6px 14px; border-radius: 12px; font-size: 11px; color: #475569; font-weight: bold; text-transform: uppercase;">
                                ${dataFormatada}
                            </span>
                        </div>
                    `;
                    ultimaData = msg.data_completa;
                }

                const tipoBalao = (msg.id_remetente === dados.meu_id) ? 'sent' : 'received';
                
                let htmlNomeRemetente = '';
                if (tipoBalao === 'received' && String(contactoAtivoId).startsWith('g_')) {
                    htmlNomeRemetente = `
                        <div class="nome-remetente-grupo">
                            ${msg.nome_remetente}
                        </div>
                    `;
                }

                // Bloco de citação, caso esta mensagem seja resposta a outra
                let htmlCitacao = '';
                if (msg.resposta_a_id) {
                    const textoOriginal = msg.resposta_a_texto ? truncarTexto(msg.resposta_a_texto, 120) : 'Mensagem indisponível';
                    const nomeOriginal = msg.resposta_a_nome ? escaparAtributo(msg.resposta_a_nome) : '';
                    htmlCitacao = `
                        <div class="message-quote" data-scroll-to="${escaparAtributo(msg.resposta_a_id)}">
                            ${nomeOriginal ? `<span class="message-quote-nome">${nomeOriginal}</span>` : ''}
                            <span class="message-quote-texto">${escaparAtributo(textoOriginal)}</span>
                        </div>
                    `;
                }

                let htmlAvatar = '';
                let rowClasses = 'chat-message-row';
                
                if (tipoBalao === 'received') {
                    const urlFoto = obterUrlFoto(msg.foto_remetente, msg.nome_remetente);
                    htmlAvatar = `<img src="${urlFoto}" class="chat-message-avatar" alt="Avatar">`;
                    rowClasses += ' linha-recebida';
                } else {
                    rowClasses += ' linha-enviada';
                }

                // Ícone SVG limpo e profissional para substituir o emoji
                const svgResponder = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>`;

                frag.innerHTML += `
                    <div class="${rowClasses}" data-msg-id="${escaparAtributo(msg.id)}">
                        ${htmlAvatar}
                        <div class="message-bubble-wrapper">
                            <div class="message-bubble ${tipoBalao}" style="margin: 0;">
                                ${htmlNomeRemetente}
                                ${htmlCitacao}
                                <p style="margin: 0;">${msg.mensagem}</p>
                                <span class="message-time" style="display: block; margin-top: 4px;">${msg.hora || '...'}</span>
                            </div>
                            <button type="button" class="btn-responder-msg" title="Responder" data-msg-id="${escaparAtributo(msg.id)}" data-msg-texto="${escaparAtributo(msg.mensagem)}" data-msg-nome="${escaparAtributo(msg.nome_remetente || '')}">
                                ${svgResponder}
                            </button>
                        </div>
                    </div>
                `;
            });

            janelaMensagens.appendChild(frag);
            ativarRespostaEmMensagens();
            ativarCliqueEmCitacoes();
        }

        // Clique no botão "↩️" (visível ao passar o rato / sempre visível em mobile) — define a mensagem a responder
        // Swipe horizontal no balão (mobile) — mesmo efeito, à semelhança do WhatsApp
        function ativarRespostaEmMensagens() {
            document.querySelectorAll('.btn-responder-msg').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const id = this.getAttribute('data-msg-id');
                    const texto = this.getAttribute('data-msg-texto');
                    const nome = this.getAttribute('data-msg-nome');
                    definirMensagemEmResposta(id, texto, nome);
                });
            });

            // Suporte a swipe (toque) em mobile para responder
            document.querySelectorAll('.chat-message-row').forEach(row => {
                let inicioX = 0;
                let inicioY = 0;
                let deslocamentoX = 0;
                let aDeslizar = false;
                let gestoValido = false;
                const bubbleWrapper = row.querySelector('.message-bubble-wrapper');
                if (!bubbleWrapper) return;

                row.addEventListener('touchstart', (e) => {
                    inicioX = e.touches[0].clientX;
                    inicioY = e.touches[0].clientY;
                    aDeslizar = true;
                    gestoValido = false;
                }, { passive: true });

                row.addEventListener('touchmove', (e) => {
                    if (!aDeslizar) return;
                    const deltaX = e.touches[0].clientX - inicioX;
                    const deltaY = e.touches[0].clientY - inicioY;

                    // Só consideramos gesto de "responder" se o movimento for
                    // claramente mais horizontal do que vertical (evita conflito
                    // com o scroll vertical normal do histórico de mensagens)
                    if (!gestoValido && Math.abs(deltaX) > 10) {
                        gestoValido = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
                    }
                    if (!gestoValido) return;

                    deslocamentoX = deltaX;
                    const limitado = Math.max(-60, Math.min(60, deslocamentoX));
                    bubbleWrapper.style.transform = `translateX(${limitado}px)`;
                }, { passive: true });

                row.addEventListener('touchend', () => {
                    aDeslizar = false;
                    bubbleWrapper.style.transform = '';
                    if (gestoValido && Math.abs(deslocamentoX) > 40) {
                        const msgId = row.getAttribute('data-msg-id');
                        const textoEl = row.querySelector('.message-bubble p');
                        const nomeEl = row.querySelector('.nome-remetente-grupo');
                        const texto = textoEl ? textoEl.textContent : '';
                        const nome = (row.classList.contains('linha-recebida') && nomeEl) ? nomeEl.textContent : '';
                        definirMensagemEmResposta(msgId, texto, nome);
                    }
                    deslocamentoX = 0;
                    gestoValido = false;
                });
            });
        }

        // Clicar numa citação ("a responder a...") dentro de uma mensagem leva até à mensagem original
        function ativarCliqueEmCitacoes() {
            document.querySelectorAll('.message-quote').forEach(quote => {
                quote.addEventListener('click', function() {
                    const idAlvo = this.getAttribute('data-scroll-to');
                    const alvo = document.querySelector(`.chat-message-row[data-msg-id="${idAlvo}"]`);
                    if (alvo) {
                        alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        alvo.classList.add('msg-destacada');
                        setTimeout(() => alvo.classList.remove('msg-destacada'), 1200);
                    }
                });
            });
        }

        async function carregarHistoricoComContacto(idDestinatario, emSegundoPlano = false) {
            try {
                const res = await fetch(`/mngr/api/mensagens/conversa/${idDestinatario}`);
                const dados = await res.json();
                conversaAtivaId = dados.id_conversa;
                
                if (emSegundoPlano && dados.mensagens.length === totalMensagensAtuais) return; 

                if (emSegundoPlano && dados.mensagens.length > totalMensagensAtuais) {
                    fetch(`/mngr/api/mensagens/lidas/${idDestinatario}`, { method: 'POST' });
                }

                totalMensagensAtuais = dados.mensagens.length;

                // Evita "saltar" o scroll quando a atualização é em segundo plano e o
                // utilizador está a reler mensagens antigas (só desce automaticamente
                // se já estava perto do fundo da conversa)
                const janelaMensagens = document.querySelector('.chat-history');
                const estavaNoFundo = !janelaMensagens || (janelaMensagens.scrollHeight - janelaMensagens.scrollTop - janelaMensagens.clientHeight < 80);

                renderizarMensagens(dados);

                if (!emSegundoPlano || estavaNoFundo) {
                    fazerScrollParaFundo();
                }
            } catch (err) { console.error(err); }
        }

        if (btnEnviar) btnEnviar.addEventListener('click', enviarMensagemBD);
        if (inputMensagem) inputMensagem.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagemBD(); });

        async function enviarMensagemBD() {
            const texto = inputMensagem.value.trim();
            if (texto === '' || !contactoAtivoId) return;

            try {
                const corpo = {
                    id_conversa: conversaAtivaId,
                    id_destinatario: contactoAtivoId,
                    texto_mensagem: texto
                };
                if (mensagemEmResposta) {
                    corpo.resposta_a_id = mensagemEmResposta.id;
                }

                const res = await fetch('/mngr/api/mensagens/enviar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(corpo)
                });

                const resultado = await res.json();
                if (resultado.success) {
                    inputMensagem.value = ''; 
                    conversaAtivaId = resultado.id_conversa; 
                    conversaPendente = null; 
                    cancelarResposta();
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

            btnFecharModal.addEventListener('click', () => { modalNovaConversa.style.display = 'none'; });
            
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
            } catch (err) { console.error(err); }
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
                    renderizarListaContactos(todosContactosCache.filter(c => c.desporto === desportoEscolhido));
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
                            <h4 style="margin: 0; font-size: 14px; font-weight: bold; color: var(--text-primary); text-transform: uppercase;">🛡️ ${equipaAtual}</h4>
                        </div>`;
                }
                
                if (c.cargo !== cargoAtual) {
                    cargoAtual = c.cargo;
                    listaNovosContactos.innerHTML += `<p style="font-size: 11px; font-weight: bold; color: var(--text-muted); margin: 8px 0 4px 10px; text-transform: uppercase;">${cargoAtual}</p>`;
                }
                
                const fotoUrl = obterUrlFoto(c.url_imagem, c.nome);
                listaNovosContactos.innerHTML += `
                    <div class="novo-contacto-item start-chat-btn" data-id="${c.id}" data-nome="${c.nome}" data-tipo="${c.tipo_utilizador}" data-foto="${fotoUrl}" style="margin-left: 10px;">
                        <img src="${fotoUrl}" class="chat-avatar" style="width: 32px; height: 32px;">
                        <div><h4 style="margin: 0; font-size: 13px; color: var(--text-primary);">${c.nome}</h4></div>
                    </div>
                `;
            });
            ativarCliquesNovosContactos();
        }

        function ativarCliquesNovosContactos() {
            document.querySelectorAll('.start-chat-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const id = this.getAttribute('data-id');
                    const nome = this.getAttribute('data-nome');
                    const tipo = this.getAttribute('data-tipo');
                    const foto = this.getAttribute('data-foto');

                    modalNovaConversa.style.display = 'none';

                    conversaPendente = { id, nome, tipo, foto };
                    await carregarListaDeContactos();
                    
                    const contactoNaLista = document.querySelector(`.chat-item[data-id="${id}"]`);
                    if (contactoNaLista) contactoNaLista.click();
                });
            });
        }
    }, 0); 
})();
