class Notificacao{
    constructor(id, id_destinatario, titulo, tipo_notificacao, id_referencia, mensagem, visto, enviado_em, url_destino, lida){
        this.id = id;
        this.id_destinatario = id_destinatario;
        this.titulo = titulo;
        this.tipo_notificacao = tipo_notificacao;
        this.id_referencia = id_referencia;
        this.mensagem = mensagem;
        this.visto = visto;
        this.enviado_em = enviado_em;
        this.url_destino = url_destino;
        this.lida = lida;
    }
}