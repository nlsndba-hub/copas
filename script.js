// ================= CONFIGURAÇÃO =================
// 0=Espadas 1=Copas 2=Ouros 3=Paus  |  valor 0..12 => 2,3,...,10,J,Q,K,A
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
    const badge = '';
    d.innerHTML = `<div class="topo"><span class="valor">${f}</span><span class="np">${s}</span></div>
        <div class="centro">${s}</div>${badge}
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
$('btnComecar').onclick = iniciarPartida;
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
    ajustarEscala();   // mede com os painéis já preenchidos (nome, pontos, foto)
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
            return 'Copas só podem ser jogadas depois que alguém descartar uma (ou se você só tiver copas).';
        return null;
    }
    if (c.naipe !== G.lider && mao.some(x => x.naipe === G.lider))
        return `Você precisa seguir o naipe puxado: ${NAIPES[G.lider].nome} ${NAIPES[G.lider].s}.`;
    return null;
}

function jogar(i, c) {
    if (i === 0) cartaSelecionadaId = null;
    const renuncia = G.mesa.length > 0 && c.naipe !== G.lider &&
        G.maos[i].some(x => x.naipe === G.lider);

    if (renuncia) {
        G.renunciou[i] = true;
    }

    G.maos[i] = G.maos[i].filter(x => x.id !== c.id);
    G.mesa.push({ jogador: i, carta: c });

    if (G.mesa.length === 1) G.lider = c.naipe;
    if (c.naipe === COP) G.quebrada = true;

    if (ehDama(c)) {
        mostrarQ();
        tocarAudioDama();
    }

    $(`carta-${i}`).appendChild(
        criarElementoCarta(c, 'jogada' +
            (G.mesa.length === 1 ? ' carta-lider' : ''))
    );

    if (renuncia) {
        G.ocupado = true;
        G.aviso = `${G.nomes[i]} RENUNCIOU! Recebeu os 26 pontos da rodada.`;
        clearTimeout(G.timer);
        render();
        G.timer = setTimeout(() => {
            fimRodada();
        }, 1100);
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
    G.aviso = `${G.nomes[w]} levou a mesa${pontos ? ` (+${pontos} pt${pontos > 1 ? 's' : ''})` : ''}`;
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
        return {
            personagem: p,
            nome: G.nomes[i],
            ganhoRodada: ganho[i],
            totalPartida: p.total
        };
    });

    const classificacaoMesa = [...jogadoresMesaRodada].sort((a, b) =>
        a.totalPartida - b.totalPartida || a.ganhoRodada - b.ganhoRodada
    );

    classificacaoMesa.forEach((item, idx) => {
        let posEfetiva = idx;
        while (
            posEfetiva > 0 &&
            classificacaoMesa[posEfetiva - 1].totalPartida === item.totalPartida &&
            classificacaoMesa[posEfetiva - 1].ganhoRodada === item.ganhoRodada
        ) {
            posEfetiva--;
        }
        const ptsRankGanho = posEfetiva + 1;
        item.ptsRankGanho = ptsRankGanho;
        item.personagem.pontosRank += ptsRankGanho;
    });

    const eliminadosAgora = [];
    for (let i = 1; i < 4; i++) {
        if (G.personagens[i].total >= LIMITE) eliminadosAgora.push({ indice: i, nome: G.personagens[i].nome });
    }
    eliminadosAgora.forEach(({ indice: i }) => {
        const saiu = G.personagens[i];
        maquinasEliminadas.push(saiu);
        const proxima = G.fila.shift();
        if (proxima) {
            G.personagens[i] = proxima;
            G.nomes[i] = proxima.nome;
            G.totais[i] = proxima.total;
        }
    });

    const humanoPerdeu = G.personagens[0].total >= LIMITE;
    const fim = humanoPerdeu || (!G.fila.length && eliminadosAgora.length > 0);

    let h = fim ? '<h2>🏁 Fim de jogo!</h2>' : `<h2>Fim da rodada ${G.rodada}</h2>`;
    const menorPontuacao = Math.min(...ganho);
    if (ganho[0] === menorPontuacao) h += `<img class="sticker-menor-pontuacao" src="menor-pontuacao.gif" alt="Sticker comemorativo">`;
    if (renunciante >= 0) h += `<p>⚠️ <b>${jogadoresMesaRodada[renunciante].nome} RENUNCIOU!</b> Por jogar fora do naipe tendo cartas do naipe solicitado, recebeu os 26 pontos da rodada.</p>`;
    else if (lua >= 0) h += `<p>🌕 <b>${jogadoresMesaRodada[lua].nome}</b> pegou os 26 pontos! Ele não pontua e os outros levam 26.</p>`;
    if (eliminadosAgora.length) h += `<p>🚪 Saíram da mesa: ${eliminadosAgora.map(p => p.nome).join(', ')}. ${G.fila.length ? 'Novas máquinas entram na próxima rodada.' : 'Não há mais reservas.'}</p>`;

    h += '<h3>Classificação da Mesa</h3><table><tr><th>#</th><th>Jogador</th><th>Total</th><th>Rank Geral</th><th>Situação</th></tr>';
    classificacaoMesa.forEach((item, pos) => {
        const p = item.personagem;
        const ehEu = p.id === jogadorHumano.id;
        const situacao = ehEu ? 'Você' : (p.total >= LIMITE ? 'Eliminado' : 'Na mesa');
        h += `<tr class="${p.total >= LIMITE ? 'perdeu ' : ''}${ehEu ? 'eu' : ''}">
            <td>${pos + 1}º</td>
            <td>${p.nome}</td>
            <td>${item.totalPartida}</td>
            <td><b>+${item.ptsRankGanho}</b> (${p.pontosRank})</td>
            <td>${situacao}</td>
        </tr>`;
    });
    h += '</table><p class="legenda-pontos">Pontuação da rodada: ' + jogadoresMesaRodada.map(item => `${item.nome} +${item.ganhoRodada}`).join(' · ') + '</p>';

    if (fim) {
        h += `<p>${G.personagens[0].total >= LIMITE ? 'Você atingiu 60 pontos ou mais. Fim de jogo!' : 'Todas as máquinas foram eliminadas.'}</p>`;
        const rankingFinal = [...PERSONAGENS].sort((a, b) => a.pontosRank - b.pontosRank || a.total - b.total);
        h += '<h3>🏆 Ranking Geral Final</h3><table><tr><th>#</th><th>Jogador</th><th>Pts Rank</th><th>Pts Mesa</th></tr>';
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

// ================= MODAL DO RANKING GERAL =================
function abrirRankingGeral() {
    if (!G) return;
    const ranking = [...PERSONAGENS].sort((a, b) => a.pontosRank - b.pontosRank || a.total - b.total);
    let h = '<h2>🏆 Ranking Geral</h2>';
    h += '<p class="legenda-pontos" style="margin-bottom:10px;">Pontuação por rodada: 1º (+1) · 2º (+2) · 3º (+3) · 4º (+4)</p>';
    h += '<table><tr><th>#</th><th>Jogador</th><th>Rank</th><th>Mesa</th><th>Situação</th></tr>';
    ranking.forEach((p, pos) => {
        const ativo = G.personagens.includes(p);
        const ehEu = jogadorHumano && p.id === jogadorHumano.id;
        const situacao = ehEu ? 'Você' : (ativo ? 'Na mesa' : (p.total >= LIMITE ? 'Eliminado' : 'Reserva'));
        h += `<tr class="${p.total >= LIMITE ? 'perdeu ' : ''}${ehEu ? 'eu' : ''}">
            <td>${pos + 1}º</td>
            <td>${p.nome}</td>
            <td><b>${p.pontosRank}</b></td>
            <td>${p.total}</td>
            <td>${situacao}</td>
        </tr>`;
    });
    h += '</table>';
    h += '<button type="button" class="btn-modo" id="btnFecharRanking">Fechar</button>';
    $('modalRankingBox').innerHTML = h;
    $('modalRanking').classList.remove('escondido');
    $('btnFecharRanking').focus();
    $('btnFecharRanking').onclick = () => $('modalRanking').classList.add('escondido');
}

$('btnRanking').onclick = abrirRankingGeral;
$('modalRanking').addEventListener('click', e => {
    if (e.target === $('modalRanking')) $('modalRanking').classList.add('escondido');
});

// ================= FLUXO DE TURNOS =================
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
    if (erro && !renuncia) { G.aviso = '⚠ ' + erro; render(true); return; }
    jogar(0, c);
}

const areaCentral = $('areaCentral');
// soltar a carta em QUALQUER lugar acima da mão já joga
const acimaDaMao = e => e.clientY < $('maoJogador').getBoundingClientRect().top;
document.addEventListener('dragover', e => {
    e.preventDefault();
    areaCentral.classList.toggle('drop-ativo', acimaDaMao(e));
});
document.addEventListener('drop', e => {
    e.preventDefault();
    areaCentral.classList.remove('drop-ativo');
    if (!acimaDaMao(e)) return;
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId || !G) return;
    const cartaObj = G.maos[0].find(c => c.id === cardId);
    if (cartaObj) tentarJogar(cartaObj);
});

// ================= IA =================
function escolherBot(i) {
    const mao = G.maos[i], v = mao.filter(c => !validar(i, c));
    const ord = (a, b) => a.valor - b.valor;
    if (G.mesa.length === 0) {
        if (G.vazas === 0) return v[0];
        const sem = v.filter(c => c.naipe !== COP), base = sem.length ? sem : v;
        const seg = base.filter(c => c.naipe !== ESP || !mao.some(x => x.naipe === ESP && x.valor >= 10));
        return [...(seg.length ? seg : base)].sort(ord)[0];
    }
    const seguem = v.filter(c => c.naipe === G.lider);
    if (seguem.length) {
        const maior = Math.max(...G.mesa.filter(j => j.carta.naipe === G.lider).map(j => j.carta.valor));
        const baixas = seguem.filter(c => c.valor < maior).sort(ord);
        if (baixas.length) return baixas[baixas.length - 1];
        const mesaPts = G.mesa.reduce((s, j) => s + pontosCarta(j.carta), 0);
        const s = [...seguem].sort(ord), semQ = s.filter(c => !ehDama(c)), pool = semQ.length ? semQ : s;
        return (G.mesa.length === 3 && mesaPts === 0) ? pool[pool.length - 1] : pool[0];
    }
    const q = v.find(ehDama); if (q) return q;
    const cops = v.filter(c => c.naipe === COP).sort(ord); if (cops.length) return cops[cops.length - 1];
    return [...v].sort(ord)[v.length - 1];
}

function criarVersoCarta() {
    const d = document.createElement('div');
    d.className = 'carta verso';
    d.setAttribute('aria-label', 'Carta virada para baixo');
    return d;
}

// ================= ESCALA / RESPONSIVIDADE =================
// O jogo mede a tela e procura o MAIOR tamanho (--u) em que tudo cabe:
// personagens nas bordas, cartas no meio e a mão embaixo, sem um invadir o outro.
const ESC = { u: 12, cw: 84 };
const U_MAX = 18, U_MIN = 3;

function aplicarEscala(u) {
    const W = document.documentElement.clientWidth;
    // 13 cartas precisam caber na largura da tela, mostrando pelo menos ~37% de cada uma
    const cw = Math.min(u * 7, (W - 16) / 5.6);
    ESC.u = u; ESC.cw = cw;
    const s = document.documentElement.style;
    s.setProperty('--u', u.toFixed(2) + 'px');
    s.setProperty('--cw', cw.toFixed(2) + 'px');
    s.setProperty('--tw', (cw * 0.762).toFixed(2) + 'px');
}

function cabeNaMesa() {
    const mesa = $('mesa'), cs = getComputedStyle(mesa), r = mesa.getBoundingClientRect(), t = 1.5;
    const L = r.left + parseFloat(cs.paddingLeft), R = r.right - parseFloat(cs.paddingRight);
    const T = r.top + parseFloat(cs.paddingTop), B = r.bottom - parseFloat(cs.paddingBottom);
    const ids = ['j0', 'j1', 'j2', 'j3', 'areaCentral'];
    const caixas = ids.map(id => $(id).getBoundingClientRect());
    // 1) nada pode passar da borda da mesa
    for (const b of caixas) if (b.left < L - t || b.right > R + t || b.top < T - t || b.bottom > B + t) return false;
    // 2) nenhum personagem pode tocar a área das cartas nem outro personagem
    for (let i = 0; i < caixas.length; i++) for (let j = i + 1; j < caixas.length; j++) {
        const a = caixas[i], b = caixas[j];
        if (a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5) return false;
    }
    return true;
}

function ajustarEscala() {
    if ($('jogo').classList.contains('escondido')) return;
    const W = document.documentElement.clientWidth;
    let hi = Math.min(U_MAX, W / 22), lo = U_MIN;
    aplicarEscala(hi);
    if (cabeNaMesa()) return;                 // cabe no tamanho máximo
    for (let i = 0; i < 12; i++) {            // busca binária pelo maior que cabe
        const mid = (lo + hi) / 2;
        aplicarEscala(mid);
        if (cabeNaMesa()) lo = mid; else hi = mid;
    }
    aplicarEscala(lo);
}

let rafEscala = 0;
function reajustar() {
    cancelAnimationFrame(rafEscala);
    rafEscala = requestAnimationFrame(() => { ajustarEscala(); if (G) render(); });
}
addEventListener('resize', reajustar);
addEventListener('orientationchange', () => setTimeout(reajustar, 300));
if (window.visualViewport) visualViewport.addEventListener('resize', reajustar);

// ================= TELA =================
function render(piscar) {
    const minha = G.turno === 0 && !G.ocupado && G.mesa.length < 4;
    const div = $('maoJogador'); div.innerHTML = '';
    G.maos[0].sort((a, b) => ORDEM_MAO.indexOf(a.naipe) - ORDEM_MAO.indexOf(b.naipe) || a.valor - b.valor);

    const n = G.maos[0].length, w = ESC.cw;
    const disp = Math.max(0, div.clientWidth - 16);          // largura útil da mão
    const ov = n > 1 ? Math.min(w * 0.7, Math.max(w * 0.25, (n * w - disp) / (n - 1))) : 0;
    div.style.setProperty('--ov', ov + 'px');

    G.maos[0].forEach(c => {
        const indice = G.ordemDistribuicao ? G.ordemDistribuicao.findIndex(x => x.jogador === 0 && x.carta.id === c.id) : -1;
        const revelada = !G.distribuindo || indice < G.cartasReveladas;
        const el = revelada ? criarElementoCarta(c) : criarVersoCarta();

        if (revelada && !G.distribuindo) {
            el.tabIndex = 0;
            el.setAttribute('role', 'button');
            if (cartaSelecionadaId === c.id) el.classList.add('selecionada');

            el.onclick = () => {
                if (cartaSelecionadaId === c.id) {
                    tentarJogar(c);
                } else {
                    cartaSelecionadaId = c.id;
                    document.querySelectorAll('#maoJogador .carta').forEach(cardEl => cardEl.classList.remove('selecionada'));
                    el.classList.add('selecionada');
                }
            };
            el.ondblclick = () => tentarJogar(c);
            el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tentarJogar(c); } };

            el.draggable = true;
            el.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', c.id);
                el.classList.add('arrastando');
            });
            el.addEventListener('dragend', () => {
                el.classList.remove('arrastando');
                areaCentral.classList.remove('drop-ativo');
            });

            let touchStartY = 0;
            el.addEventListener('touchstart', e => {
                touchStartY = e.touches[0].clientY;
            }, { passive: true });
            el.addEventListener('touchend', e => {
                const deltaY = touchStartY - e.changedTouches[0].clientY;
                if (deltaY > 45) {
                    tentarJogar(c);
                }
            }, { passive: true });
        }
        div.appendChild(el);
    });

    if (G.rodadaEncerrada) {
        div.innerHTML = '';
        G.pegas[0].forEach(c => div.appendChild(criarElementoCarta(c, 'carta-ponto-final')));
        div.classList.add('mao-pontos-finais');
        const np = G.pegas[0].length, wp = ESC.cw * 0.762 * 0.75;
        const ovp = np > 1 ? Math.max(-3, (np * wp - disp) / (np - 1)) : 0;   // -3 = 3px de respiro
        div.style.setProperty('--ov', ovp + 'px');
    } else div.classList.remove('mao-pontos-finais');

    for (let i = 0; i < 4; i++) {
        const box = $(`j${i}`);
        box.classList.toggle('turno-ativo', i === G.turno && !G.ocupado);
        const ranking = [...PERSONAGENS].sort((a, b) => a.pontosRank - b.pontosRank || a.total - b.total).findIndex(p => p.id === G.personagens[i].id) + 1;
        box.innerHTML = `<img class="avatar-jogador" src="${G.personagens[i].foto}" alt="${G.nomes[i]}" onerror="this.src='fotos/${G.personagens[i].id}.png'; this.onerror=null">
            <div class="info-jogador">
                <span class="nome">${G.nomes[i]} <small class="ranking">${ranking}º</small></span>
                <span class="tot">Total: ${G.totais[i]}</span>
                <span class="rod">Rodada: ${G.pts[i]}</span>
            </div>`;
        if (G.rodadaEncerrada && i !== 0) {
            const faixa = document.createElement('div'); faixa.className = 'pontos-mao-final';
            G.pegas[i].forEach(c => faixa.appendChild(criarElementoCarta(c, 'carta-ponto-final')));
            box.appendChild(faixa);
        }
    }

    // Status
    const st = $('status');
    st.classList.toggle('aviso', G.aviso.startsWith('⚠'));
    if (G.distribuindo) st.textContent = 'Distribuindo as cartas…';
    else if (G.aviso) st.textContent = G.aviso;
    else if (G.vazas === 0 && G.mesa.length === 0) st.textContent = `Rodada ${G.rodada}: ${G.nomes[G.turno]} tem o 2♣ e começa.`;
    else if (minha) st.textContent = G.mesa.length ? `Sua vez — siga ${NAIPES[G.lider].nome} ${NAIPES[G.lider].s} (1 clique sobe · 2 cliques/arraste joga).` : 'Sua vez — abra a mesa (1 clique sobe · 2 cliques/arraste joga).';
    else st.textContent = `Vez de ${G.nomes[G.turno]}…`;
}

function mostrarQ() {
    const e = $('efeitoQ');
    e.classList.remove('escondido');
    clearTimeout(mostrarQ.t);
    mostrarQ.t = setTimeout(() => e.classList.add('escondido'), 2500);
}

// ================= RÁDIO =================
const R = { a: new Audio(), est: [], i: -1, on: false, tent: 0, t: null, ctx: null, synth: null };
const audioDama = new Audio('fotos/dama-espadas.ogg');
function tocarAudioDama() {
    audioDama.pause();
    audioDama.currentTime = 0;
    audioDama.volume = Math.min(1, Math.max(0.2, R.a ? R.a.volume * 2 : 1));
    audioDama.play().catch(() => {});
}
R.a.volume = 0.6;
const setR = t => $('radioNome').textContent = t;
function marcarBotao() {
    const b = $('btnRadio'); b.classList.toggle('on', R.on);
    b.innerHTML = `<i class="fas fa-${R.on ? 'stop' : 'play'}"></i>`;
    b.setAttribute('aria-label', R.on ? 'Parar rádio' : 'Tocar rádio');
}
const HOSTS = ['de1', 'nl1', 'at1'];
const API = '/json/stations/search?countrycode=BR&order=clickcount&reverse=true';   // sem hidebroken: traz rádios online e off
const ESTADOS = { RJ: 'Rio de Janeiro', SP: 'São Paulo' };
const REGEX_UF = { RJ: /^(rj|rio de janeiro)$/i, SP: /^(sp|s[aã]o paulo)$/i };
const GENEROS = { pagode: 'Pagode', samba: 'Samba', sertanejo: 'Sertanejo', funk: 'Funk', mpb: 'MPB', forro: 'Forró', axe: 'Axé', pop: 'Pop', rock: 'Rock', gospel: 'Gospel', 'hip hop': 'Hip hop', electronic: 'Eletrônica', jazz: 'Jazz', classical: 'Clássica', news: 'Notícias' };
// ➕ SUAS RÁDIOS: cole aqui links diretos de stream (sem login). uf: 'RJ', 'SP' ou '*'; gen: gênero (padrão 'pagode')
// Ex.: { nome: 'Minha rádio', url: 'https://servidor.com/stream', uf: 'RJ', gen: 'pagode' }
const RADIOS_EXTRAS = [
];
// ⭐ Rádio que sempre abre primeiro (em qualquer estado, nos gêneros pagode/samba)
const PREFERIDA = /gera[cç][aã]o samba/i;
function fixarPref(lista, gen) {
    if (gen !== 'pagode' && gen !== 'samba') return lista;
    let pref = lista.find(e => PREFERIDA.test(e.nome));
    if (!pref) { try { pref = JSON.parse(localStorage.getItem('radioPref') || 'null'); } catch (e) {} if (!pref) return lista; }
    else try { localStorage.setItem('radioPref', JSON.stringify(pref)); } catch (e) {}
    return [pref, ...lista.filter(e => e.url !== pref.url)];
}
let estadoRadio = 'RJ', generoRadio = 'pagode';   // abre em RJ + Pagode
const buscaRB = qs => Promise.any(HOSTS.map(async h => {
    const r = await fetch(`https://${h}.api.radio-browser.info${API}&${qs}`);
    if (!r.ok) throw 0; return r.json();
}));
let bloq = new Set(); try { bloq = new Set(JSON.parse(localStorage.getItem('radioBloq') || '[]')); } catch (e) {}
function bloquear(url) { if (!url) return; bloq.add(url); try { localStorage.setItem('radioBloq', JSON.stringify([...bloq].slice(-200))); } catch (e) {} }
const pedeLogin = u => /@|token|login|auth|passw|[?&](user|key|pass)/i.test(u);
const protoOk = u => u.startsWith('https://') || (location.protocol !== 'https:' && u.startsWith('http://'));
// prioridade: 0 = 98 FM (RJ) · 1 = estado escolhido · 2 = resto do Brasil; dentro: online antes de off
function pontuar(s, uf) {
    if (PREFERIDA.test(s.name)) return -2;
    if (uf === 'RJ' && /\b98\b/.test(s.name) && REGEX_UF.RJ.test((s.state || '').trim())) return 0;
    return REGEX_UF[uf].test((s.state || '').trim()) ? 1 : 2;
}
R.cache = {}; R.prom = {};
function preencherLista() {
    const s = $('selRadio'); if (!s) return;
    s.innerHTML = R.est.length ? '<option value="" disabled selected>Escolher rádio…</option>' + R.est.map((e, i) => `<option value="${i}">${e.ok ? '' : '⚪ '}${e.nome.replace(/</g, '&lt;')}</option>`).join('')
        : '<option value="" disabled selected>Carregando rádios…</option>';
    if (R.on && R.i >= 0) s.value = R.i;
}
function acharEstacoes(gen = generoRadio, uf = estadoRadio) {
    const k = gen + '|' + uf, atual = () => gen === generoRadio && uf === estadoRadio;
    if (R.cache[k] && R.cache[k].length) { R.est = R.cache[k]; preencherLista(); return Promise.resolve(); }
    try { const c = JSON.parse(localStorage.getItem('estRadio_' + k) || 'null'); if (c && c.length) { R.cache[k] = fixarPref(c, gen); if (atual()) { R.est = R.cache[k]; preencherLista(); } } } catch (e) {}
    if (R.prom[k]) return R.prom[k];
    const tag = 'tag=' + encodeURIComponent(gen), st = 'state=' + encodeURIComponent(ESTADOS[uf]);
    R.prom[k] = (async () => {
        const rs = await Promise.allSettled([
            buscaRB(`${st}&${tag}&limit=60`),
            buscaRB(`${tag}&limit=80`),
            buscaRB(`${st}&name=${encodeURIComponent(gen)}&limit=40`),
            buscaRB(`name=${encodeURIComponent(gen)}&limit=40`),
            ...(uf === 'RJ' && gen === 'pagode' ? [buscaRB(`${st}&name=98&limit=15`)] : []),
            ...(gen === 'pagode' || gen === 'samba' ? [buscaRB('name=' + encodeURIComponent('Geração Samba') + '&limit=20'), buscaRB('name=' + encodeURIComponent('Geracao Samba') + '&limit=20')] : [])
        ]);
        const vistos = new Set(), lista = [];
        rs.forEach(x => (x.value || []).forEach(s => {
            const u = s.url_resolved || s.url;
            if (!u || !protoOk(u) || s.hls === 1 || pedeLogin(u) || vistos.has(u)) return;
            vistos.add(u);
            lista.push({ nome: s.name.trim(), url: u, p: pontuar(s, uf), ok: s.lastcheckok === 1, c: s.clickcount || 0 });
        }));
        RADIOS_EXTRAS.filter(x => (x.uf === uf || x.uf === '*') && (x.gen || 'pagode') === gen).forEach(x => { if (!vistos.has(x.url)) { vistos.add(x.url); lista.push({ nome: x.nome, url: x.url, p: -1, ok: true, c: 0 }); } });
        lista.sort((x, y) => x.p - y.p || y.ok - x.ok || y.c - x.c);
        if (lista.length) { lista.splice(0, lista.length, ...fixarPref(lista, gen)); R.cache[k] = lista; if (atual()) { R.est = lista; preencherLista(); } try { localStorage.setItem('estRadio_' + k, JSON.stringify(lista.slice(0, 80))); } catch (e) {} }
    })();
    return R.prom[k];
}
$('selGenero').innerHTML = Object.entries(GENEROS).map(([k, v]) => `<option value="${k}"${k === generoRadio ? ' selected' : ''}>${v}</option>`).join('');
acharEstacoes();   // já busca ao abrir o jogo, para o play ser imediato
async function ligarRadio() {
    R.on = true; R.tent = 0; R.i = -1; marcarBotao(); setR('Procurando rádio…');
    if (!R.est.length) await acharEstacoes();
    if (R.est[0] && PREFERIDA.test(R.est[0].nome)) bloq.delete(R.est[0].url);
    if (R.on) tentarEstacao();
}
function tentarEstacao() {
    clearTimeout(R.t); pararSynth();
    if (!R.est.length || R.tent >= Math.min(R.est.length, 8)) return musicaInterna();
    let g = 0; do { R.i = (R.i + 1) % R.est.length; g++; } while (bloq.has(R.est[R.i].url) && g < R.est.length);
    R.tent++;
    const e = R.est[R.i];
    R.a.src = e.url; setR('Conectando: ' + e.nome);
    R.t = setTimeout(tentarEstacao, 4000);
    R.a.play().catch(err => {
        if (err.name === 'NotAllowedError') { clearTimeout(R.t); desligarRadio(); setR('Clique em ▶ novamente'); }
    });
}
R.a.addEventListener('playing', () => { clearTimeout(R.t); R.tent = 0; setR('♪ ' + R.est[R.i].nome); if ($('selRadio')) $('selRadio').value = R.i; });
R.a.addEventListener('error', () => { if (R.on && !R.synth && R.a.src) { clearTimeout(R.t); bloquear(R.est[R.i] && R.est[R.i].url); tentarEstacao(); } });
function desligarRadio() {
    R.on = false; clearTimeout(R.t); R.a.pause(); R.a.removeAttribute('src'); R.a.load(); pararSynth();
    marcarBotao(); setR('Rádio desligada');
}
$('btnRadio').onclick = () => R.on ? desligarRadio() : ligarRadio();
$('btnProx').onclick = () => { if (!R.on) return ligarRadio(); if (R.a.paused && R.est[R.i]) bloquear(R.est[R.i].url); R.tent = 0; tentarEstacao(); };
const recarregarRadios = async () => {
    estadoRadio = $('selEstado').value; generoRadio = $('selGenero').value;
    R.est = []; R.i = -1; R.tent = 0; preencherLista();
    if (R.on) { R.a.pause(); setR('Procurando rádio…'); }
    await acharEstacoes();
    if (R.on) tentarEstacao();
};
$('selEstado').onchange = recarregarRadios;
$('selGenero').onchange = recarregarRadios;
let volumePercentual = 60;
function aplicarVolume() {
    R.a.volume = volumePercentual / 100;
    if (R.synth) R.synth.g.gain.value = R.a.volume * 0.5;
    $('volValor').textContent = String(volumePercentual);
    $('volValor').setAttribute('aria-label', `Volume ${volumePercentual}%`);
}
function alterarVolume(delta) {
    volumePercentual = Math.max(0, Math.min(100, volumePercentual + delta));
    aplicarVolume();
}
function configurarBotaoVolume(id, delta) {
    const botao = $(id);
    let inicio = null, repetidor = null, acionouPressaoLonga = false;
    const limpar = () => { clearTimeout(inicio); clearInterval(repetidor); inicio = repetidor = null; };
    botao.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault(); acionouPressaoLonga = false; limpar();
        inicio = setTimeout(() => {
            acionouPressaoLonga = true;
            alterarVolume(delta * 10);
            repetidor = setInterval(() => alterarVolume(delta * 10), 250);
        }, 2000);
    });
    const soltar = () => {
        if (inicio === null && repetidor === null) return;
        const foiLongo = acionouPressaoLonga; limpar();
        if (!foiLongo) alterarVolume(delta);
    };
    botao.addEventListener('pointerup', soltar);
    botao.addEventListener('pointerleave', soltar);
    botao.addEventListener('pointercancel', soltar);
    botao.addEventListener('click', e => { if (e.detail === 0) alterarVolume(delta); });
}
configurarBotaoVolume('volMenos', -1);
configurarBotaoVolume('volMais', 1);
aplicarVolume();

function musicaInterna() {
    R.a.pause(); R.a.removeAttribute('src');
    const ctx = R.ctx || (R.ctx = new (window.AudioContext || window.webkitAudioContext)()); ctx.resume();
    const g = ctx.createGain(); g.gain.value = R.a.volume * 0.5; g.connect(ctx.destination);
    const dur = 60 / 96 / 4; let passo = 0, prox = ctx.currentTime + 0.1;
    const nota = (f, t, d, tipo, v) => { const o = ctx.createOscillator(), e = ctx.createGain(); o.type = tipo; o.frequency.setValueAtTime(f, t); e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(e); e.connect(g); o.start(t); o.stop(t + d); return o; };
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate); const dd = buf.getChannelData(0); for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
    const shaker = (t, v) => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), e = ctx.createGain(); s.buffer = buf; f.type = 'highpass'; f.frequency.value = 6000; e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.connect(f); f.connect(e); e.connect(g); s.start(t); };
    const baixo = [110, 0, 0, 110, 0, 82.4, 0, 0, 146.8, 0, 0, 146.8, 0, 110, 0, 82.4];
    const acordes = [[220, 261.6, 329.6], [293.7, 349.2, 440], [329.6, 415.3, 493.9], [220, 261.6, 329.6]];
    const timer = setInterval(() => {
        while (prox < ctx.currentTime + 0.2) {
            const p = passo % 16, ac = acordes[Math.floor(passo / 16) % 4];
            if (p % 4 === 0) { const o = nota(130, prox, 0.2, 'sine', 0.9); o.frequency.exponentialRampToValueAtTime(45, prox + 0.15); }
            shaker(prox, p % 2 ? 0.25 : 0.12);
            if (baixo[p]) nota(baixo[p] * (Math.floor(passo / 16) % 4 === 1 ? 1.33 : 1), prox, 0.25, 'triangle', 0.5);
            if ([2, 5, 8, 11, 14].includes(p)) ac.forEach(f => nota(f, prox, 0.18, 'triangle', 0.12));
            prox += dur; passo++;
        }
    }, 25);
    R.synth = { g, timer };
    setR('♪ Batucada interna (rádio indisponível)');
}
function pararSynth() { if (R.synth) { clearInterval(R.synth.timer); R.synth.g.disconnect(); R.synth = null; } }

const camuflagem = document.createElement('div');
camuflagem.id = 'camuflagem';
document.body.appendChild(camuflagem);
let camuflado = false;
document.addEventListener('contextmenu', e => {
    if (e.ctrlKey) { e.preventDefault(); camuflado = !camuflado; camuflagem.classList.toggle('ativa', camuflado); }
});
// escolher rádio direto na lista
$('selRadio').onchange = e => {
    const i = +e.target.value; if (!R.est[i]) return;
    bloq.delete(R.est[i].url); R.on = true; marcarBotao();
    R.i = i - 1; R.tent = 0; tentarEstacao();
};
preencherLista();
