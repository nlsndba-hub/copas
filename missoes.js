// Missões ativas. Uma missão é sorteada a cada 3 partidas completas no modo Sozinho.
// Para concluir, os dois personagens da missão precisam terminar nas posições de "posicoes"
// (na mesma ordem de personagensNecessarios; 1º = menos pontos). Vale também se o usuário é um deles.
window.MISSOES = [
    {
        id: 'missao_azul',
        nome: 'Missão Azul',
        descricao: 'Em uma partida com Alcy e Marcio, termine com Alcy em 1º lugar e Marcio em 2º lugar.',
        personagensNecessarios: [1, 4],
        posicoes: [1, 2],
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
        descricao: 'Em uma partida com Xandão e Caio, termine com Xandão em 2º lugar e Caio em 1º lugar.',
        personagensNecessarios: [13, 3],
        posicoes: [2, 1],
        recompensa: {
            personagemId: 101,
            estampaId: 101,
            nomePersonagem: 'Patixa Teló',
            foto: 'fotos/101.png',
            estampa: 'estampa/101.png',
            audioEntrada: 'audio/101.mp3'
        }
    },
    
    {
        id: 'missao_102',
        nome: 'Robô Maicon',
        descricao: 'Em uma partida com Motoboy e Nelson, termine com Motoboy em 1º lugar e Nelson em 3º lugar.',
        personagensNecessarios: [6, 2],
        posicoes: [1, 3],
        recompensa: {
            personagemId: 102,
            estampaId: 102,
            nomePersonagem: 'Robô Maicon',
            foto: 'fotos/102.png',
            estampa: 'estampa/102.png',
            audioEntrada: 'audio/102.mp3'
        }
    },
        {
        id: 'missao_103',
        nome: 'Reciclagem de papelão molhado',
        descricao: 'Em uma partida com Alcy e Ronaldo, termine com Alcy em 3º lugar e Ronaldo em 1º lugar.',
        personagensNecessarios: [1, 15],
        posicoes: [3, 1],
        recompensa: {
            personagemId: 103,
            estampaId: 103,
            nomePersonagem: 'P. Molhado',
            foto: 'fotos/103.png',
            estampa: 'estampa/103.png',
            audioEntrada: 'audio/103.mp3'
        }
    },
    {
        id: 'missao_104',
        nome: 'Pesque e pague, tá ok?',
        descricao: 'Em uma partida com Alcy e Motoboy, termine com Alcy em 2º lugar e Motoboy em 3º lugar.',
        personagensNecessarios: [1, 6],
        posicoes: [2, 3],
        recompensa: {
            personagemId: 104,
            estampaId: 104,
            nomePersonagem: 'Tá ok?',
            foto: 'fotos/104.png',
            estampa: 'estampa/104.png',
            audioEntrada: 'audio/104.mp3'
        }
    },    
        {
        id: 'missao_105',
        nome: 'Pneu furou?',
        descricao: 'Em uma partida com Alcy e Julio, termine com Alcy em 3º lugar e Julio em 2º lugar.',
        personagensNecessarios: [1, 5],
        posicoes: [3, 2],
        recompensa: {
            personagemId: 105,
            estampaId: 105,
            nomePersonagem: 'Alvinho',
            foto: 'fotos/105.png',
            estampa: 'estampa/105.png',
            audioEntrada: 'audio/105.mp3'
        }
    },
        {
        id: 'missao_106',
        nome: 'X9 papa anjo',
        descricao: 'Em uma partida com Alcy e Caio, termine com Alcy em 1º lugar e Caio em 2º lugar.',
        personagensNecessarios: [1, 3],
        posicoes: [1, 2],
        recompensa: {
            personagemId: 106,
            estampaId: 106,
            nomePersonagem: 'Pirulitão',
            foto: 'fotos/106.png',
            estampa: 'estampa/106.png',
            audioEntrada: 'audio/106.mp3'
        }
    },

        {
        id: 'missao_107',
        nome: 'Abravanel',
        descricao: 'Em uma partida com Alcy e Nelson, termine com Alcy em 2º lugar e Nelson em 1º lugar.',
        personagensNecessarios: [1, 2],
        posicoes: [2, 1],
        recompensa: {
            personagemId: 107,
            estampaId: 107,
            nomePersonagem: 'Silvio Santos',
            foto: 'fotos/107.png',
            estampa: 'estampa/107.png',
            audioEntrada: 'audio/107.mp3'
        }
    },
];

/*
 * MODELOS DE 50 NOVAS MISSÕES — IDs 102 a 151.
 * Estão comentadas/desativadas. Quando definir o personagem e preparar os arquivos,
 * preencha nomePersonagem/nome/descricao e retire os comentários do objeto desejado,
 * copiando-o para dentro de window.MISSOES.
 * Arquivos previstos: fotos/ID.png, estampa/ID.png e audio/ID.mp3.
 * Os objetivos usam "posicoes": [posição do 1º personagem, posição do 2º] (1 a 3).
 */
/*

    {
        id: 'missao_108',
        nome: 'Definir nome da missão 108',
        descricao: 'Em uma partida com Alcy e Big Z, termine com Alcy em 1º lugar e Big Z em 3º lugar.',
        personagensNecessarios: [1, 8],
        posicoes: [1, 3],
        recompensa: {
            personagemId: 108,
            estampaId: 108,
            nomePersonagem: 'DEFINIR_NOME_108',
            foto: 'fotos/108.png',
            estampa: 'estampa/108.png',
            audioEntrada: 'audio/108.mp3'
        }
    },
    {
        id: 'missao_109',
        nome: 'Definir nome da missão 109',
        descricao: 'Em uma partida com Alcy e Samuel, termine com Alcy em 3º lugar e Samuel em 1º lugar.',
        personagensNecessarios: [1, 9],
        posicoes: [3, 1],
        recompensa: {
            personagemId: 109,
            estampaId: 109,
            nomePersonagem: 'DEFINIR_NOME_109',
            foto: 'fotos/109.png',
            estampa: 'estampa/109.png',
            audioEntrada: 'audio/109.mp3'
        }
    },
    {
        id: 'missao_110',
        nome: 'Definir nome da missão 110',
        descricao: 'Em uma partida com Alcy e Raphael, termine com Alcy em 2º lugar e Raphael em 3º lugar.',
        personagensNecessarios: [1, 10],
        posicoes: [2, 3],
        recompensa: {
            personagemId: 110,
            estampaId: 110,
            nomePersonagem: 'DEFINIR_NOME_110',
            foto: 'fotos/110.png',
            estampa: 'estampa/110.png',
            audioEntrada: 'audio/110.mp3'
        }
    },
    {
        id: 'missao_111',
        nome: 'Definir nome da missão 111',
        descricao: 'Em uma partida com Alcy e Metello, termine com Alcy em 3º lugar e Metello em 2º lugar.',
        personagensNecessarios: [1, 11],
        posicoes: [3, 2],
        recompensa: {
            personagemId: 111,
            estampaId: 111,
            nomePersonagem: 'DEFINIR_NOME_111',
            foto: 'fotos/111.png',
            estampa: 'estampa/111.png',
            audioEntrada: 'audio/111.mp3'
        }
    },
    {
        id: 'missao_112',
        nome: 'Definir nome da missão 112',
        descricao: 'Em uma partida com Alcy e Dezinho, termine com Alcy em 1º lugar e Dezinho em 2º lugar.',
        personagensNecessarios: [1, 12],
        posicoes: [1, 2],
        recompensa: {
            personagemId: 112,
            estampaId: 112,
            nomePersonagem: 'DEFINIR_NOME_112',
            foto: 'fotos/112.png',
            estampa: 'estampa/112.png',
            audioEntrada: 'audio/112.mp3'
        }
    },
    {
        id: 'missao_113',
        nome: 'Definir nome da missão 113',
        descricao: 'Em uma partida com Alcy e Xandão, termine com Alcy em 2º lugar e Xandão em 1º lugar.',
        personagensNecessarios: [1, 13],
        posicoes: [2, 1],
        recompensa: {
            personagemId: 113,
            estampaId: 113,
            nomePersonagem: 'DEFINIR_NOME_113',
            foto: 'fotos/113.png',
            estampa: 'estampa/113.png',
            audioEntrada: 'audio/113.mp3'
        }
    },
    {
        id: 'missao_114',
        nome: 'Definir nome da missão 114',
        descricao: 'Em uma partida com Alcy e Gordo, termine com Alcy em 1º lugar e Gordo em 3º lugar.',
        personagensNecessarios: [1, 14],
        posicoes: [1, 3],
        recompensa: {
            personagemId: 114,
            estampaId: 114,
            nomePersonagem: 'DEFINIR_NOME_114',
            foto: 'fotos/114.png',
            estampa: 'estampa/114.png',
            audioEntrada: 'audio/114.mp3'
        }
    },
    {
        id: 'missao_115',
        nome: 'Definir nome da missão 115',
        descricao: 'Em uma partida com Alcy e Ronaldo, termine com Alcy em 3º lugar e Ronaldo em 1º lugar.',
        personagensNecessarios: [1, 15],
        posicoes: [3, 1],
        recompensa: {
            personagemId: 115,
            estampaId: 115,
            nomePersonagem: 'DEFINIR_NOME_115',
            foto: 'fotos/115.png',
            estampa: 'estampa/115.png',
            audioEntrada: 'audio/115.mp3'
        }
    },
    {
        id: 'missao_116',
        nome: 'Definir nome da missão 116',
        descricao: 'Em uma partida com Nelson e Caio, termine com Nelson em 2º lugar e Caio em 3º lugar.',
        personagensNecessarios: [2, 3],
        posicoes: [2, 3],
        recompensa: {
            personagemId: 116,
            estampaId: 116,
            nomePersonagem: 'DEFINIR_NOME_116',
            foto: 'fotos/116.png',
            estampa: 'estampa/116.png',
            audioEntrada: 'audio/116.mp3'
        }
    },
    {
        id: 'missao_117',
        nome: 'Definir nome da missão 117',
        descricao: 'Em uma partida com Nelson e Marcio, termine com Nelson em 3º lugar e Marcio em 2º lugar.',
        personagensNecessarios: [2, 4],
        posicoes: [3, 2],
        recompensa: {
            personagemId: 117,
            estampaId: 117,
            nomePersonagem: 'DEFINIR_NOME_117',
            foto: 'fotos/117.png',
            estampa: 'estampa/117.png',
            audioEntrada: 'audio/117.mp3'
        }
    },
    {
        id: 'missao_118',
        nome: 'Definir nome da missão 118',
        descricao: 'Em uma partida com Nelson e Julio, termine com Nelson em 1º lugar e Julio em 2º lugar.',
        personagensNecessarios: [2, 5],
        posicoes: [1, 2],
        recompensa: {
            personagemId: 118,
            estampaId: 118,
            nomePersonagem: 'DEFINIR_NOME_118',
            foto: 'fotos/118.png',
            estampa: 'estampa/118.png',
            audioEntrada: 'audio/118.mp3'
        }
    },
    {
        id: 'missao_119',
        nome: 'Definir nome da missão 119',
        descricao: 'Em uma partida com Nelson e Motoboy, termine com Nelson em 2º lugar e Motoboy em 1º lugar.',
        personagensNecessarios: [2, 6],
        posicoes: [2, 1],
        recompensa: {
            personagemId: 119,
            estampaId: 119,
            nomePersonagem: 'DEFINIR_NOME_119',
            foto: 'fotos/119.png',
            estampa: 'estampa/119.png',
            audioEntrada: 'audio/119.mp3'
        }
    },
    {
        id: 'missao_120',
        nome: 'Definir nome da missão 120',
        descricao: 'Em uma partida com Nelson e Alex, termine com Nelson em 1º lugar e Alex em 3º lugar.',
        personagensNecessarios: [2, 7],
        posicoes: [1, 3],
        recompensa: {
            personagemId: 120,
            estampaId: 120,
            nomePersonagem: 'DEFINIR_NOME_120',
            foto: 'fotos/120.png',
            estampa: 'estampa/120.png',
            audioEntrada: 'audio/120.mp3'
        }
    },
    {
        id: 'missao_121',
        nome: 'Definir nome da missão 121',
        descricao: 'Em uma partida com Nelson e Big Z, termine com Nelson em 3º lugar e Big Z em 1º lugar.',
        personagensNecessarios: [2, 8],
        posicoes: [3, 1],
        recompensa: {
            personagemId: 121,
            estampaId: 121,
            nomePersonagem: 'DEFINIR_NOME_121',
            foto: 'fotos/121.png',
            estampa: 'estampa/121.png',
            audioEntrada: 'audio/121.mp3'
        }
    },
    {
        id: 'missao_122',
        nome: 'Definir nome da missão 122',
        descricao: 'Em uma partida com Nelson e Samuel, termine com Nelson em 2º lugar e Samuel em 3º lugar.',
        personagensNecessarios: [2, 9],
        posicoes: [2, 3],
        recompensa: {
            personagemId: 122,
            estampaId: 122,
            nomePersonagem: 'DEFINIR_NOME_122',
            foto: 'fotos/122.png',
            estampa: 'estampa/122.png',
            audioEntrada: 'audio/122.mp3'
        }
    },
    {
        id: 'missao_123',
        nome: 'Definir nome da missão 123',
        descricao: 'Em uma partida com Nelson e Raphael, termine com Nelson em 3º lugar e Raphael em 2º lugar.',
        personagensNecessarios: [2, 10],
        posicoes: [3, 2],
        recompensa: {
            personagemId: 123,
            estampaId: 123,
            nomePersonagem: 'DEFINIR_NOME_123',
            foto: 'fotos/123.png',
            estampa: 'estampa/123.png',
            audioEntrada: 'audio/123.mp3'
        }
    },
    {
        id: 'missao_124',
        nome: 'Definir nome da missão 124',
        descricao: 'Em uma partida com Nelson e Metello, termine com Nelson em 1º lugar e Metello em 2º lugar.',
        personagensNecessarios: [2, 11],
        posicoes: [1, 2],
        recompensa: {
            personagemId: 124,
            estampaId: 124,
            nomePersonagem: 'DEFINIR_NOME_124',
            foto: 'fotos/124.png',
            estampa: 'estampa/124.png',
            audioEntrada: 'audio/124.mp3'
        }
    },
    {
        id: 'missao_125',
        nome: 'Definir nome da missão 125',
        descricao: 'Em uma partida com Nelson e Dezinho, termine com Nelson em 2º lugar e Dezinho em 1º lugar.',
        personagensNecessarios: [2, 12],
        posicoes: [2, 1],
        recompensa: {
            personagemId: 125,
            estampaId: 125,
            nomePersonagem: 'DEFINIR_NOME_125',
            foto: 'fotos/125.png',
            estampa: 'estampa/125.png',
            audioEntrada: 'audio/125.mp3'
        }
    },
    {
        id: 'missao_126',
        nome: 'Definir nome da missão 126',
        descricao: 'Em uma partida com Nelson e Xandão, termine com Nelson em 1º lugar e Xandão em 3º lugar.',
        personagensNecessarios: [2, 13],
        posicoes: [1, 3],
        recompensa: {
            personagemId: 126,
            estampaId: 126,
            nomePersonagem: 'DEFINIR_NOME_126',
            foto: 'fotos/126.png',
            estampa: 'estampa/126.png',
            audioEntrada: 'audio/126.mp3'
        }
    },
    {
        id: 'missao_127',
        nome: 'Definir nome da missão 127',
        descricao: 'Em uma partida com Nelson e Gordo, termine com Nelson em 3º lugar e Gordo em 1º lugar.',
        personagensNecessarios: [2, 14],
        posicoes: [3, 1],
        recompensa: {
            personagemId: 127,
            estampaId: 127,
            nomePersonagem: 'DEFINIR_NOME_127',
            foto: 'fotos/127.png',
            estampa: 'estampa/127.png',
            audioEntrada: 'audio/127.mp3'
        }
    },
    {
        id: 'missao_128',
        nome: 'Definir nome da missão 128',
        descricao: 'Em uma partida com Nelson e Ronaldo, termine com Nelson em 2º lugar e Ronaldo em 3º lugar.',
        personagensNecessarios: [2, 15],
        posicoes: [2, 3],
        recompensa: {
            personagemId: 128,
            estampaId: 128,
            nomePersonagem: 'DEFINIR_NOME_128',
            foto: 'fotos/128.png',
            estampa: 'estampa/128.png',
            audioEntrada: 'audio/128.mp3'
        }
    },
    {
        id: 'missao_129',
        nome: 'Definir nome da missão 129',
        descricao: 'Em uma partida com Caio e Marcio, termine com Caio em 3º lugar e Marcio em 2º lugar.',
        personagensNecessarios: [3, 4],
        posicoes: [3, 2],
        recompensa: {
            personagemId: 129,
            estampaId: 129,
            nomePersonagem: 'DEFINIR_NOME_129',
            foto: 'fotos/129.png',
            estampa: 'estampa/129.png',
            audioEntrada: 'audio/129.mp3'
        }
    },
    {
        id: 'missao_130',
        nome: 'Definir nome da missão 130',
        descricao: 'Em uma partida com Caio e Julio, termine com Caio em 1º lugar e Julio em 2º lugar.',
        personagensNecessarios: [3, 5],
        posicoes: [1, 2],
        recompensa: {
            personagemId: 130,
            estampaId: 130,
            nomePersonagem: 'DEFINIR_NOME_130',
            foto: 'fotos/130.png',
            estampa: 'estampa/130.png',
            audioEntrada: 'audio/130.mp3'
        }
    },
    {
        id: 'missao_131',
        nome: 'Definir nome da missão 131',
        descricao: 'Em uma partida com Caio e Motoboy, termine com Caio em 2º lugar e Motoboy em 1º lugar.',
        personagensNecessarios: [3, 6],
        posicoes: [2, 1],
        recompensa: {
            personagemId: 131,
            estampaId: 131,
            nomePersonagem: 'DEFINIR_NOME_131',
            foto: 'fotos/131.png',
            estampa: 'estampa/131.png',
            audioEntrada: 'audio/131.mp3'
        }
    },
    {
        id: 'missao_132',
        nome: 'Definir nome da missão 132',
        descricao: 'Em uma partida com Caio e Alex, termine com Caio em 1º lugar e Alex em 3º lugar.',
        personagensNecessarios: [3, 7],
        posicoes: [1, 3],
        recompensa: {
            personagemId: 132,
            estampaId: 132,
            nomePersonagem: 'DEFINIR_NOME_132',
            foto: 'fotos/132.png',
            estampa: 'estampa/132.png',
            audioEntrada: 'audio/132.mp3'
        }
    },
    {
        id: 'missao_133',
        nome: 'Definir nome da missão 133',
        descricao: 'Em uma partida com Caio e Big Z, termine com Caio em 3º lugar e Big Z em 1º lugar.',
        personagensNecessarios: [3, 8],
        posicoes: [3, 1],
        recompensa: {
            personagemId: 133,
            estampaId: 133,
            nomePersonagem: 'DEFINIR_NOME_133',
            foto: 'fotos/133.png',
            estampa: 'estampa/133.png',
            audioEntrada: 'audio/133.mp3'
        }
    },
    {
        id: 'missao_134',
        nome: 'Definir nome da missão 134',
        descricao: 'Em uma partida com Caio e Samuel, termine com Caio em 2º lugar e Samuel em 3º lugar.',
        personagensNecessarios: [3, 9],
        posicoes: [2, 3],
        recompensa: {
            personagemId: 134,
            estampaId: 134,
            nomePersonagem: 'DEFINIR_NOME_134',
            foto: 'fotos/134.png',
            estampa: 'estampa/134.png',
            audioEntrada: 'audio/134.mp3'
        }
    },
    {
        id: 'missao_135',
        nome: 'Definir nome da missão 135',
        descricao: 'Em uma partida com Caio e Raphael, termine com Caio em 3º lugar e Raphael em 2º lugar.',
        personagensNecessarios: [3, 10],
        posicoes: [3, 2],
        recompensa: {
            personagemId: 135,
            estampaId: 135,
            nomePersonagem: 'DEFINIR_NOME_135',
            foto: 'fotos/135.png',
            estampa: 'estampa/135.png',
            audioEntrada: 'audio/135.mp3'
        }
    },
    {
        id: 'missao_136',
        nome: 'Definir nome da missão 136',
        descricao: 'Em uma partida com Caio e Metello, termine com Caio em 1º lugar e Metello em 2º lugar.',
        personagensNecessarios: [3, 11],
        posicoes: [1, 2],
        recompensa: {
            personagemId: 136,
            estampaId: 136,
            nomePersonagem: 'DEFINIR_NOME_136',
            foto: 'fotos/136.png',
            estampa: 'estampa/136.png',
            audioEntrada: 'audio/136.mp3'
        }
    },
    {
        id: 'missao_137',
        nome: 'Definir nome da missão 137',
        descricao: 'Em uma partida com Caio e Dezinho, termine com Caio em 2º lugar e Dezinho em 1º lugar.',
        personagensNecessarios: [3, 12],
        posicoes: [2, 1],
        recompensa: {
            personagemId: 137,
            estampaId: 137,
            nomePersonagem: 'DEFINIR_NOME_137',
            foto: 'fotos/137.png',
            estampa: 'estampa/137.png',
            audioEntrada: 'audio/137.mp3'
        }
    },
    {
        id: 'missao_138',
        nome: 'Definir nome da missão 138',
        descricao: 'Em uma partida com Caio e Xandão, termine com Caio em 1º lugar e Xandão em 3º lugar.',
        personagensNecessarios: [3, 13],
        posicoes: [1, 3],
        recompensa: {
            personagemId: 138,
            estampaId: 138,
            nomePersonagem: 'DEFINIR_NOME_138',
            foto: 'fotos/138.png',
            estampa: 'estampa/138.png',
            audioEntrada: 'audio/138.mp3'
        }
    },
    {
        id: 'missao_139',
        nome: 'Definir nome da missão 139',
        descricao: 'Em uma partida com Caio e Gordo, termine com Caio em 3º lugar e Gordo em 1º lugar.',
        personagensNecessarios: [3, 14],
        posicoes: [3, 1],
        recompensa: {
            personagemId: 139,
            estampaId: 139,
            nomePersonagem: 'DEFINIR_NOME_139',
            foto: 'fotos/139.png',
            estampa: 'estampa/139.png',
            audioEntrada: 'audio/139.mp3'
        }
    },
    {
        id: 'missao_140',
        nome: 'Definir nome da missão 140',
        descricao: 'Em uma partida com Caio e Ronaldo, termine com Caio em 2º lugar e Ronaldo em 3º lugar.',
        personagensNecessarios: [3, 15],
        posicoes: [2, 3],
        recompensa: {
            personagemId: 140,
            estampaId: 140,
            nomePersonagem: 'DEFINIR_NOME_140',
            foto: 'fotos/140.png',
            estampa: 'estampa/140.png',
            audioEntrada: 'audio/140.mp3'
        }
    },
    {
        id: 'missao_141',
        nome: 'Definir nome da missão 141',
        descricao: 'Em uma partida com Marcio e Julio, termine com Marcio em 3º lugar e Julio em 2º lugar.',
        personagensNecessarios: [4, 5],
        posicoes: [3, 2],
        recompensa: {
            personagemId: 141,
            estampaId: 141,
            nomePersonagem: 'DEFINIR_NOME_141',
            foto: 'fotos/141.png',
            estampa: 'estampa/141.png',
            audioEntrada: 'audio/141.mp3'
        }
    },
    {
        id: 'missao_142',
        nome: 'Definir nome da missão 142',
        descricao: 'Em uma partida com Marcio e Motoboy, termine com Marcio em 1º lugar e Motoboy em 2º lugar.',
        personagensNecessarios: [4, 6],
        posicoes: [1, 2],
        recompensa: {
            personagemId: 142,
            estampaId: 142,
            nomePersonagem: 'DEFINIR_NOME_142',
            foto: 'fotos/142.png',
            estampa: 'estampa/142.png',
            audioEntrada: 'audio/142.mp3'
        }
    },
    {
        id: 'missao_143',
        nome: 'Definir nome da missão 143',
        descricao: 'Em uma partida com Marcio e Alex, termine com Marcio em 2º lugar e Alex em 1º lugar.',
        personagensNecessarios: [4, 7],
        posicoes: [2, 1],
        recompensa: {
            personagemId: 143,
            estampaId: 143,
            nomePersonagem: 'DEFINIR_NOME_143',
            foto: 'fotos/143.png',
            estampa: 'estampa/143.png',
            audioEntrada: 'audio/143.mp3'
        }
    },
    {
        id: 'missao_144',
        nome: 'Definir nome da missão 144',
        descricao: 'Em uma partida com Marcio e Big Z, termine com Marcio em 1º lugar e Big Z em 3º lugar.',
        personagensNecessarios: [4, 8],
        posicoes: [1, 3],
        recompensa: {
            personagemId: 144,
            estampaId: 144,
            nomePersonagem: 'DEFINIR_NOME_144',
            foto: 'fotos/144.png',
            estampa: 'estampa/144.png',
            audioEntrada: 'audio/144.mp3'
        }
    },
    {
        id: 'missao_145',
        nome: 'Definir nome da missão 145',
        descricao: 'Em uma partida com Marcio e Samuel, termine com Marcio em 3º lugar e Samuel em 1º lugar.',
        personagensNecessarios: [4, 9],
        posicoes: [3, 1],
        recompensa: {
            personagemId: 145,
            estampaId: 145,
            nomePersonagem: 'DEFINIR_NOME_145',
            foto: 'fotos/145.png',
            estampa: 'estampa/145.png',
            audioEntrada: 'audio/145.mp3'
        }
    },
    {
        id: 'missao_146',
        nome: 'Definir nome da missão 146',
        descricao: 'Em uma partida com Marcio e Raphael, termine com Marcio em 2º lugar e Raphael em 3º lugar.',
        personagensNecessarios: [4, 10],
        posicoes: [2, 3],
        recompensa: {
            personagemId: 146,
            estampaId: 146,
            nomePersonagem: 'DEFINIR_NOME_146',
            foto: 'fotos/146.png',
            estampa: 'estampa/146.png',
            audioEntrada: 'audio/146.mp3'
        }
    },
    {
        id: 'missao_147',
        nome: 'Definir nome da missão 147',
        descricao: 'Em uma partida com Marcio e Metello, termine com Marcio em 3º lugar e Metello em 2º lugar.',
        personagensNecessarios: [4, 11],
        posicoes: [3, 2],
        recompensa: {
            personagemId: 147,
            estampaId: 147,
            nomePersonagem: 'DEFINIR_NOME_147',
            foto: 'fotos/147.png',
            estampa: 'estampa/147.png',
            audioEntrada: 'audio/147.mp3'
        }
    },
    {
        id: 'missao_148',
        nome: 'Definir nome da missão 148',
        descricao: 'Em uma partida com Marcio e Dezinho, termine com Marcio em 1º lugar e Dezinho em 2º lugar.',
        personagensNecessarios: [4, 12],
        posicoes: [1, 2],
        recompensa: {
            personagemId: 148,
            estampaId: 148,
            nomePersonagem: 'DEFINIR_NOME_148',
            foto: 'fotos/148.png',
            estampa: 'estampa/148.png',
            audioEntrada: 'audio/148.mp3'
        }
    },
    {
        id: 'missao_149',
        nome: 'Definir nome da missão 149',
        descricao: 'Em uma partida com Marcio e Xandão, termine com Marcio em 2º lugar e Xandão em 1º lugar.',
        personagensNecessarios: [4, 13],
        posicoes: [2, 1],
        recompensa: {
            personagemId: 149,
            estampaId: 149,
            nomePersonagem: 'DEFINIR_NOME_149',
            foto: 'fotos/149.png',
            estampa: 'estampa/149.png',
            audioEntrada: 'audio/149.mp3'
        }
    },
    {
        id: 'missao_150',
        nome: 'Definir nome da missão 150',
        descricao: 'Em uma partida com Marcio e Gordo, termine com Marcio em 1º lugar e Gordo em 3º lugar.',
        personagensNecessarios: [4, 14],
        posicoes: [1, 3],
        recompensa: {
            personagemId: 150,
            estampaId: 150,
            nomePersonagem: 'DEFINIR_NOME_150',
            foto: 'fotos/150.png',
            estampa: 'estampa/150.png',
            audioEntrada: 'audio/150.mp3'
        }
    },
    {
        id: 'missao_151',
        nome: 'Definir nome da missão 151',
        descricao: 'Em uma partida com Marcio e Ronaldo, termine com Marcio em 3º lugar e Ronaldo em 1º lugar.',
        personagensNecessarios: [4, 15],
        posicoes: [3, 1],
        recompensa: {
            personagemId: 151,
            estampaId: 151,
            nomePersonagem: 'DEFINIR_NOME_151',
            foto: 'fotos/151.png',
            estampa: 'estampa/151.png',
            audioEntrada: 'audio/151.mp3'
        }
    },
*/
