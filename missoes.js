// Cadastro de missões. Para criar outra missão, adicione um objeto neste array.
window.MISSOES = [
    {
        id: 'missao_azul',
        nome: 'Missão Azul',
        descricao: 'Fique em primeiro lugar no modo Sozinho em uma partida que contenha Marcio, Alcy e Nelson.',
        personagensNecessarios: [4, 1, 2],
        recompensa: {
            personagemId: 100,
            estampaId: 100,
            nomePersonagem: 'Caneta Azul',
            foto: 'fotos/100.png',
            estampa: 'estampa/100.png',
            audioEntrada: 'audio/azul.mp3'
        }
    }
];
