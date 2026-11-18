// Missões ativas. Uma missão é sorteada a cada 3 partidas completas no modo Sozinho.
// Para concluir, o jogador precisa NÃO terminar em último lugar.
window.MISSOES = [
    {
        id: 'missao_azul',
        nome: 'Missão Azul',
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Marcio.',
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
        descricao: 'Não fique em último lugar em uma partida que contenha Xandão e Caio.',
        personagensNecessarios: [13, 3],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Motoboy e Nelson.',
        personagensNecessarios: [6, 2],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Ronaldo.',
        personagensNecessarios: [1, 15],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Motoboy.',
        personagensNecessarios: [1, 6],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Julio.',
        personagensNecessarios: [1, 5],
        recompensa: {
            personagemId: 105,
            estampaId: 105,
            nomePersonagem: 'Alvinho',
            foto: 'fotos/105.png',
            estampa: 'estampa/105.png',
            audioEntrada: 'audio/105.mp3'
        }
    },
];

/*
 * MODELOS DE 50 NOVAS MISSÕES — IDs 102 a 151.
 * Estão comentadas/desativadas. Quando definir o personagem e preparar os arquivos,
 * preencha nomePersonagem/nome/descricao e retire os comentários do objeto desejado,
 * copiando-o para dentro de window.MISSOES.
 * Arquivos previstos: fotos/ID.png, estampa/ID.png e audio/ID.mp3.
 * Os objetivos usam a regra: não terminar em último lugar.
 */
/*



    {
        id: 'missao_106',
        nome: 'Definir nome da missão 106',
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Motoboy.',
        personagensNecessarios: [1, 6],
        recompensa: {
            personagemId: 106,
            estampaId: 106,
            nomePersonagem: 'DEFINIR_NOME_106',
            foto: 'fotos/106.png',
            estampa: 'estampa/106.png',
            audioEntrada: 'audio/106.mp3'
        }
    },
    {
        id: 'missao_107',
        nome: 'Definir nome da missão 107',
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Alex.',
        personagensNecessarios: [1, 7],
        recompensa: {
            personagemId: 107,
            estampaId: 107,
            nomePersonagem: 'DEFINIR_NOME_107',
            foto: 'fotos/107.png',
            estampa: 'estampa/107.png',
            audioEntrada: 'audio/107.mp3'
        }
    },
    {
        id: 'missao_108',
        nome: 'Definir nome da missão 108',
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Big Z.',
        personagensNecessarios: [1, 8],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Samuel.',
        personagensNecessarios: [1, 9],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Raphael.',
        personagensNecessarios: [1, 10],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Metello.',
        personagensNecessarios: [1, 11],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Dezinho.',
        personagensNecessarios: [1, 12],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Xandão.',
        personagensNecessarios: [1, 13],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Gordo.',
        personagensNecessarios: [1, 14],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Alcy e Ronaldo.',
        personagensNecessarios: [1, 15],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Caio.',
        personagensNecessarios: [2, 3],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Marcio.',
        personagensNecessarios: [2, 4],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Julio.',
        personagensNecessarios: [2, 5],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Motoboy.',
        personagensNecessarios: [2, 6],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Alex.',
        personagensNecessarios: [2, 7],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Big Z.',
        personagensNecessarios: [2, 8],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Samuel.',
        personagensNecessarios: [2, 9],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Raphael.',
        personagensNecessarios: [2, 10],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Metello.',
        personagensNecessarios: [2, 11],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Dezinho.',
        personagensNecessarios: [2, 12],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Xandão.',
        personagensNecessarios: [2, 13],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Gordo.',
        personagensNecessarios: [2, 14],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Nelson e Ronaldo.',
        personagensNecessarios: [2, 15],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Caio e Marcio.',
        personagensNecessarios: [3, 4],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Caio e Julio.',
        personagensNecessarios: [3, 5],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Caio e Motoboy.',
        personagensNecessarios: [3, 6],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Caio e Alex.',
        personagensNecessarios: [3, 7],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Caio e Big Z.',
        personagensNecessarios: [3, 8],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Caio e Samuel.',
        personagensNecessarios: [3, 9],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Caio e Raphael.',
        personagensNecessarios: [3, 10],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Caio e Metello.',
        personagensNecessarios: [3, 11],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Caio e Dezinho.',
        personagensNecessarios: [3, 12],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Caio e Xandão.',
        personagensNecessarios: [3, 13],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Caio e Gordo.',
        personagensNecessarios: [3, 14],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Caio e Ronaldo.',
        personagensNecessarios: [3, 15],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Marcio e Julio.',
        personagensNecessarios: [4, 5],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Marcio e Motoboy.',
        personagensNecessarios: [4, 6],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Marcio e Alex.',
        personagensNecessarios: [4, 7],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Marcio e Big Z.',
        personagensNecessarios: [4, 8],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Marcio e Samuel.',
        personagensNecessarios: [4, 9],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Marcio e Raphael.',
        personagensNecessarios: [4, 10],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Marcio e Metello.',
        personagensNecessarios: [4, 11],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Marcio e Dezinho.',
        personagensNecessarios: [4, 12],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Marcio e Xandão.',
        personagensNecessarios: [4, 13],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Marcio e Gordo.',
        personagensNecessarios: [4, 14],
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
        descricao: 'Não fique em último lugar em uma partida que contenha Marcio e Ronaldo.',
        personagensNecessarios: [4, 15],
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
