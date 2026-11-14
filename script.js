// ================= CONFIGURAÇÃO =================
const ESP = 0, COP = 1, OUR = 2, PAU = 3;
const NAIPES = [
    { nome: 'Espadas', s: '♠', cor: 'preto' }, { nome: 'Copas', s: '♥', cor: 'vermelho' },
    { nome: 'Ouros', s: '♦', cor: 'vermelho' }, { nome: 'Paus', s: '♣', cor: 'preto' }
];
const FACES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const NOMES_FACE = { J: 'Valete', Q: 'Dama', K: 'Rei', A: 'Ás' };
const LIMITE = 60;
const ORDEM_MAO = [PAU, OUR, ESP, COP];
const ehDama = c => c.naipe === ESP && c.valor === 10;
const pontosCarta = c => c.naipe === COP ? 1 : (ehDama(c) ? 13 : 0);
const $ = id => document.getElementById(id);

let nomeJogador = '', G = null;
let cartaSelecionadaId = null;

// ================= BARALHO =================
function criarBaralho() {
    const b = [];
    for (let n = 0; n < 4; n++) for (let v = 0; v < 13; v++) b.push({ naipe: n, valor: v, id: `${n}-${v}` });
    return b;
}
function embaralhar(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}
function nomeCarta(c) { const f = FACES[c.valor]; return `${NOMES_FACE[f] || f} de ${NAIPES[c.naipe].nome}`; }

function criarElementoCarta(c, extra = '') {
    const d = document.createElement('div');
    const f = FACES[c.valor], s = NAIPES[c.naipe].s;
    d.className = `carta ${NAIPES[c.naipe].cor} ${extra}`;
    const pts = pontosCarta(c);
    d.innerHTML = `<div class="topo"><span class="valor">${f}</span><span class="np">${s}</span></div>
        <div class="centro">${s}</div>
        <div class="base"><span class="valor">${f}</span><span class="np">${s}</span></div>`;
    d.setAttribute('aria-label', nomeCarta(c) + (pts ? `, vale ${pts} ponto${pts > 1 ? 's' : ''}` : ''));
    return d;
}

// ================= PERSONAGENS E INÍCIO =================
const PERSONAGENS = [
    'Alcy','Nelson','Caio','Marcio','Julio','Motoboy','Alex',
    'Big Z','Samuel','Raphael','Metello','Dezinho','Xandão','Gordo','Ronaldo'
].map((nome, i) => ({ id: i + 1, nome, foto: `fotos/${i + 1}.png`, total: 0, pontosRank: 0 }));

let jogadorHumano = null;
let filaMaquinas = [];
let maquinasEliminadas = [];

function montarSelecao() {
    const grade = $('gradePersonagens');
    if (!grade) return;
    grade.innerHTML = '';
    PERSONAGENS.forEach(p => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'personagem-card';
        card.innerHTML = `<img src="${p.foto}" alt="${p.nome}" onerror="this.src='fotos/${p.id}.png'; this.onerror=null"><strong>${p.nome}</strong>`;
        card.onclick = () => {
            jogadorHumano = p;
            $('personagemEscolhido').innerHTML = `Você escolheu: <b>${p.nome}</b>`;
            document.querySelectorAll('.personagem-card').forEach(c => c.classList.remove('escolhido'));
            card.classList.add('escolhido');
            $('btnComecar').disabled = false;
        };
        grade.appendChild(card);
    });
}
if ($('btnComecar')) $('btnComecar').onclick = iniciarPartida;
montarSelecao();

function iniciarPartida() {
    if (!jogadorHumano) return;
    PERSONAGENS.forEach(p => { p.total = 0; p.pontosRank = 0; });
    const disponiveis = embaralhar(PERSONAGENS.filter(p => p.id !== jogadorHumano.id).slice());
    const bots = disponiveis.splice(0, 3);
    filaMaquinas = disponiveis;
    maquinasEliminadas = [];
    const participantes = [jogadorHumano, ...bots];
    nomeJogador = jogadorHumano.nome;
    $('telaLogin').classList.add('escondido');
    $('jogo').classList.remove('escondido');
    ajustarEscala();
    G = {
        nomes: participantes.map(p => p.nome),
        personagens: participantes,
        totais: participantes.map(p => p.total),
        rodada: 0,
        fila: filaMaquinas,
        rankingGeral: PERSONAGENS
    };
    novaRodada();
}

function novaRodada() {
    G.rodada++;
    cartaSelecionadaId = null;
    const b = embaralhar(criarBaralho());
    G.maos = [0, 1, 2, 3].map(i => b.slice(i * 13, i * 13 + 13));
    G.mesa = []; G.lider = null; G.quebrada = false; G.vazas = 0;
    G.pts = [0, 0, 0, 0]; G.pegas = [[], [], [], []]; G.renunciou = [false, false, false, false]; G.ocupado = false; G.aviso = '';
    G.turno = G.maos.findIndex(m => m.some(c => c.naipe === PAU && c.valor === 0));
    G.distribuindo = true; G.rodadaEncerrada = false; G.cartasReveladas = 0;
    G.ordemDistribuicao = [];
    for (let rodada = 0; rodada < 13; rodada++) for (let jogador = 0; jogador < 4; jogador++)
        G.ordemDistribuicao.push({ jogador, carta: G.maos[jogador][rodada] });
    for (let i = 0; i < 4; i++) $(`carta-${i}`).innerHTML = '';
    $('modal').classList.add('escondido');
    $('modalRanking').classList.add('escondido');
    render();
    ajustarEscala();
    render();
    G.timer = setTimeout(revelarProximaCarta, 180);
}

function revelarProximaCarta() {
    if (!G || !G.distribuindo) return;
    G.cartasReveladas++;
    render();
    if (G.cartasReveladas < 52) {
        G.timer = setTimeout(revelarProximaCarta, 75);
    } else {
        G.distribuindo = false;
        G.timer = setTimeout(() => { G.aviso = ''; agendar(); }, 450);
    }
}

// ================= REGRAS =================
function validar(i, c) {
    const mao = G.maos[i];
    if (G.mesa.length === 0) {
        if (G.vazas === 0 && !(c.naipe === PAU && c.valor === 0)) return 'A primeira carta da rodada deve ser o 2♣.';
        if (c.naipe === COP && !G.quebrada && mao.some(x => x.naipe !== COP))
            return 'Copas só podem ser jogadas depois que alguém descartar uma.';
        return null;
    }
    if (c.naipe !== G.lider && mao.some(x => x.naipe === G.lider))
        return `Você precisa seguir o naipe puxado: ${NAIPES[G.lider].nome}.`;
    return null;
}

function jogar(i, c) {
    if (i === 0) cartaSelecionadaId = null;
    const renuncia = G.mesa.length > 0 && c.naipe !== G.lider &&
        G.maos[i].some(x => x.naipe === G.lider);

    if (renuncia) G.renunciou[i] = true;

    G.maos[i] = G.maos[i].filter(x => x.id !== c.id);
    G.mesa.push({ jogador: i, carta: c });

    if (G.mesa.length === 1) G.lider = c.naipe;
    if (c.naipe === COP) G.quebrada = true;

    if (ehDama(c)) {
        mostrarQ();
        tocarAudioDama();
    }

    $(`carta-${i}`).appendChild(
        criarElementoCarta(c, 'jogada' + (G.mesa.length === 1 ? ' carta-lider' : ''))
    );

    if (renuncia) {
        G.ocupado = true;
        G.aviso = `${G.nomes[i]} RENUNCIOU! Recebeu os 26 pontos.`;
        clearTimeout(G.timer);
        render();
        G.timer = setTimeout(() => { fimRodada(); }, 1100);
        return;
    }

    G.aviso = '';
    G.turno = (G.turno + 1) % 4;

    if (G.mesa.length === 4) {
        G.ocupado = true;
        render();
        G.timer = setTimeout(resolverVaza, 1300);
    } else {
        agendar();
    }
}

function resolverVaza() {
    let venc = null;
    G.mesa.forEach(j => {
        if (j.carta.naipe === G.lider && (!venc || j.carta.valor > venc.carta.valor)) venc = j;
    });
    const w = venc.jogador;
    const pontos = G.mesa.reduce((s, j) => s + pontosCarta(j.carta), 0);
    G.pts[w] += pontos;
    G.mesa.forEach(j => { if (pontosCarta(j.carta)) G.pegas[w].push(j.carta); });
    $(`carta-${w}`).firstChild.classList.add('carta-vencedora');
    G.aviso = `${G.nomes[w]} levou a mesa${pontos ? ` (+${pontos} pts)` : ''}`;
    render();
    G.vazas++;
    G.timer = setTimeout(() => {
        G.mesa = []; G.lider = null; G.ocupado = false; G.aviso = '';
        for (let i = 0; i < 4; i++) $(`carta-${i}`).innerHTML = '';
        G.turno = w;
        if (G.vazas === 13) fimRodada(); else agendar();
    }, 1100);
}

function fimRodada() {
    const renunciante = G.renunciou.findIndex(Boolean);
    const lua = renunciante >= 0 ? -1 : G.pts.findIndex(p => p === 26);
    const ganho = renunciante >= 0
        ? G.pts.map((p, i) => i === renunciante ? 26 : 0)
        : G.pts.map((p, i) => lua >= 0 ? (i === lua ? 0 : 26) : p);
    G.pts = ganho.slice();

    const jogadoresMesaRodada = G.personagens.map((p, i) => {
        p.total += ganho[i];
        G.totais[i] = p.total;
        return { personagem: p, nome: G.nomes[i], ganhoRodada: ganho[i], totalPartida: p.total };
    });

    // REQUISITO 1: Pontuação da Mesa (0, 1, 2, 4 pontos de rank conforme colocação)
    const classificacaoMesa = [...jogadoresMesaRodada].sort((a, b) =>
        a.ganhoRodada - b.ganhoRodada || a.totalPartida - b.totalPartida
    );

    const tabelaPontosRankRodada = [0, 1, 2, 4];
    classificacaoMesa.forEach((item, idx) => {
        let posEfetiva = idx;
        while (
            posEfetiva > 0 &&
            classificacaoMesa[posEfetiva - 1].ganhoRodada === item.ganhoRodada
        ) { posEfetiva--; }
        const ptsRankGanho = tabelaPontosRankRodada[Math.min(posEfetiva, 3)];
        item.ptsRankGanho = ptsRankGanho;
        item.personagem.pontosRank += ptsRankGanho;
    });

    const eliminadosAgora = [];
    for (let i = 1; i < 4; i++) {
        if (G.personagens[i].total >= LIMITE) eliminadosAgora.push({ indice: i, nome: G.personagens[i].nome });
    }
    
    // REQUISITO 1 (Parte 2): Novos integrantes da reserva entram com pontos zerados na mesa
    eliminadosAgora.forEach(({ indice: i }) => {
        const saiu = G.personagens[i];
        maquinasEliminadas.push(saiu);
        const proxima = G.fila.shift();
        if (proxima) {
            proxima.total = 0; // zera ao entrar na mesa
            G.personagens[i] = proxima;
            G.nomes[i] = proxima.nome;
            G.totais[i] = proxima.total;
        }
    });

    const humanoPerdeu = G.personagens[0].total >= LIMITE;
    const fim = humanoPerdeu || (!G.fila.length && eliminadosAgora.length > 0);

    let h = fim ? '<h2>🏁 Fim de jogo!</h2>' : `<h2>Fim da rodada ${G.rodada}</h2>`;
    const menorPontuacao = Math.min(...ganho);
    
    // REQUISITO 3: Exibir 26.gif se alguém pegou todos os pontos
    if (ganho.some(p => p === 26)) {
        h += `<img class="sticker-menor-pontuacao" src="26.gif" alt="26 pontos">`;
    } else if (ganho[0] === menorPontuacao) {
        h += `<img class="sticker-menor-pontuacao" src="26.gif" alt="Menor pontuação">`;
    }

    if (renunciante >= 0) h += `<p>⚠️ <b>${jogadoresMesaRodada[renunciante].nome} RENUNCIOU!</b> Recebeu 26 pontos.</p>`;
    else if (lua >= 0) h += `<p>🌕 <b>${jogadoresMesaRodada[lua].nome}</b> pegou todos os 26 pontos!</p>`;

    h += '<h3>Classificação da Mesa</h3><table><tr><th>#</th><th>Jogador</th><th>Pts Rodada</th><th>Pts Rank</th><th>Total</th></tr>';
    classificacaoMesa.forEach((item, pos) => {
        const p = item.personagem;
        const ehEu = p.id === jogadorHumano.id;
        h += `<tr class="${ehEu ? 'eu' : ''}">
            <td>${pos + 1}º</td><td>${p.nome}</td><td>+${item.ganhoRodada}</td><td><b>+${item.ptsRankGanho}</b></td><td>${item.totalPartida}</td>
        </tr>`;
    });
    h += '</table>';

    if (fim) {
        const rankingFinal = [...PERSONAGENS].sort((a, b) => a.pontosRank - b.pontosRank || a.total - b.total);
        h += '<h3>🏆 Ranking Geral Final</h3><table><tr><th>#</th><th>Jogador</th><th>Pts Rank</th><th>Total Mesa</th></tr>';
        rankingFinal.forEach((p, pos) => {
            const ehEu = p.id === jogadorHumano.id;
            h += `<tr class="${ehEu ? 'eu' : ''}"><td>${pos + 1}º</td><td>${p.nome}${ehEu ? ' (Você)' : ''}</td><td><b>${p.pontosRank}</b></td><td>${p.total}</td></tr>`;
        });
        h += '</table>';
    }

    h += `<button class="btn-modo" id="btnModal">${fim ? 'Escolher personagens novamente' : 'Próxima rodada'}</button>`;
    G.rodadaEncerrada = true;
    $('modalBox').innerHTML = h;
    $('modal').classList.remove('escondido');
    $('btnModal').focus();
    $('btnModal').onclick = fim ? () => {
        G = null; jogadorHumano = null; $('jogo').classList.add('escondido');
        $('telaLogin').classList.remove('escondido');
        $('personagemEscolhido').textContent = 'Escolha seu personagem';
        $('btnComecar').disabled = true;
        document.querySelectorAll('.personagem-card').forEach(c => c.classList.remove('escolhido'));
    } : () => {
        G.nomes = G.personagens.map(p => p.nome);
        G.totais = G.personagens.map(p => p.total);
        novaRodada();
    };
    render();
}

// ================= REQUISITO 2: BOTÃO RESET NO RANKING GERAL =================
function abrirRankingGeral() {
    if (!G) return;
    const ranking = [...PERSONAGENS].sort((a, b) => a.pontosRank - b.pontosRank || a.total - b.total);
    let h = '<h2>🏆 Ranking Geral</h2>';
    h += '<table><tr><th>#</th><th>Jogador</th><th>Rank</th><th>Mesa</th></tr>';
    ranking.forEach((p, pos) => {
        const ehEu = jogadorHumano && p.id === jogadorHumano.id;
        h += `<tr class="${ehEu ? 'eu' : ''}">
            <td>${pos + 1}º</td><td>${p.nome}${ehEu ? ' (Você)' : ''}</td><td><b>${p.pontosRank}</b></td><td>${p.total}</td>
        </tr>`;
    });
    h += '</table>';
    h += '<div style="display:flex; gap:10px; margin-top:10px;">';
    h += '<button type="button" class="btn-modo" id="btnResetGeral" style="background:#c62828;">Zerar Placar e Reiniciar</button>';
    h += '<button type="button" class="btn-modo" id="btnFecharRanking">Fechar</button>';
    h += '</div>';

    $('modalRankingBox').innerHTML = h;
    $('modalRanking').classList.remove('escondido');

    $('btnResetGeral').onclick = () => {
        PERSONAGENS.forEach(p => { p.total = 0; p.pontosRank = 0; });
        $('modalRanking').classList.add('escondido');
        $('jogo').classList.add('escondido');
        $('telaLogin').classList.remove('escondido');
        G = null; jogadorHumano = null;
        $('personagemEscolhido').textContent = 'Escolha seu personagem';
        $('btnComecar').disabled = true;
        document.querySelectorAll('.personagem-card').forEach(c => c.classList.remove('escolhido'));
    };

    $('btnFecharRanking').onclick = () => $('modalRanking').classList.add('escondido');
}
if ($('btnRanking')) $('btnRanking').onclick = abrirRankingGeral;

// ================= FLUXO E IA ESTRATÉGICA (REQUISITO 4) =================
function agendar() {
    clearTimeout(G.timer);
    render();
    if (G.mesa.length === 4) return;
    if (G.turno === 0) {
        if (G.vazas === 0 && G.mesa.length === 0)
            G.timer = setTimeout(() => jogar(0, G.maos[0].find(c => c.naipe === PAU && c.valor === 0)), 900);
    } else {
        G.timer = setTimeout(() => { const c = escolherBot(G.turno); jogar(G.turno, c); }, 900);
    }
}

function tentarJogar(c) {
    if (G.distribuindo || G.turno !== 0 || G.ocupado || G.mesa.length === 4) return;
    const erro = validar(0, c);
    const renuncia = G.mesa.length > 0 && c.naipe !== G.lider &&
        G.maos[0].some(x => x.naipe === G.lider);
    if (erro && !renuncia) { G.aviso = '⚠ ' + erro; render(); return; }
    jogar(0, c);
}

// IA Estratégica
function escolherBot(i) {
    const mao = G.maos[i];
    const validas = mao.filter(c => !validar(i, c));
    if (!validas.length) return mao[0];

    // Identifica se alguém está em perigo de fechar a lua (já acumulou cartas de pontos na rodada)
    const riscoLua = G.pts.some(p => p > 0 && p < 26);
    const liderComMaisPontos = G.totais.indexOf(Math.max(...G.totais));

    // Se abrir a mesa
    if (G.mesa.length === 0) {
        if (G.vazas === 0) return validas.find(c => c.naipe === PAU && c.valor === 0) || validas[0];
        
        // Evita liderar copas se não necessário, tenta dar cartas altas para quem tem mais pontos
        const semCopas = validas.filter(c => c.naipe !== COP);
        const pool = semCopas.length ? semCopas : validas;
        return pool.sort((a, b) => b.valor - a.valor)[0]; // Joga carta alta para tentar pontuar quem tem mais
    }

    // Seguindo o naipe
    const seguem = validas.filter(c => c.naipe === G.lider);
    if (seguem.length) {
        const maiorMesa = Math.max(...G.mesa.filter(j => j.carta.naipe === G.lider).map(j => j.carta.valor));
        const cartasBaixas = seguem.filter(c => c.valor < maiorMesa).sort((a, b) => b.valor - a.valor);
        const cartasAltas = seguem.filter(c => c.valor > maiorMesa).sort((a, b) => a.valor - b.valor);

        // Se há risco de alguém fechar a lua, a IA evita somar pontos e descarta a menor possível
        if (riscoLua) {
            if (cartasBaixas.length) return cartasBaixas[0];
            return seguem.sort((a, b) => a.valor - b.valor)[0];
        }

        // Caso normal: tenta dar a vaza (e pontos) para quem tem mais pontos na partida se a mesa tiver pontos
        const mesaTemPontos = G.mesa.some(j => pontosCarta(j.carta) > 0);
        if (mesaTemPontos && cartasAltas.length && i !== liderComMaisPontos) {
            return cartasAltas[cartasAltas.length - 1]; // Tenta pegar com carta alta
        }
        
        if (cartasBaixas.length) return cartasBaixas[0];
        return seguem[0];
    }

    // Descates (não pode seguir o naipe)
    const dama = validas.find(ehDama);
    const copas = validas.filter(c => c.naipe === COP).sort((a, b) => b.valor - a.valor);

    // Se tiver a Dama de Espadas e não houver risco de lua, tenta empurrar para alguém
    if (dama && !riscoLua) return dama;
    if (copas.length && !riscoLua) return copas[0];

    // Descarta a carta mais alta indesejada
    return validas.sort((a, b) => b.valor - a.valor)[0];
}

function render() {
    if (!G) return;
    const minha = G.turno === 0 && !G.ocupado && G.mesa.length < 4;
    const div = $('maoJogador'); div.innerHTML = '';
    G.maos[0].sort((a, b) => ORDEM_MAO.indexOf(a.naipe) - ORDEM_MAO.indexOf(b.naipe) || a.valor - b.valor);

    G.maos[0].forEach(c => {
        const indice = G.ordemDistribuicao ? G.ordemDistribuicao.findIndex(x => x.jogador === 0 && x.carta.id === c.id) : -1;
        const revelada = !G.distribuindo || indice < G.cartasReveladas;
        const el = revelada ? criarElementoCarta(c) : document.createElement('div');
        if(!revelada) el.className = 'carta verso';

        if (revelada && !G.distribuindo) {
            if (cartaSelecionadaId === c.id) el.classList.add('selecionada');
            el.onclick = () => {
                if (cartaSelecionadaId === c.id) tentarJogar(c);
                else {
                    cartaSelecionadaId = c.id;
                    document.querySelectorAll('#maoJogador .carta').forEach(cardEl => cardEl.classList.remove('selecionada'));
                    el.classList.add('selecionada');
                }
            };
            el.ondblclick = () => tentarJogar(c);
        }
        div.appendChild(el);
    });

    for (let i = 0; i < 4; i++) {
        const box = $(`j${i}`);
        if(!box) continue;
        box.classList.toggle('turno-ativo', i === G.turno && !G.ocupado);
        const ranking = [...PERSONAGENS].sort((a, b) => a.pontosRank - b.pontosRank || a.total - b.total).findIndex(p => p.id === G.personagens[i].id) + 1;
        box.innerHTML = `<img class="avatar-jogador" src="${G.personagens[i].foto}" alt="${G.nomes[i]}" onerror="this.src='fotos/${G.personagens[i].id}.png'; this.onerror=null">
            <div class="info-jogador">
                <span class="nome">${G.nomes[i]} <small class="ranking">${ranking}º</small></span>
                <span class="tot">Total: ${G.totais[i]}</span>
                <span class="rod">Rodada: ${G.pts[i]}</span>
            </div>`;
    }

    const st = $('status');
    if(st) {
        st.classList.toggle('aviso', G.aviso.startsWith('⚠'));
        if (G.distribuindo) st.textContent = 'Distribuindo as cartas…';
        else if (G.aviso) st.textContent = G.aviso;
        else if (minha) st.textContent = 'Sua vez de jogar!';
        else st.textContent = `Vez de ${G.nomes[G.turno]}…`;
    }
}

function mostrarQ() {
    const e = $('efeitoQ');
    if (!e) return;
    e.classList.remove('escondido');
    clearTimeout(mostrarQ.t);
    mostra
