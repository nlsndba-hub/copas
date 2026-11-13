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
const ehDama = c => c.naipe === ESP && c.valor === 10;           // Q♠
const pontosCarta = c => c.naipe === COP ? 1 : (ehDama(c) ? 13 : 0);
const $ = id => document.getElementById(id);

let nomeJogador = '', G = null;

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
    const badge = pts ? `<span class="badge ${c.naipe === COP ? 'cop' : 'dama'}">${pts}</span>` : '';
    d.innerHTML = `<div class="topo"><span class="valor">${f}</span><span class="np">${s}</span></div>
        <div class="centro">${s}</div>${badge}
        <div class="base"><span class="valor">${f}</span><span class="np">${s}</span></div>`;
    d.setAttribute('aria-label', nomeCarta(c) + (pts ? `, vale ${pts} ponto${pts > 1 ? 's' : ''}` : ''));
    return d;
}

// ================= INÍCIO =================
$('btnEntrar').onclick = entrar;
$('inputNome').addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
function entrar() {
    nomeJogador = $('inputNome').value.trim();
    if (!nomeJogador) { $('inputNome').focus(); $('inputNome').placeholder = 'Digite um nome!'; return; }
    $('telaLogin').classList.add('escondido');
    $('jogo').classList.remove('escondido');
    G = { nomes: [nomeJogador, 'Máquina 1', 'Máquina 2', 'Máquina 3'], totais: [0, 0, 0, 0], rodada: 0 };
    novaRodada();
}

function novaRodada() {
    G.rodada++;
    const b = embaralhar(criarBaralho());
    G.maos = [0, 1, 2, 3].map(i => b.slice(i * 13, i * 13 + 13));
    G.mesa = []; G.lider = null; G.quebrada = false; G.vazas = 0;
    G.pts = [0, 0, 0, 0]; G.pegas = [[], [], [], []]; G.ocupado = false; G.aviso = '';
    G.turno = G.maos.findIndex(m => m.some(c => c.naipe === PAU && c.valor === 0)); // quem tem o 2♣ começa
    for (let i = 0; i < 4; i++) $(`carta-${i}`).innerHTML = '';
    $('modal').classList.add('escondido');
    agendar();
}

// ================= REGRAS =================
// Retorna null se a jogada é válida, ou o motivo da recusa.
function validar(i, c) {
    const mao = G.maos[i];
    if (G.mesa.length === 0) {                                   // quem abre a vaza
        if (G.vazas === 0 && !(c.naipe === PAU && c.valor === 0)) return 'A primeira carta da rodada deve ser o 2♣.';
        if (c.naipe === COP && !G.quebrada && mao.some(x => x.naipe !== COP))
            return 'Copas só podem ser jogadas depois que alguém descartar uma (ou se você só tiver copas).';
        return null;
    }
    if (c.naipe !== G.lider && mao.some(x => x.naipe === G.lider))
        return `Você precisa seguir o naipe puxado: ${NAIPES[G.lider].nome} ${NAIPES[G.lider].s}.`;
    return null;                                                  // sem o naipe: qualquer carta
}

function jogar(i, c) {
    G.maos[i] = G.maos[i].filter(x => x.id !== c.id);
    G.mesa.push({ jogador: i, carta: c });
    if (G.mesa.length === 1) G.lider = c.naipe;
    if (c.naipe === COP) G.quebrada = true;
    if (ehDama(c)) mostrarQ();
    $(`carta-${i}`).appendChild(criarElementoCarta(c, 'jogada' + (G.mesa.length === 1 ? ' carta-lider' : '')));
    G.aviso = '';
    G.turno = (G.turno + 1) % 4;                                  // sentido horário
    if (G.mesa.length === 4) { G.ocupado = true; render(); G.timer = setTimeout(resolverVaza, 1300); }
    else agendar();
}

function resolverVaza() {
    let venc = null;
    G.mesa.forEach(j => {
        if (j.carta.naipe === G.lider && (!venc || j.carta.valor > venc.carta.valor)) venc = j;   // maior carta do naipe puxado
    });
    const w = venc.jogador;
    const pontos = G.mesa.reduce((s, j) => s + pontosCarta(j.carta), 0);
    G.pts[w] += pontos;
    G.mesa.forEach(j => { if (pontosCarta(j.carta)) G.pegas[w].push(j.carta); });
    $(`carta-${w}`).firstChild.classList.add('carta-vencedora');
    G.aviso = `${G.nomes[w]} levou a vaza${pontos ? ` (+${pontos} pt${pontos > 1 ? 's' : ''})` : ''}`;
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
    const lua = G.pts.findIndex(p => p === 26);                   // pegou tudo: ele zera, os outros levam 26
    const ganho = G.pts.map((p, i) => lua >= 0 ? (i === lua ? 0 : 26) : p);
    ganho.forEach((g, i) => G.totais[i] += g);
    const fim = G.totais.some(t => t >= LIMITE);
    const ordem = [0, 1, 2, 3].sort((a, b) => G.totais[a] - G.totais[b]);
    const maior = Math.max(...G.totais);
    let h = fim ? '<h2>🏁 Fim de jogo!</h2>' : `<h2>Fim da rodada ${G.rodada}</h2>`;
    if (lua >= 0) h += `<p>🌕 <b>${G.nomes[lua]}</b> pegou os 26 pontos! Ele não pontua e os outros levam 26.</p>`;
    h += '<table><tr><th>Jogador</th><th>Rodada</th><th>Total</th></tr>';
    (fim ? ordem : [0, 1, 2, 3]).forEach((i, pos) => {
        const cls = (fim && G.totais[i] === maior ? 'perdeu ' : '') + (i === 0 ? 'eu' : '');
        h += `<tr class="${cls}"><td>${fim ? (pos + 1) + 'º ' : ''}${G.nomes[i]}${fim && G.totais[i] === maior ? ' 😖' : ''}</td><td>+${ganho[i]}</td><td>${G.totais[i]}</td></tr>`;
    });
    h += '</table>';
    if (fim) h += `<p>${G.totais[0] === maior ? 'Você perdeu dessa vez!' : 'Perdeu: <b>' + ordem.filter(i => G.totais[i] === maior).map(i => G.nomes[i]).join(', ') + '</b>'}</p>`;
    h += `<button class="btn-modo" id="btnModal">${fim ? 'Jogar novamente' : 'Próxima rodada'}</button>`;
    $('modalBox').innerHTML = h;
    $('modal').classList.remove('escondido');
    $('btnModal').focus();
    $('btnModal').onclick = fim ? () => { G.totais = [0, 0, 0, 0]; G.rodada = 0; novaRodada(); } : novaRodada;
    render();
}

// ================= FLUXO DE TURNOS =================
function agendar() {
    clearTimeout(G.timer);
    render();
    if (G.mesa.length === 4) return;
    if (G.turno === 0) {
        if (G.vazas === 0 && G.mesa.length === 0)                // o 2♣ sai sozinho
            G.timer = setTimeout(() => jogar(0, G.maos[0].find(c => c.naipe === PAU && c.valor === 0)), 900);
    } else {
        G.timer = setTimeout(() => { const c = escolherBot(G.turno); jogar(G.turno, c); }, 900);
    }
}

function tentarJogar(c) {
    if (G.turno !== 0 || G.ocupado || G.mesa.length === 4) return;
    const erro = validar(0, c);
    if (erro) { G.aviso = '⚠ ' + erro; render(true); return; }
    jogar(0, c);
}

// ================= IA =================
function escolherBot(i) {
    const mao = G.maos[i], v = mao.filter(c => !validar(i, c));
    const ord = (a, b) => a.valor - b.valor;
    if (G.mesa.length === 0) {
        if (G.vazas === 0) return v[0];
        const sem = v.filter(c => c.naipe !== COP), base = sem.length ? sem : v;
        const seg = base.filter(c => c.naipe !== ESP || !mao.some(x => x.naipe === ESP && x.valor >= 10)); // não puxa espadas com Q/K/A
        return [...(seg.length ? seg : base)].sort(ord)[0];
    }
    const seguem = v.filter(c => c.naipe === G.lider);
    if (seguem.length) {
        const maior = Math.max(...G.mesa.filter(j => j.carta.naipe === G.lider).map(j => j.carta.valor));
        const baixas = seguem.filter(c => c.valor < maior).sort(ord);
        if (baixas.length) return baixas[baixas.length - 1];     // maior carta que ainda não leva a vaza
        const mesaPts = G.mesa.reduce((s, j) => s + pontosCarta(j.carta), 0);
        const s = [...seguem].sort(ord), semQ = s.filter(c => !ehDama(c)), pool = semQ.length ? semQ : s;
        return (G.mesa.length === 3 && mesaPts === 0) ? pool[pool.length - 1] : pool[0];
    }
    const q = v.find(ehDama); if (q) return q;                    // sem o naipe: descarta Q♠, depois copas altas
    const cops = v.filter(c => c.naipe === COP).sort(ord); if (cops.length) return cops[cops.length - 1];
    return [...v].sort(ord)[v.length - 1];
}

// ================= TELA =================
function render(piscar) {
    const minha = G.turno === 0 && !G.ocupado && G.mesa.length < 4;
    // Mão
    const div = $('maoJogador'); div.innerHTML = '';
    G.maos[0].sort((a, b) => ORDEM_MAO.indexOf(a.naipe) - ORDEM_MAO.indexOf(b.naipe) || a.valor - b.valor);
    const w = innerWidth <= 768 ? 62 : 84, n = G.maos[0].length;
    const ov = n > 1 ? Math.max(w * 0.3, (n * w - innerWidth * 0.94) / (n - 1)) : 0;
    div.style.setProperty('--ov', ov + 'px');
    G.maos[0].forEach(c => {
        const ok = minha && !validar(0, c);
        const el = criarElementoCarta(c, minha ? (ok ? 'valida' : 'bloqueada') : '');
        el.tabIndex = 0; el.setAttribute('role', 'button');
        el.onclick = () => tentarJogar(c);
        el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tentarJogar(c); } };
        div.appendChild(el);
    });
    // Jogadores
    for (let i = 0; i < 4; i++) {
        const cops = G.pegas[i].filter(c => c.naipe === COP).length, q = G.pegas[i].some(ehDama);
        const box = $(`j${i}`);
        box.classList.toggle('turno-ativo', i === G.turno && !G.ocupado);
        box.innerHTML = `<span class="nome"><i class="fas fa-${i ? 'robot' : 'user'}"></i> ${G.nomes[i]}</span>
            <span class="tot">Total: ${G.totais[i]}</span><span class="rod">Rodada: ${G.pts[i]}</span>
            <span class="pegou">${cops ? `<span class="pt-cop">♥ ${cops}</span>` : ''}${q ? '<span class="pt-q">Q♠ 13</span>' : ''}</span>`;
    }
    // Status
    const st = $('status');
    st.classList.toggle('aviso', G.aviso.startsWith('⚠'));
    if (G.aviso) st.textContent = G.aviso;
    else if (G.vazas === 0 && G.mesa.length === 0) st.textContent = `Rodada ${G.rodada}: ${G.nomes[G.turno]} tem o 2♣ e começa.`;
    else if (minha) st.textContent = G.mesa.length ? `Sua vez — siga ${NAIPES[G.lider].nome} ${NAIPES[G.lider].s} se tiver.` : 'Sua vez — você abre a vaza.';
    else st.textContent = `Vez de ${G.nomes[G.turno]}…`;
}
addEventListener('resize', () => G && render());

function mostrarQ() {
    const e = $('efeitoQ');
    e.classList.remove('escondido');
    clearTimeout(mostrarQ.t);
    mostrarQ.t = setTimeout(() => e.classList.add('escondido'), 2500);
}

// ================= RÁDIO (pagode) =================
// Busca estações de pagode ativas no diretório Radio-Browser; se nenhuma tocar, usa uma batucada interna.
const R = { a: new Audio(), est: [], i: -1, on: false, tent: 0, t: null, ctx: null, synth: null };
R.a.volume = 0.6;
const setR = t => $('radioNome').textContent = t;
function marcarBotao() {
    const b = $('btnRadio'); b.classList.toggle('on', R.on);
    b.innerHTML = `<i class="fas fa-${R.on ? 'stop' : 'play'}"></i>`;
    b.setAttribute('aria-label', R.on ? 'Parar rádio' : 'Tocar rádio');
}
async function acharEstacoes() {
    if (R.est.length) return;
    for (const h of ['de1', 'nl1', 'at1']) {
        try {
            const r = await fetch(`https://${h}.api.radio-browser.info/json/stations/search?tag=pagode&countrycode=BR&hidebroken=true&order=clickcount&reverse=true&limit=40`);
            const d = await r.json();
            R.est = d.filter(s => s.url_resolved && s.url_resolved.startsWith('https://')).map(s => ({ nome: s.name.trim(), url: s.url_resolved }));
            if (R.est.length) return;
        } catch (e) { /* tenta o próximo servidor */ }
    }
}
async function ligarRadio() {
    R.on = true; R.tent = 0; marcarBotao(); setR('Procurando rádio…');
    await acharEstacoes();
    if (R.on) tentarEstacao();
}
function tentarEstacao() {
    clearTimeout(R.t); pararSynth();
    if (!R.est.length || R.tent >= Math.min(R.est.length, 6)) return musicaInterna();
    R.i = (R.i + 1) % R.est.length; R.tent++;
    const e = R.est[R.i];
    R.a.src = e.url; setR('Conectando: ' + e.nome);
    R.t = setTimeout(tentarEstacao, 8000);                        // não tocou em 8s? próxima
    R.a.play().catch(err => {
        if (err.name === 'NotAllowedError') { clearTimeout(R.t); desligarRadio(); setR('Clique em ▶ novamente'); }
    });
}
R.a.addEventListener('playing', () => { clearTimeout(R.t); R.tent = 0; setR('♪ ' + R.est[R.i].nome); });
R.a.addEventListener('error', () => { if (R.on && !R.synth && R.a.src) { clearTimeout(R.t); tentarEstacao(); } });
function desligarRadio() {
    R.on = false; clearTimeout(R.t); R.a.pause(); R.a.removeAttribute('src'); R.a.load(); pararSynth();
    marcarBotao(); setR('Rádio desligada');
}
$('btnRadio').onclick = () => R.on ? desligarRadio() : ligarRadio();
$('btnProx').onclick = () => { if (!R.on) return ligarRadio(); R.tent = 0; tentarEstacao(); };
$('vol').oninput = e => { R.a.volume = +e.target.value; if (R.synth) R.synth.g.gain.value = R.a.volume * 0.5; };

// Batucada de samba/pagode gerada no navegador (garante som mesmo sem internet)
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
