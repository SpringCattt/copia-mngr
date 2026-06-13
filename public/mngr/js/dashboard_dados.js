(function() {
    setTimeout(async function inicializarPainelDados() {
        try {
            
            const resposta = await fetch('/api/dashboard/dados');
            if (!resposta.ok) throw new Error(`Erro na rede: Status ${resposta.status}`);
            
            const dados = await resposta.json();
            if (dados.error) return;

            // =========================================================================
            // 1. ATUALIZAR DADOS DA EQUIPA / CLUBE
            // =========================================================================
            if (dados.equipa) {
                const txtNome = document.querySelector('.team-name');
                if (txtNome && dados.equipa.nome) txtNome.textContent = dados.equipa.nome;
                
                const campoPais = document.querySelector('.pais-texto');
                if (campoPais && dados.equipa.pais) campoPais.textContent = dados.equipa.pais;
                
                const campoRegiao = document.querySelector('.regiao-texto');
                if (campoRegiao && dados.equipa.regiao) campoRegiao.textContent = dados.equipa.regiao;
                
                const logoImg = document.querySelector('.logo-clube');
                if (logoImg && dados.equipa.logo) logoImg.src = dados.equipa.logo;
            }

            // =========================================================================
            // 2. ATUALIZAR ÚLTIMO EVENTO
            // =========================================================================
            const seccaoUltimo = document.querySelectorAll('.event-section')[0];
            if (dados.ultimoEvento && seccaoUltimo) {
                const logoOp = seccaoUltimo.querySelector('.opponent-logo');
                if (logoOp && dados.ultimoEvento.logo_adversario_url) {
                    logoOp.src = dados.ultimoEvento.logo_adversario_url;
                }

                if (dados.ultimoEvento.titulo) {
                    seccaoUltimo.querySelector('.opponent-logo').alt = dados.ultimoEvento.titulo;
                    seccaoUltimo.querySelector('h3').textContent = dados.ultimoEvento.titulo;
                }
                
                if (dados.ultimoEvento.tipo_evento) {
                    seccaoUltimo.querySelector('.league-tag').textContent = dados.ultimoEvento.tipo_evento;
                }
                
                const dataFmt = formatarDataSPA(dados.ultimoEvento.data_hora);
                seccaoUltimo.querySelector('.event-meta').textContent = `${dataFmt}`;
            }

            // =========================================================================
            // 3. ATUALIZAR PRÓXIMO EVENTO
            // =========================================================================
            const seccaoProximo = document.querySelectorAll('.event-section')[1];
            if (dados.proximoEvento && seccaoProximo) {
                const logoProx = seccaoProximo.querySelector('.opponent-logo');
                if (logoProx && dados.proximoEvento.logo_adversario_url) {
                    logoProx.src = dados.proximoEvento.logo_adversario_url;
                }

                const tituloEvento = dados.proximoEvento.titulo || "Próximo Jogo";
                const competicaoEvento = dados.proximoEvento.tipo_evento || "Competição";

                seccaoProximo.querySelector('h3').textContent = tituloEvento;
                seccaoProximo.querySelector('.opponent-logo').alt = tituloEvento;
                seccaoProximo.querySelector('.league-tag').textContent = competicaoEvento;
                
                const dataFmt = formatarDataSPA(dados.proximoEvento.data_hora);
                seccaoProximo.querySelector('.event-meta').textContent = `${dataFmt}`;
            }

        } catch (erro) {
            console.error('Falha ao renderizar dados do miolo da página:', erro);
        }

        function formatarDataSPA(stringData) {
            if (!stringData) return "--/--/----";
            const d = new Date(stringData);
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const ano = d.getFullYear();
            const hora = String(d.getHours()).padStart(2, '0');
            const minutos = String(d.getMinutes()).padStart(2, '0');
            return `${dia}/${mes}/${ano} - ${hora}:${minutos}`;
        }
    });
})();