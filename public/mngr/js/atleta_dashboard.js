console.log("🟢 O ficheiro JS foi lido pelo HTML!");

async function inicializarDashboard() {
    console.log("🟡 A tentar fazer o fetch à API...");
    
    try {
        const res = await fetch('/mngr/api/atleta/dashboard-dados');
        console.log("🟠 Resposta do servidor recebida! Status:", res.status);
        
        const data = await res.json();
        console.log("🔵 Dados extraídos:", data);

        if (data.success) {
            // 1. Preencher Perfil
            document.getElementById('dash-nome').textContent = `Olá, ${data.perfil.nome_curto || 'Atleta'}!`;
            document.getElementById('dash-equipa').textContent = data.perfil.nome_equipa || 'Sem Equipa Ativa';
            document.getElementById('dash-modalidade').textContent = data.perfil.modalidade || '-';
            
            document.getElementById('dash-idade').textContent = data.idade ? `${data.idade} anos` : '-';
            document.getElementById('dash-altura').textContent = data.perfil.altura ? `${data.perfil.altura}m` : '-';
            document.getElementById('dash-peso').textContent = data.perfil.peso ? `${data.perfil.peso}kg` : '-';
            document.getElementById('dash-cidade').textContent = data.perfil.cidade || '-';

            // 2. Preencher Próximo Compromisso
            if (data.agenda && data.agenda.proximo) {
                document.getElementById('dash-prox-titulo').textContent = `[${data.agenda.proximo.tipo_evento.toUpperCase()}] ${data.agenda.proximo.titulo}`;
                const dataFormatada = new Date(data.agenda.proximo.data_hora).toLocaleString('pt-PT', { dateStyle: 'full', timeStyle: 'short' });
                document.getElementById('dash-prox-data').textContent = `${dataFormatada} • 📍 ${data.agenda.proximo.local || 'A definir'}`;
            } else {
                document.getElementById('dash-prox-titulo').textContent = 'Sem eventos agendados';
                document.getElementById('dash-prox-data').textContent = 'Aproveita para descansar!';
            }

            // 3. Preencher Último Jogo
            if (data.agenda && data.agenda.ultimo) {
                document.getElementById('dash-ult-titulo').textContent = data.agenda.ultimo.titulo;
                
                let statsUltimo = [];
                if (data.agenda.ultimo.minutos_jogados !== null) statsUltimo.push(`${data.agenda.ultimo.minutos_jogados} Minutos`);
                if (data.agenda.ultimo.golos > 0) statsUltimo.push(`⚽ ${data.agenda.ultimo.golos} Golos`);
                if (data.agenda.ultimo.assistencias > 0) statsUltimo.push(`👟 ${data.agenda.ultimo.assistencias} Assists`);
                
                document.getElementById('dash-ult-stats').textContent = statsUltimo.length > 0 ? statsUltimo.join(' | ') : 'Sem registo estatístico neste jogo.';
            } else {
                document.getElementById('dash-ult-titulo').textContent = 'Nenhum jogo registado';
                document.getElementById('dash-ult-stats').textContent = '-';
            }

            // 4. Preencher Estatísticas da Época
            if (data.stats) {
                document.getElementById('stat-jogos').textContent = data.stats.jogos || 0;
                document.getElementById('stat-minutos').textContent = data.stats.minutos || 0;
                document.getElementById('stat-golos').textContent = data.stats.golos || 0;
                document.getElementById('stat-assists').textContent = data.stats.assistencias || 0;
            }
            
            console.log("✅ Dashboard atualizado com sucesso no HTML!");
        } else {
            console.error("❌ O servidor respondeu, mas deu erro:", data.message);
        }
    } catch (err) {
        console.error("❌ Erro catastrófico ao carregar o dashboard:", err);
    }
}

// Executar de imediato, sem esperar por eventos
inicializarDashboard();