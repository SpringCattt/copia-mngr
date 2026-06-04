// classes/Utilizador.js
class Utilizador {
    constructor(id, nome, email, password, tipo_utilizador, ativo, criado_em, estado) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.password = password;
        this.tipo_utilizador = tipo_utilizador;
        this.ativo = ativo;
        this.criado_em = criado_em;
        this.estado = estado;
    }
}

// GARANTE QUE ESTÁ ASSIM: Exportar a classe diretamente
module.exports = Utilizador;