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
const JANELA_DUPLO_CLIQUE = 600;
let ultimoCliqueCarta = { id: null, tempo: 0 };

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
    d.className = `carta ${NAIPES[c.naipe].cor} ${c.valor >= 9 && c.valor <= 11 ? 'figura' : ''} ${extra}`;
    const pts = pontosCarta(c);
    const coroa = { 9: '♞', 10: '♛', 11: '♚' }[c.valor];
    const badge = coroa ? `<div class="coroa">${coroa}</div>` : '';
    d.innerHTML = `<div class="topo"><span class="valor">${f}</span><span class="np">${s}</span></div>
        <div class="centro">${s}</div>${badge}
        <div class="base"><span class="valor">${f}</span><span class="np">${s}</span></div>`;
    d.setAttribute('aria-label', nomeCarta(c) + (pts ? `, vale ${pts} ponto${pts > 1 ? 's' : ''}` : ''));
    return d;
}

// ================= EFEITOS SONOROS (sintetizados, sem arquivos) =================
const SFX = (() => {
    let ctx = null, ligado = true, ruido = null;
    try { ligado = localStorage.getItem('miq_sfx') !== '0'; } catch (e) {}
    const audio = () => {
        if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return ctx;
    };
    const escala = () => 0.35 + (typeof volumePercentual === 'number' ? volumePercentual / 100 : 0.6) * 0.9;
    function estalo(freq, q, dur, vol, tipo, atraso) {
        if (!ligado) return;
        const c = audio(); if (!c) return;
        if (!ruido) {
            ruido = c.createBuffer(1, Math.floor(c.sampleRate * 0.3), c.sampleRate);
            const d = ruido.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        const t = c.currentTime + (atraso || 0);
        const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
        src.buffer = ruido; src.playbackRate.value = 0.8 + Math.random() * 0.5;
        f.type = tipo || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
        g.gain.setValueAtTime(vol * escala(), t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(f); f.connect(g); g.connect(c.destination);
        src.start(t, Math.random() * 0.1); src.stop(t + dur + 0.02);
    }
    return {
        get ligado() { return ligado; },
        alternar() { ligado = !ligado; try { localStorage.setItem('miq_sfx', ligado ? '1' : '0'); } catch (e) {} if (ligado) this.dar(); },
        dar() { estalo(3600 + Math.random() * 1400, 1.1, 0.05, 0.22, 'bandpass'); },
        folhear() { estalo(2600 + Math.random() * 1800, 0.9, 0.04, 0.2, 'bandpass'); },
        cortar() { estalo(900, 0.6, 0.12, 0.45, 'lowpass'); estalo(2200, 0.8, 0.06, 0.25, 'bandpass', 0.02); },
        jogar() { estalo(1500, 0.7, 0.08, 0.45, 'bandpass'); estalo(240, 0.5, 0.08, 0.55, 'lowpass'); },
        varrer() { estalo(1800, 0.4, 0.28, 0.28, 'bandpass'); estalo(1200, 0.4, 0.2, 0.2, 'bandpass', 0.07); }
    };
})();

// ================= NÍVEL DE DIFICULDADE =================
// Fixo: as máquinas sempre jogam no nível Mestre.
const nivelIA = 'mestre';
const NOMES_NIVEL = { normal: 'Normal', dificil: 'Difícil', mestre: 'Mestre' };

// ================= ESTATÍSTICAS DO JOGADOR (salvas no aparelho) =================
const ESTAT = { partidas: 0, vitorias: 0, zeros: 0, luas: 0 };
try { Object.assign(ESTAT, JSON.parse(localStorage.getItem('miq_estat') || '{}')); } catch (e) {}
const salvarEstat = () => { try { localStorage.setItem('miq_estat', JSON.stringify(ESTAT)); } catch (e) {} };

// ================= ÁUDIO DA INTRO =================
// intro.mp3 está ligado SOMENTE ao botão Iniciar: toca uma única vez a cada
// clique nele. Não há autoplay, loop, repetição nem checagem periódica.
const audioIntro = new Audio('intro.mp3');
audioIntro.preload = 'auto';
audioIntro.loop = false;

function tocarIntroUmaVez() {
    try {
        audioIntro.currentTime = 0;
        const p = audioIntro.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
}

function pararIntro() {
    audioIntro.pause();
    try { audioIntro.currentTime = 0; } catch (e) {}
}

// ================= TELA INICIAL MIQUILINO =================
$('btnIniciarMiquilino').addEventListener('click', async () => {
    tocarIntroUmaVez();
    $('telaInicial').classList.add('escondido');
    $('telaLogin').classList.remove('escondido');
    // O clique em Iniciar também solicita tela cheia.
    try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
    } catch (err) {
        console.warn('Não foi possível ativar tela cheia:', err);
    }
});

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
$('btnComecar').onclick = () => {
    iniciarPartida();
};
montarSelecao();

function iniciarPartida() {
    if (!jogadorHumano) return;
    ultimoCliqueCarta = { id: null, tempo: 0 };
    cartaSelecionadaId = null;
    PERSONAGENS.forEach(p => { p.total = 0; p.pontosRank = 0; });
    const disponiveis = embaralhar(PERSONAGENS.filter(p => p.id !== jogadorHumano.id).slice());
    const bots = disponiveis.splice(0, 3);
    filaMaquinas = disponiveis;
    maquinasEliminadas = [];
    const participantes = [jogadorHumano, ...bots];
    nomeJogador = jogadorHumano.nome;
    $('telaLogin').classList.add('escondido');
    $('jogo').classList.remove('escondido');
    pararIntro();
    ajustarEscala();
    G = {
        nomes: participantes.map(p => p.nome),
        personagens: participantes,
        totais: participantes.map(p => p.total),
        rodada: 0,
        fila: filaMaquinas,
        rankingGeral: PERSONAGENS,
        luaConquistada: false,
        renunciaConquistada: false,
        nivel: nivelIA,
        carteador: Math.floor(Math.random() * 4)
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
    if (G.tk) G.tk.pular = true;
    if (G.rodada > 1) G.carteador = (G.carteador + 1) % 4;
    G.jogadas = new Uint8Array(52);
    G.vazios = [0, 1, 2, 3].map(() => [false, false, false, false]);
    G.recebidas = [0, 0, 0, 0]; G.distMsg = ''; G.virarMao = false;
    G.distribuindo = true; G.rodadaEncerrada = false; G.cartasReveladas = 0;
    // As cartas são dadas uma a uma, no sentido horário, a partir de quem está à esquerda do carteador.
    G.ordemDistribuicao = [];
    for (let rodada = 0; rodada < 13; rodada++) for (let k = 0; k < 4; k++) {
        const jogador = (G.carteador + 1 + k) % 4;
        G.ordemDistribuicao.push({ jogador, carta: G.maos[jogador][rodada] });
    }
    for (let i = 0; i < 4; i++) $(`carta-${i}`).innerHTML = '';
    $('modal').classList.add('escondido');
    $('modalRanking').classList.add('escondido');
    render();
    ajustarEscala();   // mede com os painéis já preenchidos (nome, pontos, foto)
    render();
    G.tk = { pular: false, acordar: null };
    sequenciaDistribuicao(G.tk);
}

// ================= EMBARALHAR · CORTAR · DAR AS CARTAS =================
// Sequência exibida no início de cada rodada:
//   1) o carteador embaralha (3 vezes, intercalando as duas metades)
//   2) o jogador à direita do carteador corta o baralho
//   3) as cartas são dadas uma a uma, no sentido horário
// O botão "Pular" (ou a tecla Esc) resolve tudo na hora.
const reduzMovimento = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const viva = tk => !!G && G.tk === tk;
const nomeNaMesa = i => i === 0 ? 'Você' : G.nomes[i];
const CARTAS_NO_MONTE = 16;
let baralhoVisual = [];

function esperar(ms, tk) {
    return new Promise(res => {
        if (tk.pular) return res();
        const t = setTimeout(() => { tk.acordar = null; res(); }, ms);
        tk.acordar = () => { clearTimeout(t); tk.acordar = null; res(); };
    });
}

function centroDe(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}
const larguraCartaMesa = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tw')) || 64;

function pose(el, x, y, rot, dur, atraso) {
    el.style.transition = dur ? `transform ${dur}ms cubic-bezier(.3,.7,.3,1) ${atraso || 0}ms` : 'none';
    el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
}

function legendar(msg) {
    if (!G) return;
    G.distMsg = msg;
    $('legendaTexto').textContent = msg;
    render();
}

function prepararPalco() {
    const tw = larguraCartaMesa();
    const c = centroDe($('areaCentral'));
    const deck = $('baralhoMesa');
    deck.innerHTML = '';
    deck.style.left = c.x + 'px';
    deck.style.top = c.y + 'px';
    const leg = $('legendaBaralho');
    leg.style.left = c.x + 'px';
    leg.style.top = (c.y + tw * 0.72 + 14) + 'px';
    $('palcoBaralho').querySelectorAll('.voando').forEach(e => e.remove());
    $('palcoBaralho').classList.remove('escondido');
}

function ocultarPalco() {
    const palco = $('palcoBaralho');
    if (!palco) return;
    palco.classList.add('escondido');
    $('baralhoMesa').innerHTML = '';
    palco.querySelectorAll('.voando').forEach(e => e.remove());
}

async function animEmbaralhar(tk) {
    if (tk.pular) return;
    const deck = $('baralhoMesa'), tw = larguraCartaMesa();
    const cartas = [];
    for (let k = 0; k < CARTAS_NO_MONTE; k++) {
        const el = criarVersoCarta();
        el.style.zIndex = k;
        pose(el, 0, -k * 0.7, 0, 0, 0);
        deck.appendChild(el);
        cartas.push(el);
    }
    legendar(`${nomeNaMesa(G.carteador)} embaralha as cartas…`);
    await esperar(300, tk);
    let ordem = cartas.slice();
    const meio = CARTAS_NO_MONTE / 2;
    const voltas = G.rodada === 1 ? 3 : 2;   // 1ª rodada: show completo; depois, mais ágil
    for (let rep = 0; rep < voltas && !tk.pular && viva(tk); rep++) {
        const esq = ordem.slice(0, meio), dir = ordem.slice(meio);
        // separa o baralho em duas metades
        esq.forEach((el, k) => pose(el, -tw * 0.62, -k * 0.7, -7, 200, 0));
        dir.forEach((el, k) => pose(el, tw * 0.62, -k * 0.7, 7, 200, 0));
        await esperar(240, tk);
        if (tk.pular || !viva(tk)) break;
        // intercala as cartas (riffle)
        const novo = [];
        for (let k = 0; k < meio; k++) { novo.push(esq[k]); novo.push(dir[k]); }
        novo.forEach((el, k) => {
            el.style.zIndex = k;
            pose(el, 0, -k * 0.7, 0, 140, k * 20);
            setTimeout(() => { if (!tk.pular) SFX.folhear(); }, k * 20);
        });
        await esperar(CARTAS_NO_MONTE * 20 + 180, tk);
        ordem = novo;
    }
    baralhoVisual = ordem;
}

async function animCortar(tk) {
    if (tk.pular || !viva(tk)) return;
    const tw = larguraCartaMesa(), meio = CARTAS_NO_MONTE / 2;
    const base = baralhoVisual.slice(0, meio), topo = baralhoVisual.slice(meio);
    legendar(`${nomeNaMesa((G.carteador + 3) % 4)} corta o baralho…`);
    await esperar(200, tk);
    // o monte de cima é levantado e posto de lado
    topo.forEach((el, k) => pose(el, -tw * 0.78, -k * 0.7 - 16, -5, 320, 0));
    SFX.cortar();
    await esperar(400, tk);
    if (tk.pular || !viva(tk)) return;
    // a metade de baixo é colocada por cima; o monte levantado passa para baixo
    topo.forEach((el, k) => { el.style.zIndex = k; });
    base.forEach((el, k) => { el.style.zIndex = meio + k; });
    topo.forEach((el, k) => pose(el, 0, -k * 0.7, 0, 300, 0));
    base.forEach((el, k) => pose(el, 0, -(meio + k) * 0.7, 0, 300, 0));
    SFX.cortar();
    await esperar(350, tk);
    baralhoVisual = topo.concat(base);
}

function voarCarta(tk, jogador, de) {
    const tw = larguraCartaMesa(), w = tw, h = tw * 1.4286;
    const palco = $('palcoBaralho');
    let para;
    if (jogador === 0) {
        const r = $('maoJogador').getBoundingClientRect();
        para = { x: r.left + r.width / 2 + (Math.random() * 30 - 15), y: r.bottom - r.height * 0.3 };
    } else {
        para = centroDe($(`j${jogador}`));
    }
    const el = criarVersoCarta();
    el.classList.add('voando');
    el.style.left = (de.x - w / 2) + 'px';
    el.style.top = (de.y - h / 2) + 'px';
    palco.appendChild(el);
    const dx = para.x - de.x, dy = para.y - de.y;
    const esc = jogador === 0 ? 1.25 : 0.6;
    const rot = (jogador === 1 ? -50 : jogador === 3 ? 50 : jogador === 2 ? 20 : 0) + (Math.random() * 24 - 12);
    const anim = el.animate([
        { transform: 'translate(0, 0) rotate(0deg) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${esc})` }
    ], { duration: 280, easing: 'cubic-bezier(.25,.8,.3,1)', fill: 'forwards' });
    anim.finished.then(() => {
        el.remove();
        if (!viva(tk) || tk.pular) return;
        G.cartasReveladas++;
        G.recebidas[jogador]++;
        render();
        const box = $(`j${jogador}`);
        box.classList.add('recebeu');
        setTimeout(() => box.classList.remove('recebeu'), 140);
        SFX.dar();
    }).catch(() => el.remove());
}

async function animDistribuir(tk) {
    if (tk.pular || !viva(tk)) return;
    legendar(`${nomeNaMesa(G.carteador)} distribui as cartas…`);
    const de = centroDe($('baralhoMesa'));
    const monte = baralhoVisual.slice().sort((a, b) => (+a.style.zIndex) - (+b.style.zIndex));
    const ordem = G.ordemDistribuicao;
    for (let k = 0; k < ordem.length; k++) {
        if (tk.pular || !viva(tk)) return;
        voarCarta(tk, ordem[k].jogador, de);
        // o monte visual vai diminuindo conforme as cartas saem
        if (k % 3 === 2 && monte.length) monte.pop().remove();
        await esperar(58, tk);
    }
    await esperar(320, tk);
}

function finalizarDistribuicao(tk) {
    if (!viva(tk)) return;
    const rapido = tk.pular;
    ocultarPalco();
    G.distribuindo = false;
    G.cartasReveladas = 52;
    G.recebidas = [13, 13, 13, 13];
    G.distMsg = '';
    // as cartas da sua mão são viradas uma a uma
    G.virarMao = !reduzMovimento();
    render();
    G.virarMao = false;
    G.timer = setTimeout(() => { G.aviso = ''; agendar(); }, reduzMovimento() ? 200 : (rapido ? 700 : 900));
}

async function sequenciaDistribuicao(tk) {
    if (reduzMovimento()) tk.pular = true;
    if (!tk.pular) {
        prepararPalco();
        $('legendaTexto').textContent = '';
    }
    try {
        await animEmbaralhar(tk);
        if (viva(tk) && !tk.pular) await animCortar(tk);
        if (viva(tk) && !tk.pular) await animDistribuir(tk);
    } catch (e) {
        console.warn('Animação interrompida:', e);
    }
    finalizarDistribuicao(tk);
}

function pularDistribuicao() {
    if (G && G.tk && G.distribuindo) {
        G.tk.pular = true;
        if (G.tk.acordar) G.tk.acordar();
    }
}
$('btnPular').onclick = pularDistribuicao;
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && G && G.distribuindo) pularDistribuicao();
});

// ================= CARTA VOA ATÉ A MESA · VAZA É RECOLHIDA =================
function animarEntrada(el, i, origem) {
    if (reduzMovimento() || !el.animate) return;
    const fim = el.getBoundingClientRect();
    let ini;
    if (origem && origem.width) {
        ini = { x: origem.left + origem.width / 2, y: origem.top + origem.height / 2, esc: origem.width / fim.width, rot: 0 };
    } else {
        const c = centroDe($(`j${i}`));
        ini = { x: c.x, y: c.y, esc: 0.55, rot: i === 1 ? -25 : i === 3 ? 25 : 10 };
    }
    const dx = ini.x - (fim.left + fim.width / 2), dy = ini.y - (fim.top + fim.height / 2);
    el.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${ini.esc}) rotate(${ini.rot}deg)`, opacity: 0.6 },
        { transform: 'none', opacity: 1 }
    ], { duration: 280, easing: 'cubic-bezier(.2,.85,.25,1)' });
}

function varrerVaza(w) {
    if (reduzMovimento()) return;
    const alvo = centroDe($(`j${w}`));
    SFX.varrer();
    for (let i = 0; i < 4; i++) {
        const el = $(`carta-${i}`).firstChild;
        if (!el || !el.animate) continue;
        const r = el.getBoundingClientRect();
        const dx = alvo.x - (r.left + r.width / 2), dy = alvo.y - (r.top + r.height / 2);
        el.animate([
            { transform: 'none', opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) scale(.35) rotate(${(i - w) * 12}deg)`, opacity: 0 }
        ], { duration: 340, easing: 'ease-in', fill: 'forwards' });
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
    // guarda de onde a carta sai (a mão, no seu caso) para animar o voo até a mesa
    const origemEl = i === 0 ? document.querySelector(`#maoJogador .carta[data-id="${c.id}"]`) : null;
    const origemRect = origemEl ? origemEl.getBoundingClientRect() : null;
    if (i === 0) cartaSelecionadaId = null;
    const renuncia = G.mesa.length > 0 && c.naipe !== G.lider &&
        G.maos[i].some(x => x.naipe === G.lider);

    if (renuncia) {
        G.renunciou[i] = true;
    }

    if (G.mesa.length > 0 && c.naipe !== G.lider) G.vazios[i][G.lider] = true;   // a IA anota quem ficou sem o naipe
    G.jogadas[c.naipe * 13 + c.valor] = 1;
    G.maos[i] = G.maos[i].filter(x => x.id !== c.id);
    G.mesa.push({ jogador: i, carta: c });

    if (G.mesa.length === 1) G.lider = c.naipe;
    if (c.naipe === COP) G.quebrada = true;

    if (ehDama(c)) {
        mostrarQ();
        tocarAudioDama();
    }

    const elJogada = criarElementoCarta(c, 'jogada' +
        (G.mesa.length === 1 ? ' carta-lider' : ''));
    $(`carta-${i}`).appendChild(elJogada);
    animarEntrada(elJogada, i, origemRect);
    SFX.jogar();

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
        varrerVaza(w);
        G.timer = setTimeout(() => {
            G.mesa = []; G.lider = null; G.ocupado = false; G.aviso = '';
            for (let i = 0; i < 4; i++) $(`carta-${i}`).innerHTML = '';
            G.turno = w;
            if (G.vazas === 13) fimRodada(); else agendar();
        }, reduzMovimento() ? 0 : 360);
    }, 760);
}

function fimRodada() {
    const renunciante = G.renunciou.findIndex(Boolean);
    if (renunciante >= 0) G.renunciaConquistada = true;
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
        a.ganhoRodada - b.ganhoRodada || a.totalPartida - b.totalPartida
    );

    classificacaoMesa.forEach((item, idx) => {
        let posEfetiva = idx;
        while (
            posEfetiva > 0 &&
            classificacaoMesa[posEfetiva - 1].ganhoRodada === item.ganhoRodada
        ) {
            posEfetiva--;
        }
        // Menos pontos na rodada é melhor: 0, 1, 2 e 4 pontos.
        const pontuacaoPorPosicao = [0, 1, 2, 4];
        const ptsRankGanho = pontuacaoPorPosicao[Math.min(posEfetiva, 3)];
        item.ptsRankGanho = ptsRankGanho;
        item.personagem.pontosRank += ptsRankGanho;
    });

    const eliminadosAgora = [];
    for (let i = 1; i < 4; i++) {
        if (G.personagens[i].total >= LIMITE) eliminadosAgora.push({ indice: i, nome: G.personagens[i].nome });
    }
    let entrouIntegranteNovo = false;
    eliminadosAgora.forEach(({ indice: i }) => {
        const saiu = G.personagens[i];
        maquinasEliminadas.push(saiu);
        const proxima = G.fila.shift();
        if (proxima) {
            G.personagens[i] = proxima;
            G.nomes[i] = proxima.nome;
            G.totais[i] = proxima.total;
            entrouIntegranteNovo = true;
        }
    });

    // Quando alguém sai e uma nova máquina assume a vaga, os pontos do
    // placar da mesa recomeçam para os quatro participantes atuais.
    if (entrouIntegranteNovo) {
        G.personagens.forEach(p => { p.pontosRank = 0; });
        jogadoresMesaRodada.forEach(item => { item.ptsRankGanho = 0; });
    }

    if (lua >= 0) G.luaConquistada = true;
    if (ganho[0] === 0) ESTAT.zeros++;
    if (lua === 0) ESTAT.luas++;

    const humanoPerdeu = G.personagens[0].total >= LIMITE;
    const fim = humanoPerdeu || (!G.fila.length && eliminadosAgora.length > 0);

    let h = fim ? '<h2>🏁 Fim de jogo!</h2>' : `<h2>Fim da rodada ${G.rodada}</h2>`;
    const menorPontuacao = Math.min(...ganho);
    if (ganho[0] === menorPontuacao) h += `<img class="sticker-menor-pontuacao" src="menor-pontuacao.gif" alt="Sticker comemorativo">`;
    if (renunciante >= 0) h += `<img class="sticker-renuncia" src="renu.png" alt="Imagem de renúncia">`;
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
        ESTAT.partidas++;
        if (rankingFinal[0].id === jogadorHumano.id) ESTAT.vitorias++;
        h += '<h3>🏆 Ranking Geral Final</h3><table><tr><th>#</th><th>Jogador</th><th>Pts Rank</th><th>Pts Mesa</th></tr>';
        rankingFinal.forEach((p, pos) => {
            const ehEu = p.id === jogadorHumano.id;
            h += `<tr class="${ehEu ? 'eu' : ''}"><td>${pos + 1}º</td><td>${p.nome}${ehEu ? ' (Você)' : ''}</td><td><b>${p.pontosRank}</b></td><td>${p.total}</td></tr>`;
        });
        h += '</table>';
    }

    salvarEstat();
    h += `<button class="btn-modo" id="btnModal">${fim ? 'Escolher personagens novamente' : 'Próxima rodada'}</button>`;
    G.rodadaEncerrada = true;
    $('modalBox').innerHTML = h;
    $('modal').classList.remove('escondido');
    $('btnModal').focus();
    $('btnModal').onclick = fim ? () => {
        ocultarPalco();
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
    h += '<p class="legenda-pontos" style="margin-bottom:10px;">Pontos por rodada: menor pontuação (0) · 2º (1) · 3º (2) · maior pontuação (4)</p>';
    if (G.luaConquistada) {
        h += '<img class="sticker-lua-26" src="26.gif" alt="Lua: 26 pontos para os outros jogadores">';
    }
    if (G.renunciaConquistada) {
        h += '<img class="sticker-renuncia" src="renu.png" alt="Renúncia na partida">';
    }
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
    h += `<p class="legenda-pontos" style="margin-bottom:12px;">Dificuldade: <b>${NOMES_NIVEL[G.nivel] || 'Normal'}</b><br>Seu histórico: ${ESTAT.partidas} partida(s) · ${ESTAT.vitorias} vitória(s) · ${ESTAT.zeros} rodada(s) sem pontos · ${ESTAT.luas} Lua(s)</p>`;
    h += '<button type="button" class="btn-modo" id="btnResetarPlacar" style="margin-bottom:8px;">Resetar placar geral e reiniciar jogo</button>';
    h += '<button type="button" class="btn-modo" id="btnFecharRanking">Fechar</button>';
    $('modalRankingBox').innerHTML = h;
    $('modalRanking').classList.remove('escondido');
    $('btnFecharRanking').focus();
    $('btnFecharRanking').onclick = () => $('modalRanking').classList.add('escondido');
    $('btnResetarPlacar').onclick = resetarPlacarGeral;
}

function resetarPlacarGeral() {
    if (!jogadorHumano) return;
    if (!confirm('Isso vai zerar o placar geral e reiniciar a partida. Continuar?')) return;
    if (G && G.timer) clearTimeout(G.timer);
    if (G && G.tk) G.tk.pular = true;
    ocultarPalco();
    PERSONAGENS.forEach(p => {
        p.total = 0;
        p.pontosRank = 0;
    });
    maquinasEliminadas = [];
    filaMaquinas = [];
    G = null;
    jogadorHumano = null;
    cartaSelecionadaId = null;
    ultimoCliqueCarta = { id: null, tempo: 0 };
    $('modalRanking').classList.add('escondido');
    $('modal').classList.add('escondido');
    $('jogo').classList.add('escondido');
    $('telaLogin').classList.add('escondido');
    $('telaInicial').classList.remove('escondido');
    pararIntro();
    $('personagemEscolhido').textContent = 'Escolha seu personagem';
    $('btnComecar').disabled = true;
    document.querySelectorAll('.personagem-card').forEach(c => c.classList.remove('escolhido'));
}

$('btnRanking').onclick = abrirRankingGeral;
function marcarSom() {
    const b = $('btnSom');
    b.innerHTML = `<i class="fas fa-volume-${SFX.ligado ? 'high' : 'xmark'}"></i>`;
    b.setAttribute('aria-pressed', String(!SFX.ligado));
    b.title = SFX.ligado ? 'Efeitos sonoros ligados' : 'Efeitos sonoros desligados';
}
$('btnSom').onclick = () => { SFX.alternar(); marcarSom(); };
marcarSom();
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
        G.timer = setTimeout(() => { const c = escolherBot(G.turno); jogar(G.turno, c); }, 700 + Math.random() * 450);
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

// ================= IA V11 (níveis Difícil e Mestre) =================
// Trabalha com cartas em formato numérico: código = naipe*13 + valor
// (0-12 Espadas, 13-25 Copas, 26-38 Ouros, 39-51 Paus). Dama de Espadas = 10, 2♣ = 39.
// A IA só usa informação PÚBLICA: a própria mão, cartas já jogadas, mesa, pontos
// e quem já ficou sem algum naipe. Ela não enxerga a mão dos outros jogadores.
const IA = (() => {
    const DAMA = 10, DOIS_PAUS = 39;
    const suit = c => (c / 13) | 0, val = c => c % 13;
    const pts = c => (c >= 13 && c < 26) ? 1 : (c === DAMA ? 13 : 0);

    function legais(S, i) {
        const h = S.hands[i], m = S.mesa;
        if (m.length === 0) {
            if (S.vazas === 0 && h.includes(DOIS_PAUS)) return [DOIS_PAUS];
            if (!S.quebrada) {
                const sem = h.filter(c => suit(c) !== 1);
                if (sem.length) return sem;
            }
            return h.slice();
        }
        const seg = h.filter(c => suit(c) === S.lider);
        return seg.length ? seg : h.slice();
    }

    function visto(S, i) {
        const v = new Uint8Array(52);
        v.set(S.jogadas);
        const h = S.hands[i];
        for (let k = 0; k < h.length; k++) v[h[k]] = 1;
        return v;
    }

    // Jogador que já levou TODOS os pontos até agora (possível "lua")
    function ameacaLua(S) {
        let tot = 0, mx = -1, mj = -1;
        for (let j = 0; j < 4; j++) { tot += S.pts[j]; if (S.pts[j] > mx) { mx = S.pts[j]; mj = j; } }
        return (mx >= 13 && mx === tot) ? mj : -1;
    }

    function abrir(S, i, L, ruido) {
        const vis = visto(S, i), h = S.hands[i];
        const qFora = !vis[DAMA], temQ = h.includes(DAMA);
        let melhor = L[0], mc = Infinity;
        for (const c of L) {
            const s = suit(c), v = val(c);
            let unseen = 0, maiores = 0;
            for (let x = 0; x < 13; x++) {
                if (!vis[s * 13 + x]) { unseen++; if (x > v) maiores++; }
            }
            const pOver = unseen === 0 ? 0 : 1 - Math.pow(1 - maiores / unseen, 3);
            const pWin = 1 - pOver;
            let esp = 0.3;
            for (let j = 0; j < 4; j++) if (j !== i && S.vazios[j][s]) esp += 1.3;
            if (s === 0 && qFora) esp += 13 * 0.4;
            if (s === 1) esp += 1.2;
            let custo = pWin * esp + (s === 1 ? 0 : v * 0.03);
            if (s === 0 && qFora && !temQ && v < 10 && !h.includes(11) && !h.includes(12)) custo -= 1.5;
            if (s === 0 && temQ) custo += 1.5;
            let cnt = 0;
            for (let k = 0; k < h.length; k++) if (suit(h[k]) === s) cnt++;
            if (cnt <= 3) custo -= (4 - cnt) * 0.1;
            custo += Math.random() * ruido;
            if (custo < mc) { mc = custo; melhor = c; }
        }
        return melhor;
    }

    function seguir(S, i, L, ruido) {
        const m = S.mesa, n = m.length, rest = 3 - n, lider = S.lider, h = S.hands[i];
        let wc = -1, wj = -1, ptsMesa = 0;
        for (let k = 0; k < n; k++) {
            const j = m[k][0], c = m[k][1];
            ptsMesa += pts(c);
            if (suit(c) === lider && (wc < 0 || val(c) > val(wc))) { wc = c; wj = j; }
        }
        const vis = visto(S, i), qFora = !vis[DAMA], temQ = h.includes(DAMA);
        const segue = suit(L[0]) === lider;
        const ameaca = ameacaLua(S);
        let melhor = L[0], mc = Infinity;

        for (const c of L) {
            let custo;
            if (segue) {
                const v = val(c);
                let pWin = 0;
                if (v > val(wc)) {
                    if (rest === 0) pWin = 1;
                    else {
                        let unseen = 0, maiores = 0;
                        for (let x = 0; x < 13; x++) {
                            if (!vis[lider * 13 + x]) { unseen++; if (x > v) maiores++; }
                        }
                        pWin = unseen === 0 ? 1 : Math.pow(1 - maiores / unseen, rest);
                    }
                }
                const ptsC = pts(c);
                let dump = rest * 0.3;
                if (qFora && c !== DAMA) {
                    dump += lider === 0
                        ? (v > 10 ? 13 * 0.5 * rest / 3 : 13 * 0.15 * rest / 3)
                        : 13 * 0.06 * rest;
                }
                custo = pWin * (ptsMesa + ptsC + dump);
                custo -= (1 - pWin) * v * 0.10;      // livrar-se de cartas altas quando vai perder
                custo += pWin * v * 0.04;            // ao ganhar, gasta a menor possível
                custo -= (1 - pWin) * ptsC * 0.9;    // entrega pontos (Dama/Copas) a quem vai ganhar
                if (ameaca >= 0 && ameaca !== i && (ptsMesa + ptsC) > 0) custo -= pWin * 25;  // quebrar a lua
                if (ameaca >= 0 && ameaca === wj && ptsC > 0 && wj !== i) custo += (1 - pWin) * 20; // não alimentar a lua
            } else {
                let sc;
                if (c === DAMA) sc = 100;
                else if (suit(c) === 1) sc = 40 + val(c);
                else if (suit(c) === 0 && qFora && !temQ && val(c) > 10) sc = 60 + val(c);
                else {
                    let cnt = 0;
                    for (let k = 0; k < h.length; k++) if (suit(h[k]) === suit(c)) cnt++;
                    sc = val(c) + Math.max(0, 5 - cnt) * 2.5;
                }
                if (wj >= 0 && pts(c) > 0) sc += pts(c) * ((S.totais[wj] - S.totais[i]) / 40);
                if (ameaca >= 0 && ameaca !== i && pts(c) > 0) sc += (wj !== ameaca) ? 30 : -60;
                custo = -sc;
            }
            custo += Math.random() * ruido;
            if (custo < mc) { mc = custo; melhor = c; }
        }
        return melhor;
    }

    function politica(S, i, ruido) {
        const L = legais(S, i);
        if (L.length === 1) return L[0];
        return S.mesa.length === 0 ? abrir(S, i, L, ruido) : seguir(S, i, L, ruido);
    }

    // ---------- simulação ----------
    function jogarSim(S, j, c) {
        const h = S.hands[j];
        h.splice(h.indexOf(c), 1);
        S.jogadas[c] = 1;
        if (S.mesa.length > 0 && suit(c) !== S.lider) S.vazios[j][S.lider] = true;
        S.mesa.push([j, c]);
        if (S.mesa.length === 1) S.lider = suit(c);
        if (suit(c) === 1) S.quebrada = true;
        if (S.mesa.length === 4) {
            let w = -1, wc = -1, p = 0;
            for (const [jj, cc] of S.mesa) {
                p += pts(cc);
                if (suit(cc) === S.lider && (wc < 0 || val(cc) > val(wc))) { wc = cc; w = jj; }
            }
            S.pts[w] += p;
            S.vazas++;
            S.mesa = [];
            S.lider = null;
            S.vez = w;
        } else {
            S.vez = (j + 1) % 4;
        }
    }

    function clonar(S, maos) {
        return {
            hands: maos.map(m => m.slice()),
            mesa: S.mesa.slice(), lider: S.lider, quebrada: S.quebrada, vazas: S.vazas,
            pts: S.pts.slice(), jogadas: new Uint8Array(S.jogadas),
            vazios: S.vazios.map(r => r.slice()), totais: S.totais, vez: S.vez
        };
    }

    function pontosFinais(S) {
        const lua = S.pts.findIndex(p => p === 26);
        return lua >= 0 ? S.pts.map((p, k) => k === lua ? 0 : 26) : S.pts.slice();
    }

    function amostrar(S, i, desc) {
        const cap0 = S.contagem;
        for (let tent = 0; tent < 25; tent++) {
            const relaxa = tent >= 20;
            const cap = cap0.slice();
            const maos = [[], [], [], []];
            maos[i] = S.hands[i].slice();
            const cartas = desc.slice();
            for (let k = cartas.length - 1; k > 0; k--) {
                const r = (Math.random() * (k + 1)) | 0;
                const t = cartas[k]; cartas[k] = cartas[r]; cartas[r] = t;
            }
            const perm = c => { let n = 0; for (let j = 0; j < 4; j++) if (j !== i && !S.vazios[j][suit(c)]) n++; return n; };
            if (!relaxa) cartas.sort((a, b) => perm(a) - perm(b));
            let ok = true;
            for (const c of cartas) {
                const op = [];
                for (let j = 0; j < 4; j++) {
                    if (j === i || cap[j] <= 0) continue;
                    if (!relaxa && S.vazios[j][suit(c)]) continue;
                    op.push(j);
                }
                if (!op.length) { ok = false; break; }
                const j = op[(Math.random() * op.length) | 0];
                maos[j].push(c); cap[j]--;
            }
            if (ok) return maos;
        }
        return null;
    }

    function mestre(S, i, orcamentoMs) {
        const L = legais(S, i);
        if (L.length === 1) return L[0];
        const desc = [];
        for (let c = 0; c < 52; c++) if (!S.jogadas[c] && !S.hands[i].includes(c)) desc.push(c);
        let alvo = -1, mx = -1;
        for (let j = 0; j < 4; j++) if (j !== i && S.totais[j] > mx) { mx = S.totais[j]; alvo = j; }
        const soma = L.map(() => 0);
        const t0 = Date.now();
        let n = 0;
        while (n < 6 || (Date.now() - t0 < orcamentoMs && n < 500)) {
            const maos = amostrar(S, i, desc);
            if (!maos) break;
            for (let k = 0; k < L.length; k++) {
                const T = clonar(S, maos);
                T.vez = i;
                jogarSim(T, i, L[k]);
                while (T.vazas < 13) jogarSim(T, T.vez, politica(T, T.vez, 0.25));
                const f = pontosFinais(T);
                soma[k] += f[i] - (alvo >= 0 ? 0.15 * f[alvo] : 0);
            }
            n++;
        }
        if (n === 0) return politica(S, i, 0.1);
        let b = 0;
        for (let k = 1; k < L.length; k++) if (soma[k] < soma[b]) b = k;
        return L[b];
    }

    return {
        legais, politica, mestre, jogarSim, pontosFinais, pts, suit, val,
        dificil: (S, i) => politica(S, i, 0.12)
    };
})();

function montarEstadoIA(i) {
    const cod = c => c.naipe * 13 + c.valor;
    const hands = [[], [], [], []];
    hands[i] = G.maos[i].map(cod);
    return {
        hands, contagem: G.maos.map(m => m.length),
        mesa: G.mesa.map(j => [j.jogador, cod(j.carta)]),
        lider: G.mesa.length ? G.lider : null,
        quebrada: G.quebrada, vazas: G.vazas, pts: G.pts.slice(),
        jogadas: G.jogadas, vazios: G.vazios,
        totais: G.personagens.map(p => p.total), vez: i
    };
}

// Escolhe a carta da máquina conforme o nível da partida.
function escolherBot(i) {
    if (G.nivel === 'normal') return escolherBotV7(i);
    try {
        const S = montarEstadoIA(i);
        const codigo = G.nivel === 'mestre' ? IA.mestre(S, i, 110) : IA.dificil(S, i);
        const carta = G.maos[i].find(c => c.naipe * 13 + c.valor === codigo);
        if (carta && !validar(i, carta)) return carta;
    } catch (e) { console.warn('IA:', e); }
    return escolherBotV7(i);
}

// ================= IA ESTRATÉGICA (V7 = nível Normal) =================
function jogadorEmPerigoDeLua(j) {
    const pontosNaMao = G.maos[j].reduce((s, c) => s + pontosCarta(c), 0);
    return G.pts[j] >= 20 ||
        (G.pts[j] >= 13 && G.pts[j] + pontosNaMao >= 22);
}

function escolherAlvoDaIA(i) {
    const candidatos = [0, 1, 2, 3].filter(j => j !== i);
    const seguros = candidatos.filter(j => !jogadorEmPerigoDeLua(j));
    const grupo = seguros.length ? seguros : candidatos;
    grupo.sort((a, b) =>
        G.personagens[b].total - G.personagens[a].total ||
        G.pts[b] - G.pts[a]
    );
    return grupo[0];
}

function vencedorProjetado(cartas, naipeLider) {
    let vencedor = null;
    cartas.forEach(j => {
        if (j.carta.naipe === naipeLider &&
            (!vencedor || j.carta.valor > vencedor.carta.valor)) {
            vencedor = j;
        }
    });
    return vencedor ? vencedor.jogador : null;
}

function pontuarJogadaBot(i, carta, alvo) {
    const cartas = [...G.mesa, { jogador: i, carta }];
    const lider = G.mesa.length ? G.lider : carta.naipe;
    const vencedor = vencedorProjetado(cartas, lider);
    const pontos = cartas.reduce((s, j) => s + pontosCarta(j.carta), 0);
    const temDama = cartas.some(j => ehDama(j.carta));
    let nota = Math.random() * 0.15;

    // Prioriza entregar os pontos a quem já tem maior total.
    if (pontos > 0) {
        if (vencedor === alvo) nota += pontos * (temDama ? 5 : 3);
        else if (vencedor === i) nota -= pontos * 3.5;
        else if (vencedor !== null && jogadorEmPerigoDeLua(vencedor)) nota -= pontos * 5;
        else if (vencedor !== null) nota += pontos * (G.personagens[vencedor].total / 60);
    }

    // A Dama de Espadas recebe prioridade alta para ser descartada
    // quando isso entrega seus 13 pontos a um adversário adequado.
    if (ehDama(carta)) {
        if (vencedor === alvo) nota += 45;
        else if (vencedor === i) nota -= 45;
        else if (vencedor !== null && jogadorEmPerigoDeLua(vencedor)) nota -= 55;
        else nota += 8;
    }

    // Sem a Dama na mão, tenta puxar espadas para pressionar quem a segura.
    if (carta.naipe === ESP && !G.maos[i].some(ehDama)) {
        nota += G.mesa.length === 0 ? 2 : 0.5;
    }
    if (vencedor === i && pontos > 0) nota -= 12;
    return nota;
}

function escolherBotV7(i) {
    const mao = G.maos[i];
    const v = mao.filter(c => !validar(i, c));
    const ord = (a, b) => a.valor - b.valor;
    const alvo = escolherAlvoDaIA(i);

    if (G.mesa.length === 0) {
        if (G.vazas === 0) return v.find(c => c.naipe === PAU && c.valor === 0) || v[0];
        if (!mao.some(ehDama)) {
            const espadas = v.filter(c => c.naipe === ESP).sort(ord);
            if (espadas.length) return espadas[0];
        }
        const semCopas = v.filter(c => c.naipe !== COP);
        const base = semCopas.length ? semCopas : v;
        const semDama = base.filter(c => !ehDama(c));
        const pool = semDama.length ? semDama : base;
        return [...pool].sort(ord)[0];
    }

    const seguem = v.filter(c => c.naipe === G.lider);
    const candidatos = seguem.length ? seguem : v;

    // Se estiver sem o naipe, tenta descartar a Dama ou Copas para o
    // vencedor projetado da vaza que tenha mais pontos acumulados.
    if (!seguem.length) {
        const comDama = candidatos.filter(ehDama);
        if (comDama.length) {
            const melhorDama = [...comDama].sort((a, b) =>
                pontuarJogadaBot(i, b, alvo) - pontuarJogadaBot(i, a, alvo)
            )[0];
            const semDama = candidatos.filter(c => !ehDama(c));
            if (!semDama.length || pontuarJogadaBot(i, melhorDama, alvo) > 8) return melhorDama;
        }
    }

    return [...candidatos].sort((a, b) =>
        pontuarJogadaBot(i, b, alvo) - pontuarJogadaBot(i, a, alvo)
    )[0];
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
function atualizarOrientacao() {
    // Usa a orientação informada pelo sistema (e o tamanho da janela como fallback).
    // Não precisa ler os movimentos do giroscópio, apenas detectar a rotação da tela.
    const tipo = screen.orientation && screen.orientation.type;
    const deitada = tipo ? tipo.includes('landscape') :
        (window.matchMedia && window.matchMedia('(orientation: landscape)').matches);
    document.documentElement.classList.toggle('orientacao-deitada', !!deitada);
    document.documentElement.classList.toggle('orientacao-em-pe', !deitada);
}
function reajustar() {
    atualizarOrientacao();
    cancelAnimationFrame(rafEscala);
    rafEscala = requestAnimationFrame(() => { ajustarEscala(); if (G) render(); });
}
atualizarOrientacao();
addEventListener('resize', reajustar);
addEventListener('orientationchange', () => setTimeout(reajustar, 300));
if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', reajustar);
}
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

    // Durante a distribuição a mão mostra só as cartas que já chegaram, viradas para baixo.
    const mostrar = G.distribuindo ? G.maos[0].slice(0, G.recebidas[0]) : G.maos[0];
    mostrar.forEach((c, idx) => {
        const revelada = !G.distribuindo;
        const el = revelada ? criarElementoCarta(c) : criarVersoCarta();
        if (revelada) {
            el.dataset.id = c.id;
            if (G.virarMao) { el.classList.add('virar'); el.style.animationDelay = (idx * 35) + 'ms'; }
        }

        if (revelada && !G.distribuindo) {
            el.tabIndex = 0;
            el.setAttribute('role', 'button');
            if (cartaSelecionadaId === c.id) el.classList.add('selecionada');

            el.onclick = () => {
                const agora = Date.now();
                const mesmoClique = ultimoCliqueCarta.id === c.id &&
                    agora - ultimoCliqueCarta.tempo <= JANELA_DUPLO_CLIQUE;
                if (mesmoClique) {
                    ultimoCliqueCarta = { id: null, tempo: 0 };
                    cartaSelecionadaId = null;
                    tentarJogar(c);
                    return;
                }
                ultimoCliqueCarta = { id: c.id, tempo: agora };
                // Um clique seleciona a carta; dois cliques na mesma carta
                // em até 600 ms jogam a carta (janela mais lenta).
                cartaSelecionadaId = cartaSelecionadaId === c.id ? null : c.id;
                document.querySelectorAll('#maoJogador .carta').forEach(cardEl => {
                    cardEl.classList.toggle('selecionada', cardEl === el && cartaSelecionadaId === c.id);
                });
            };
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
        box.classList.toggle('turno-ativo', i === G.turno && !G.ocupado && !G.distribuindo);
        const ranking = [...PERSONAGENS].sort((a, b) => a.pontosRank - b.pontosRank || a.total - b.total).findIndex(p => p.id === G.personagens[i].id) + 1;
        box.innerHTML = `<img class="avatar-jogador" src="${G.personagens[i].foto}" alt="${G.nomes[i]}" onerror="this.src='fotos/${G.personagens[i].id}.png'; this.onerror=null">
            <div class="info-jogador">
                <span class="nome">${G.nomes[i]} <small class="ranking">${ranking}º</small>${i === G.carteador ? '<small class="dealer" title="Carteador">D</small>' : ''}</span>
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
    if (G.distribuindo) st.textContent = G.distMsg || 'Preparando o baralho…';
    else if (G.aviso) st.textContent = G.aviso;
    else if (G.vazas === 0 && G.mesa.length === 0) st.textContent = `Rodada ${G.rodada}: ${G.nomes[G.turno]} tem o 2♣ e começa.`;
    else if (minha) st.textContent = G.mesa.length ? `Sua vez — siga ${NAIPES[G.lider].nome} ${NAIPES[G.lider].s} (1 clique seleciona · duplo clique/arraste joga).` : 'Sua vez — abra a mesa (1 clique seleciona · duplo clique/arraste joga).';
    else st.textContent = `Vez de ${G.nomes[G.turno]}…`;
}

function mostrarQ() {
    $('efeitoQ').classList.remove('escondido');
}
function esconderQ() {
    clearTimeout(mostrarQ.t);
    $('efeitoQ').classList.add('escondido');
}

// ================= RÁDIO =================
const R = { a: new Audio(), est: [], i: -1, on: false, tent: 0, t: null, ctx: null, synth: null };
const audioDama = new Audio('fotos/dama-espadas.ogg');
audioDama.preload = 'auto';
audioDama.addEventListener('ended', esconderQ);
audioDama.addEventListener('error', esconderQ);
let damaMutada = false;
function tocarAudioDama() {
    mostrarQ();
    if (damaMutada) {
        // Sem áudio, mantém o efeito visível por um breve intervalo.
        clearTimeout(mostrarQ.t);
        mostrarQ.t = setTimeout(esconderQ, 2500);
        return;
    }
    clearTimeout(mostrarQ.t);
    if (!audioDama.paused) return; // Nunca corta uma reprodução em andamento.
    audioDama.currentTime = 0;
    audioDama.volume = Math.min(1, Math.max(0.2, R.a ? R.a.volume * 2 : 1));
    audioDama.play().catch(() => {
        mostrarQ.t = setTimeout(esconderQ, 2500);
    });
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
const GENEROS = { pagode: 'Pagode', samba: 'Samba', sertanejo: 'Sertanejo', funk: 'Funk', mpb: 'MPB', forro: 'Forró', axe: 'Axé', pop: 'Pop', rock: 'Rock', gospel: 'Gospel', 'hip hop': 'Hip hop', electronic: 'Eletrônica', jazz: 'Jazz', classical: 'Clássica', news: 'Notícias' };
// ➕ SUAS RÁDIOS: cole aqui links diretos de stream (sem login). gen: gênero (padrão 'pagode')
// Ex.: { nome: 'Minha rádio', url: 'https://servidor.com/stream', gen: 'pagode' }
const RADIOS_EXTRAS = [
];
// ⭐ Rádio que sempre abre primeiro nos gêneros pagode/samba
const PREFERIDA = /gera[cç][aã]o samba/i;
function fixarPref(lista, gen) {
    if (gen !== 'pagode' && gen !== 'samba') return lista;
    let pref = lista.find(e => PREFERIDA.test(e.nome));
    if (!pref) { try { pref = JSON.parse(localStorage.getItem('radioPref') || 'null'); } catch (e) {} if (!pref) return lista; }
    else try { localStorage.setItem('radioPref', JSON.stringify(pref)); } catch (e) {}
    return [pref, ...lista.filter(e => e.url !== pref.url)];
}
let generoRadio = 'pagode';   // abre em Pagode, sem filtro de estado
const buscaRB = qs => Promise.any(HOSTS.map(async h => {
    const r = await fetch(`https://${h}.api.radio-browser.info${API}&${qs}`);
    if (!r.ok) throw 0; return r.json();
}));
let bloq = new Set(); try { bloq = new Set(JSON.parse(localStorage.getItem('radioBloq') || '[]')); } catch (e) {}
function bloquear(url) { if (!url) return; bloq.add(url); try { localStorage.setItem('radioBloq', JSON.stringify([...bloq].slice(-200))); } catch (e) {} }
const pedeLogin = u => /@|token|login|auth|passw|[?&](user|key|pass)/i.test(u);
const protoOk = u => u.startsWith('https://') || (location.protocol !== 'https:' && u.startsWith('http://'));
// Prioriza apenas a rádio favorita; a busca considera rádios de todo o Brasil.
function pontuar(s) {
    return PREFERIDA.test(s.name) ? -2 : 0;
}
R.cache = {}; R.prom = {};
function preencherLista() {
    const s = $('selRadio'); if (!s) return;
    s.innerHTML = R.est.length ? '<option value="" disabled selected>Escolher rádio…</option>' + R.est.map((e, i) => `<option value="${i}">${e.ok ? '' : '⚪ '}${e.nome.replace(/</g, '&lt;')}</option>`).join('')
        : '<option value="" disabled selected>Carregando rádios…</option>';
    if (R.on && R.i >= 0) s.value = R.i;
}
function acharEstacoes(gen = generoRadio) {
    const k = gen, atual = () => gen === generoRadio;
    if (R.cache[k] && R.cache[k].length) { R.est = R.cache[k]; preencherLista(); return Promise.resolve(); }
    try { const c = JSON.parse(localStorage.getItem('estRadio_' + k) || 'null'); if (c && c.length) { R.cache[k] = fixarPref(c, gen); if (atual()) { R.est = R.cache[k]; preencherLista(); } } } catch (e) {}
    if (R.prom[k]) return R.prom[k];
    const tag = 'tag=' + encodeURIComponent(gen);
    R.prom[k] = (async () => {
        const rs = await Promise.allSettled([
            buscaRB(`${tag}&limit=100`),
            buscaRB(`name=${encodeURIComponent(gen)}&limit=60`),
            ...(gen === 'pagode' || gen === 'samba' ? [buscaRB('name=' + encodeURIComponent('Geração Samba') + '&limit=20'), buscaRB('name=' + encodeURIComponent('Geracao Samba') + '&limit=20')] : [])
        ]);
        const vistos = new Set(), lista = [];
        rs.forEach(x => (x.value || []).forEach(s => {
            const u = s.url_resolved || s.url;
            if (!u || !protoOk(u) || s.hls === 1 || pedeLogin(u) || vistos.has(u)) return;
            vistos.add(u);
            lista.push({ nome: s.name.trim(), url: u, p: pontuar(s), ok: s.lastcheckok === 1, c: s.clickcount || 0 });
        }));
        RADIOS_EXTRAS.filter(x => (x.gen || 'pagode') === gen).forEach(x => { if (!vistos.has(x.url)) { vistos.add(x.url); lista.push({ nome: x.nome, url: x.url, p: -1, ok: true, c: 0 }); } });
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
    generoRadio = $('selGenero').value;
    R.est = []; R.i = -1; R.tent = 0; preencherLista();
    if (R.on) { R.a.pause(); setR('Procurando rádio…'); }
    await acharEstacoes();
    if (R.on) tentarEstacao();
};
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

// Atalhos disponíveis em qualquer tela do site:
// Ctrl + botão direito: alterna a tela preta.
// Ctrl + botão esquerdo: alterna o modo de tela cheia.
function alternarTelaCheia() {
    if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
}
document.addEventListener('contextmenu', e => {
    if (e.ctrlKey && e.button === 2) {
        e.preventDefault();
        camuflado = !camuflado;
        camuflagem.classList.toggle('ativa', camuflado);
    }
}, true);
document.addEventListener('click', e => {
    if (e.ctrlKey && e.button === 0) {
        e.preventDefault();
        e.stopPropagation();
        alternarTelaCheia();
    }
}, true);
// escolher rádio direto na lista
$('selRadio').onchange = e => {
    const i = +e.target.value; if (!R.est[i]) return;
    bloq.delete(R.est[i].url); R.on = true; marcarBotao();
    R.i = i - 1; R.tent = 0; tentarEstacao();
};
preencherLista();
