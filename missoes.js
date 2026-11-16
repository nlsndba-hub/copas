// Cadastro de missões. Para criar outra missão, adicione um objeto neste array.
window.MISSOES = [
    {
        id: 'missao_azul',
        nome: 'Missão Azul',
        descricao: 'No modo Sozinho, não termine em último lugar em uma partida que contenha Alcy e Marcio.',
        personagensNecessarios: [1, 4],
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
        descricao: 'No modo Sozinho, não termine em último lugar em uma partida que contenha Xandão e Caio.',
        personagensNecessarios: [13, 3],
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
