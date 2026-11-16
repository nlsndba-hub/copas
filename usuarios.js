// Camada pequena de identidade: usuários são contas vinculadas a personagens.
 // Personagens especiais podem existir sem uma conta de usuário.
window.USUARIOS = {
    normalizarLogin(valor) { return String(valor || '').trim().toLowerCase(); },
    personagemDaConta(conta, personagens) {
        return conta ? personagens.find(p => p.id === Number(conta.personagem)) || null : null;
    }
};
