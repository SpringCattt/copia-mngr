// public/mngr/js/atleta_detalhes.js
(function() {
    setTimeout(async function carregarDetalhesAtleta() {
        console.log("🟢 O JS dos Detalhes do Atleta arrancou!");

        try {
            // 1. Extrair o ID do atleta do endereço (URL)
            const urlParams = new URLSearchParams(window.location.search);
            const idAtleta = urlParams.get('id');

            if (!idAtleta) {
                document.getElementById('detalhe-nome').textContent = "Erro: Nenhum atleta selecionado.";
                return;
            }

            // 2. Chamar a API específica
            const res = await fetch(`/mngr/api/atleta/detalhes/${idAtleta}`);
            const data = await res.json();

            if (data.success) {
                // 3. Preencher Cabeçalho
                document.getElementById('detalhe-nome').innerHTML = data.perfil.nome_completo || data.perfil.nome_curto || 'Atleta sem nome';
                document.getElementById('detalhe-modalidade').textContent = data.perfil.modalidade || '-';
                document.getElementById('detalhe-equipa').textContent = data.perfil.nome_equipa || 'Sem Equipa Ativa';
                document.getElementById('detalhe-idade').textContent = data.idade ? `${data.idade} anos` : '-';

                // 4. Preencher Grelha da Biografia
                if (data.perfil.data_nascimento) {
                    const dataNasc = new Date(data.perfil.data_nascimento);
                    document.getElementById('detalhe-nascimento').textContent = dataNasc.toLocaleDateString('pt-PT');
                }
                
                document.getElementById('detalhe-altura').textContent = data.perfil.altura ? `${data.perfil.altura}m` : '-';
                document.getElementById('detalhe-peso').textContent = data.perfil.peso ? `${data.perfil.peso}kg` : '-';
                document.getElementById('detalhe-cidade').textContent = data.perfil.cidade || '-';
                
                // 5. Preencher Cartões de Estatísticas
                if (data.stats) {
                    document.getElementById('stat-jogos').textContent = data.stats.jogos || 0;
                    document.getElementById('stat-minutos').textContent = data.stats.minutos || 0;
                    document.getElementById('stat-golos').textContent = data.stats.golos || 0;
                    document.getElementById('stat-assists').textContent = data.stats.assistencias || 0;

                    // 6. Preencher a Tabela com o Total
                    if (data.stats.jogos > 0) {
                        const tabelaBody = document.getElementById('tabela-stats-body');
                        if(tabelaBody) {
                            tabelaBody.innerHTML = `
                                <tr class="row-total">
                                    <td class="col-left">Total da Época</td>
                                    <td>${data.stats.jogos}</td>
                                    <td>${data.stats.minutos}</td>
                                    <td>${data.stats.golos}</td>
                                    <td>${data.stats.assistencias}</td>
                                    <td>0</td>
                                    <td>0</td>
                                </tr>
                            `;
                        }
                    }
                }
            } else {
                document.getElementById('detalhe-nome').textContent = "Atleta não encontrado na Base de Dados.";
            }
        } catch (err) {
            console.error("❌ Erro ao carregar detalhes do atleta:", err);
            const elNome = document.getElementById('detalhe-nome');
            if (elNome) elNome.textContent = "Erro técnico ao carregar os dados.";
        }
    }, 0); // O setTimeout a 0 obriga o script a esperar que o SPA desenhe o HTML primeiro
})();