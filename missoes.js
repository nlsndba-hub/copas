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
            audioEntrada: 'audio/100.mp3'
        }
    },
    {
        id: 'missao_patixa',
        nome: 'Missão Patixa',
        descricao: 'Fique em primeiro lugar no modo Sozinho em uma partida que contenha Ronaldo, Xandão e Alcy.',
        personagensNecessarios: [15, 13, 1],
        recompensa: {
            personagemId: 101,
            estampaId: 101,
            nomePersonagem: 'Patixa Teló',
            foto: 'fotos/101.png',
            estampa: 'estampa/101.png',
            audioEntrada: 'audio/101.mp3'
        }
    }
];
