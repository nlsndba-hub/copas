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

// ================= MULTIJOGADOR (V20) · estado global =================
// modo: 'solo' | 'misto' | 'sala'. O anfitrião (host) roda o jogo inteiro; os demais só
// recebem o estado e mandam a jogada. Tudo trafega pelo Supabase Realtime (nada é gravado).
const MP = {
    modo: 'solo', sb: null, ch: null, ativo: false, emJogo: false, papel: null, naEspera: false,
    pid: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3),
    sala: null, membros: [], offset: 0, inicio: 0, eu: 0, falando: new Set(),
    tick: null, tPing: null, tLista: null, tDif: null, ultimo: '', espectador: false,
    ordem: 0, gid: null, gidMorto: null, tSaida: null, cheiaDesde: 0, avisoEspera: '',
    ultimoSnap: null, mesaMeta: '', volta: false, ultimoD: null
};
const VOZ = { pcs: {}, mic: null, ativo: false, token: 0, fonte: '', semClique: 0, negado: false };
const TEMPO_MISTO = 30 * 1000;
const TELAS = ['telaInicial', 'telaAcesso', 'telaModo', 'telaSalas', 'telaLogin', 'telaEspera', 'telaAdmin', 'telaMissoes', 'telaManutencao', 'jogo'];
let ultimaTela = '';
function mostrarTela(id) {
    TELAS.forEach(t => $(t).classList.toggle('escondido', t !== id));
    document.body.dataset.tela = id;
    document.documentElement.dataset.tela = id;
    if (id !== ultimaTela) { ultimaTela = id; try { atualizarChatVisivel(); } catch (e) {} }
}

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
    d.className = `carta ${NAIPES[c.naipe].cor} n-${NAIPES[c.naipe].nome.toLowerCase()} ${c.valor >= 9 && c.valor <= 11 ? 'figura' : ''} ${extra}`;
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
    // V92: o botão de som não controla mais os efeitos; eles ficam sempre ligados.
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
    function tom(freq, dur, vol, atraso) {
        if (!ligado) return;
        const c = audio(); if (!c) return;
        const t = c.currentTime + (atraso || 0);
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol * escala(), t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + dur + 0.03);
    }
    return {
        get ligado() { return ligado; },
        conquista() { [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => tom(f, 0.42, 0.22, i * 0.11)); },
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
    abrirAcesso();
    // Tela cheia nunca abre sozinha: sempre pergunta antes.
    try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen && confirm('Deseja abrir o jogo em tela cheia?')) {
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
// Personagens especiais: catálogo separado, sem necessidade de conta.
(window.PERSONAGENS_MISSAO || []).forEach(p => { if (!PERSONAGENS.some(x => x.id === p.id)) PERSONAGENS.push({ ...p, total: 0, pontosRank: 0 }); });
// V90 — toda recompensa de missão vira um personagem especial automaticamente,
// mesmo que ainda não esteja listado em personagens.js (ex.: Robô Maicon, 102).
(window.MISSOES || []).forEach(m => {
    const r = m.recompensa || {}, id = Number(r.personagemId);
    if (!id || PERSONAGENS.some(x => x.id === id)) return;
    PERSONAGENS.push({ id, nome: r.nomePersonagem || `Personagem ${id}`, foto: r.foto || `fotos/${id}.png`,
        somenteBot: true, missaoId: m.id, audioEntrada: r.audioEntrada || `audio/${id}.mp3`, total: 0, pontosRank: 0 });
});
// V90 — chance (única, por partida) de UM personagem especial desbloqueado aparecer no modo Sozinho.
const CHANCE_ESPECIAL_SOLO = 0.15;

// Personagens cadastrados pelo administrador (V35): vêm do banco e ficam em cache neste aparelho.
// Os 15 acima são fixos no código; os extras têm número de foto acima do maior fixo.
const EXTRAS_KEY = 'copasExtras';
function aplicarExtras(lista, remontar) {
    let mudou = false;
    (lista || []).forEach(e => {
        const id = +e.id; if (!id || !e.nome) return;
        const foto = e.foto_data || `fotos/${e.foto_nome}`;
        const ex = PERSONAGENS.find(p => p.id === id);
        if (ex) { if (ex.extra && (ex.nome !== e.nome || ex.foto !== foto)) { ex.nome = e.nome; ex.foto = foto; ex.fotoNome = e.foto_nome; mudou = true; } return; }
        const p = { id, nome: e.nome, foto, fotoNome: e.foto_nome, extra: true, total: 0, pontosRank: 0 };
        try { const salvo = JSON.parse(localStorage.getItem('copasRankGeral') || '{}'); if (typeof salvo[id] === 'number') p.pontosRank = salvo[id]; } catch (err) {}
        PERSONAGENS.push(p); mudou = true;
    });
    if (mudou && remontar) { montarSelecao(); if (getSB()) carregarRankServidor(); }
    return mudou;
}
try { aplicarExtras(JSON.parse(localStorage.getItem(EXTRAS_KEY) || '[]'), false); } catch (e) {}

// Rank geral: persiste entre partidas (o ranking oficial fica no servidor)
try {
    const salvo = JSON.parse(localStorage.getItem('copasRankGeral') || '{}');
    PERSONAGENS.forEach(p => { if (typeof salvo[p.id] === 'number') p.pontosRank = salvo[p.id]; });
} catch (e) {}
function salvarRankGeral() {
    try {
        const o = {}; PERSONAGENS.forEach(p => { o[p.id] = p.pontosRank; });
        localStorage.setItem('copasRankGeral', JSON.stringify(o));
    } catch (e) {}
}
// Posição (1º, 2º…) com empates: quem empata divide a mesma posição.
// modo 'geral': empatados ficam na pior posição do grupo (todos começam em último);
// modo 'partida': empatados ficam na melhor posição do grupo.
function posicoes(lista, chave, modo) {
    const ord = [...lista].sort((a, b) => chave(a) - chave(b));
    const mapa = new Map();
    ord.forEach((p, i) => {
        const iguais = ord.map((q, j) => chave(q) === chave(p) ? j : -1).filter(j => j >= 0);
        mapa.set(p, (modo === 'geral' ? Math.max(...iguais) : Math.min(...iguais)) + 1);
    });
    return mapa;
}

let jogadorHumano = null;
let filaMaquinas = [];
let maquinasEliminadas = [];

// V99 — missões: dois personagens (terceiro/ultimo). O usuário, se for um deles, termina em 1º e o outro fica em último.
const requisitosDaMissao = m => (m.terceiro && m.ultimo ? [m.terceiro, m.ultimo] : (m.presentes || m.personagensNecessarios || [])).map(Number);
function missaoValidaPara(m, humanoId) { return true; }
function condicoesDaMissao(m, humanoId) {
    if (!(m.terceiro && m.ultimo)) return m.condicoes;
    const t = Number(m.terceiro), u = Number(m.ultimo), h = Number(humanoId);
    if (h === t) return [{ quem: 'eu', pos: 1 }, { quem: u, pos: 'ultimo' }];
    if (h === u) return [{ quem: 'eu', pos: 1 }, { quem: t, pos: 'ultimo' }];
    return [{ quem: t, pos: 3 }, { quem: u, pos: 'ultimo' }];
}
function condicoesCumpridas(m, pers, totais, humanoId) {
    const max = Math.max(...totais);
    const idx = q => pers.indexOf(Number(q === 'eu' ? humanoId : q));
    const posDe = q => { const i = idx(q); return i < 0 ? -1 : 1 + totais.filter(t => t < totais[i]).length; };
    return condicoesDaMissao(m, humanoId).every(c => {
        const i = idx(c.quem); if (i < 0) return false;
        const pos = posDe(c.quem), ultimo = totais[i] === max && totais.some(t => t !== max);
        if (c.pos === 'ultimo' && !ultimo) return false;
        if (c.pos === 'naoUltimo' && ultimo) return false;
        if (typeof c.pos === 'number' && pos !== c.pos) return false;
        if (Array.isArray(c.pos) && !c.pos.includes(pos)) return false;
        if (c.antesDe != null) { const j = idx(c.antesDe); if (j < 0 || !(totais[i] < totais[j])) return false; }
        if (c.pontosMax != null && totais[i] > c.pontosMax) return false;
        if (c.pontosMin != null && totais[i] < c.pontosMin) return false;
        return true;
    });
}

function sortearBotsSozinho(personagemHumano, quantidade, missaoAtiva = null) {
    // Quando a mesa recebe uma missão, os adversários exigidos são garantidos.
    const escolhidos = [];
    if (missaoAtiva) {
        requisitosDaMissao(missaoAtiva).forEach(id => {
            const p = PERSONAGENS.find(x => x.id === Number(id) && !x.somenteBot);
            if (p && p.id !== personagemHumano.id && !escolhidos.some(x => x.id === p.id) && escolhidos.length < quantidade) escolhidos.push(p);
        });
    }
    // V90 — personagens especiais só entram depois de desbloqueados pela missão.
    // Por partida: 15% de chance de aparecer, e no máximo UM especial na mesa.
    carregarMissoesLocais();
    const especiais = PERSONAGENS.filter(p => p.somenteBot && p.missaoId && MISSION_UNLOCKS.has(p.missaoId));
    if (especiais.length && escolhidos.length < quantidade && Math.random() < CHANCE_ESPECIAL_SOLO) {
        escolhidos.push(especiais[Math.floor(Math.random() * especiais.length)]);
    }
    const ids = new Set(escolhidos.map(p => p.id));
    const pool = embaralhar(PERSONAGENS.filter(p => !p.somenteBot && p.id !== personagemHumano.id && !ids.has(p.id)));
    while (escolhidos.length < quantidade && pool.length) escolhidos.push(pool.shift());
    return escolhidos;
}

// Uma missão é sorteada a cada 3 partidas completas. O contador fica salvo
// no aparelho e separado por usuário. A missão só aparece como alerta, sem revelar o objetivo.
const CHAVE_CONTADOR_MISSOES = 'copasContadorPartidasMissoes';
function prepararMissaoDaMesa(personagemHumano) {
    carregarMissoesLocais();
    let contadores = {};
    try { contadores = JSON.parse(localStorage.getItem(CHAVE_CONTADOR_MISSOES) || '{}') || {}; } catch (e) {}
    const chave = usuarioAtual?.usuario || 'anon';
    contadores[chave] = (Number(contadores[chave]) || 0) + 1;
    try { localStorage.setItem(CHAVE_CONTADOR_MISSOES, JSON.stringify(contadores)); } catch (e) {}
    if (contadores[chave] % 3 !== 0) return null;
    // V90 — se o personagem do usuário é um dos objetivos, a missão só precisa dos outros.
    const candidatas = (window.MISSOES || []).filter(m => {
        if (MISSION_UNLOCKS.has(m.id)) return false;
        const req = requisitosDaMissao(m);
        if (!req.length || !missaoValidaPara(m, personagemHumano.id)) return false;
        if (!req.every(id => PERSONAGENS.some(p => p.id === id && !p.somenteBot))) return false;
        const outros = req.filter(id => id !== Number(personagemHumano.id));
        return outros.length > 0 && outros.length <= 3;
    });
    return candidatas.length ? candidatas[Math.floor(Math.random() * candidatas.length)] : null;
}

function mostrarAlertaMesaMissao() {
    let el = document.getElementById('alertaMesaMissao');
    if (!el) {
        el = document.createElement('div');
        el.id = 'alertaMesaMissao';
        el.textContent = 'Mesa com missão';
        document.body.appendChild(el);
    }
    el.classList.remove('ativo');
    // Reinicia a animação sempre que uma nova mesa especial é criada.
    void el.offsetWidth;
    el.classList.add('ativo');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('ativo'), 3600);
}
// V92 — áudios da pasta audio/ (entrada dos personagens especiais): ficam registrados para poder parar.
const AUDIO_PERS = (() => {
    let ligado = true;
    try { ligado = localStorage.getItem('miq_audio_pers') !== '0'; } catch (e) {}
    return {
        get ligado() { return ligado; },
        alternar() { ligado = !ligado; try { localStorage.setItem('miq_audio_pers', ligado ? '1' : '0'); } catch (e) {} }
    };
})();
const AUDIOS_ENTRADA = [];
function pararAudiosEntrada() {
    while (AUDIOS_ENTRADA.length) {
        const it = AUDIOS_ENTRADA.pop();
        clearTimeout(it.tm);
        try { it.audio.pause(); it.audio.currentTime = 0; } catch (e) {}
    }
}
function tocarAudioEntradaEspecial(personagens) {
    pararAudiosEntrada();                         // nova mesa: o áudio anterior não continua
    if (!AUDIO_PERS.ligado) return;               // botão de som desligado = sem áudios de personagens
    const especiais = (personagens || []).filter(p => p && p.somenteBot && p.audioEntrada);
    // Se os dois personagens especiais forem sorteados na mesma partida,
    // toca os áudios em sequência para que um não corte o outro.
    especiais.forEach((p, i) => {
        try {
            const audio = new Audio(p.audioEntrada);
            audio.preload = 'auto';
            const it = { audio, tm: null };
            it.tm = setTimeout(() => { if (AUDIO_PERS.ligado) audio.play().catch(() => {}); }, 500 + i * 1800);
            AUDIOS_ENTRADA.push(it);
        } catch (e) {}
    });
}

function montarSelecao() {
    const grade = $('gradePersonagens');
    grade.innerHTML = '';
    PERSONAGENS.filter(p => !p.somenteBot).forEach(p => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'personagem-card';
        card.innerHTML = `<img src="${p.foto}" alt="${p.nome}" onerror="this.src='fotos/${p.id}.png'; this.onerror=null"><strong title="${p.nome}">${nomeCurto(p.nome, 12)}</strong>`;
        card.onclick = () => {
            if (card.classList.contains('ocupado')) return;
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
    if (MP.modo === 'solo') iniciarPartida(); else entrarNaEspera();
};
montarSelecao();

function iniciarPartida(hum) {
    if (!jogadorHumano) return;
    bloquearOrientacaoRetrato();
    // hum = [{ pid, p }]: humanos da partida (o anfitrião é sempre o primeiro). Sozinho: só você.
    hum = hum || [{ pid: null, p: jogadorHumano }];
    ultimoCliqueCarta = { id: null, tempo: 0 };
    cartaSelecionadaId = null;
    PERSONAGENS.forEach(p => { p.total = 0; });
    frasesUsadas = 0;
    atualizarBtnFrases();
    const idsHum = new Set(hum.map(h => h.p.id));
    const disponiveis = embaralhar(PERSONAGENS.filter(p => !idsHum.has(p.id) && !p.somenteBot));
    const missaoDaMesa = MP.modo === 'solo' && hum.length === 1 ? prepararMissaoDaMesa(hum[0].p) : null;
    const bots = MP.modo === 'solo' && hum.length === 1
        ? sortearBotsSozinho(hum[0].p, 3, missaoDaMesa)
        : disponiveis.splice(0, 4 - hum.length);
    const idsBots = new Set(bots.map(p => p.id));
    filaMaquinas = disponiveis.filter(p => !idsBots.has(p.id));
    maquinasEliminadas = [];
    // anfitrião no assento 0; os demais humanos e as máquinas sorteados nos outros lugares
    const resto = embaralhar([...hum.slice(1), ...bots.map(b => ({ pid: null, p: b }))]);
    const lugares = [hum[0], ...resto];
    const participantes = lugares.map(l => l.p);
    nomeJogador = jogadorHumano.nome;
    tocarAudioEntradaEspecial(participantes);
    mostrarTela('jogo');
    $('btnChave').classList.add('escondido');
    pararIntro();
    ajustarEscala();
    selecionarRadioInicial();
    G = {
        nomes: participantes.map(p => p.nome),
        personagens: participantes,
        totais: participantes.map(p => p.total),
        gid: MP.gid || null,
        vago: [false, false, false, false],
        humanos: lugares.map((l, k) => k === 0 || !!l.pid),
        donos: lugares.map((l, k) => k === 0 ? (l.pid || null) : (l.pid || null)),
        hostPid: hum[0].pid,
        rodada: 0,
        fila: filaMaquinas,
        participantes: new Set(participantes),
        luaConquistada: false,
        renunciaConquistada: false,
        missaoAtivaId: missaoDaMesa ? missaoDaMesa.id : null,
        nivel: nivelIA,
        venc: null,
        carteador: Math.floor(Math.random() * 4),
        estampasJogadores: (() => {
            const e = Array(4).fill('');
            const myStamp = estampaSelecionada();
            e[0] = myStamp !== 'padrao' ? String(myStamp) : '';
            MP.membros.forEach(m => {
                const idx = lugares.findIndex(l => l.pid === m.pid);
                if (idx >= 0) e[idx] = m.estampa || '';
            });
            return e;
        })()
    };
    novaRodada();
    reforcarEscala();
    if (missaoDaMesa) mostrarAlertaMesaMissao();
}

function novaRodada() {
    G.rodada++;
    frasesUsadas = 0; atualizarBtnFrases();   // 3 frases por rodada
    cartaSelecionadaId = null;
    const b = embaralhar(criarBaralho());
    G.maos = [0, 1, 2, 3].map(i => b.slice(i * 13, i * 13 + 13));
    G.mesa = []; G.venc = null; G.lider = null; G.quebrada = false; G.vazas = 0;
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
const viva = tk => (tk && tk.cliente) ? MP.tkCli === tk : (!!G && G.tk === tk);
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
    if (!G || MP.papel === 'cliente' || MP.papel === 'espectador') return;   // quem não é anfitrião usa a legenda vinda do snap
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
    const el = criarVersoCartaParaJogador(jogador);
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
    // Ctrl+Q executa somente o botão explícito "Rodar mesa" do placar.
    // Não passa rodada e não faz nada durante uma partida em andamento.
    if (e.ctrlKey && String(e.key).toLowerCase() === 'q') {
        const botao = $('btnRodarMesa');
        const rankingAberto = $('modalRanking') && !$('modalRanking').classList.contains('escondido');
        if (rankingAberto && botao && !botao.disabled && MP.modo === 'solo') {
            e.preventDefault();
            botao.click();
        }
    }
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
    if (MP.emJogo && MP.papel === 'host') enviar('evt', { t: 'varrer', w });
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
        if (G.vazas === 0 && !(c.naipe === PAU && c.valor === 0)) return 'Comece com o 2♣';
        if (c.naipe === COP && !G.quebrada && mao.some(x => x.naipe !== COP))
            return 'Copas ainda não foram quebradas';
        return null;
    }
    if (c.naipe !== G.lider && mao.some(x => x.naipe === G.lider))
        return `Siga o naipe ${NAIPES[G.lider].s}`;
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

    const descartou = G.mesa.length > 0 && c.naipe !== G.lider;   // sem o naipe puxado (e sem renunciar)
    if (descartou) G.vazios[i][G.lider] = true;   // a IA anota quem ficou sem o naipe
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
        G.aviso = `⚠ ${G.nomes[i]} renunciou! Tá querendo roubar de ladrão?`;
        clearTimeout(G.timer);
        render();
        G.timer = setTimeout(() => {
            fimRodada();
        }, 1800);
        return;
    }

    // Legenda curta e temporária (só isto aparece além da vez de quem joga)
    G.aviso = '';
    clearTimeout(G.tAviso);
    if (ehDama(c)) avisoTemp('Ihhhh, olha a Miquilina aí…', 1800);
    else if (descartou) avisoTemp('Eita, mas já?', 1600);
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
    G.venc = w;
    clearTimeout(G.tAviso);
    G.aviso = w === 0 ? 'Sua vez' : `Vez de ${G.nomes[w]}`;
    render();
    G.vazas++;
    G.timer = setTimeout(() => {
        varrerVaza(w);
        G.timer = setTimeout(() => {
            G.mesa = []; G.venc = null; G.lider = null; G.ocupado = false; G.aviso = '';
            for (let i = 0; i < 4; i++) $(`carta-${i}`).innerHTML = '';
            G.turno = w;
            if (G.vazas === 13) fimRodada(); else agendar();
        }, reduzMovimento() ? 0 : 360);
    }, 760);
}

// Monta o HTML do fim de rodada/partida para quem está olhando (idEu = personagem de quem vê).
function htmlFim(d, idEu) {
    const k = d.pers.indexOf(idEu);
    let h = d.fim ? '<h2>🏁 Fim da partida!</h2>' : `<h2>Fim da rodada ${d.rodada}</h2>`;
    const menorPontuacao = Math.min(...d.ganho);
    if (k >= 0 && d.ganho[k] === menorPontuacao) h += `<img class="sticker-menor-pontuacao" src="menor-pontuacao.gif" alt="Sticker comemorativo">`;
    if (d.ren >= 0) h += `<img class="sticker-renuncia" src="renu.png" alt="Imagem de renúncia">`;
    if (d.ren >= 0) h += `<p>⚠️ <b>${d.nomes[d.ren]} RENUNCIOU!</b> Por jogar fora do naipe tendo cartas do naipe solicitado, recebeu os 26 pontos da rodada.</p>`;
    else if (d.lua >= 0) h += `<p>🌕 <b>${d.nomes[d.lua]}</b> pegou os 26 pontos! Ele não leva nada nesta rodada (os pontos que já tinha continuam) e os outros levam 26.</p>`;

    const linhas = d.ordem.map(id => {
        const i = d.pers.indexOf(id);
        return { id, nome: d.nomes[i], ganho: d.ganho[i], total: d.totais[i], hum: d.hum[i] };
    });
    const posPartida = posicoes(linhas, l => l.total, 'partida');
    h += d.fim ? '<h3>Classificação final da partida</h3>' : '<h3>Classificação da partida</h3>';
    h += '<table><tr><th>#</th><th>Jogador</th><th>Total</th><th>Rodada</th><th>Situação</th></tr>';
    linhas.forEach(l => {
        const ehEu = l.id === idEu, estourou = l.total >= LIMITE;
        const situacao = ehEu ? 'Você' : (l.hum ? 'Jogador' : (estourou ? 'Eliminado' : 'Na mesa'));
        h += `<tr class="${estourou ? 'perdeu ' : ''}${ehEu ? 'eu' : ''}">
            <td>${posPartida.get(l)}º</td>
            <td>${l.nome}</td>
            <td><b>${l.total}</b></td>
            <td>+${l.ganho}</td>
            <td>${situacao}</td>
        </tr>`;
    });
    h += '</table>';

    if (d.fim) {
        const menor = linhas[0].total;
        const vencedores = linhas.filter(l => l.total === menor);
        const estourados = linhas.filter(l => l.total >= LIMITE).map(l => l.nome);
        h += `<p>${estourados.join(' e ')} ${estourados.length > 1 ? 'atingiram' : 'atingiu'} ${LIMITE} pontos ou mais. A partida terminou e o placar da partida será zerado.</p>`;
        if (d.saindo.length) h += `<p>🚪 Saem da mesa: ${d.saindo.join(', ')}.${d.entram.length ? ' Entram: ' + d.entram.join(', ') + '.' : ''}</p>`;
        h += `<p class="vencedor">🏆 <b>${vencedores.length > 1 ? 'Vencedores' : 'Vencedor'}: ${vencedores.map(l => l.nome + (l.id === idEu ? ' (Você)' : '')).join(' e ')}</b> com ${menor} ponto${menor === 1 ? '' : 's'}.</p>`;
        h += d.vale ? '<p class="legenda-pontos">O ranking geral foi atualizado. Toque no 🏆 para ver.</p>'
            : '<p class="legenda-pontos">Esta partida teve máquinas, então não conta para o ranking geral (só vale partida com 4 jogadores).</p>';
    }
    return h;
}

// Estatísticas e ranking geral (cada aparelho guarda o seu).
function aplicarFim(d) {
    const k = d.pers.indexOf(jogadorHumano.id);
    if (d.ren >= 0) G.renunciaConquistada = true;
    if (d.lua >= 0) G.luaConquistada = true;
    if (k >= 0) {
        if (d.ganho[k] === 0) ESTAT.zeros++;
        if (d.lua === k) ESTAT.luas++;
    }
    if (d.fim) {
        ESTAT.partidas++;
        if (d.vencIds.includes(jogadorHumano.id)) ESTAT.vitorias++;
    }
    if (d.fim && d.vale) {
        // Rank geral (só aparece ao tocar no troféu): 1º -1 · 2º e 3º +1 · último +2
        if (getSB()) {
            // Só quem comanda a partida (você sozinho ou o anfitrião) grava no servidor: assim cada partida conta uma vez.
            if (MP.papel !== 'cliente') enviarRankServidor(d).then(carregarRankServidor);
            else setTimeout(carregarRankServidor, 2500);
        } else somarRankLocal(d);
    }
    salvarEstat();
}

function mostrarModalFim(d, avancar) {
    let h = htmlFim(d, jogadorHumano.id);
    const rotulo = d.fim ? 'Nova partida' : 'Próxima rodada';
    h += avancar ? `<button class="btn-modo" id="btnModal">${rotulo}</button>`
        : '<button class="btn-modo" id="btnModal" disabled>Aguardando o anfitrião…</button>';
    if (avancar && MP.emJogo) h += '<p class="legenda-pontos" style="margin-top:8px">Avança sozinho em 20 segundos.</p>';
    $('modalBox').innerHTML = h;
    $('modal').classList.remove('escondido');
    if (avancar) {
        $('btnModal').focus();
        $('btnModal').onclick = () => { clearTimeout(G.tAuto); avancar(); };
        if (MP.emJogo) G.tAuto = setTimeout(() => { if (!$('modal').classList.contains('escondido')) avancar(); }, 20000);
    }
}

// Passa para a próxima rodada (ou nova partida). Fica à parte para o novo anfitrião poder retomar.
function criarAvancar(fim, saindo) {
    return () => {
        if ($('modal').classList.contains('escondido')) return;
        if (fim) {
            if (MP.modo === 'solo') {
                // No modo sozinho o jogador permanece no assento 0; os três bots
                // são sorteados novamente a cada partida, independentemente de quem perdeu.
                const missaoDaMesa = prepararMissaoDaMesa(jogadorHumano);
                const botsNovos = sortearBotsSozinho(jogadorHumano, 3, missaoDaMesa);
                G.missaoAtivaId = missaoDaMesa ? missaoDaMesa.id : null;
                if (missaoDaMesa) mostrarAlertaMesaMissao();
                const idsBotsNovos = new Set(botsNovos.map(p => p.id));
                const pool = embaralhar(PERSONAGENS.filter(p => p.id !== jogadorHumano.id && !p.somenteBot && !idsBotsNovos.has(p.id)));
                G.personagens = [jogadorHumano, ...botsNovos];
                G.fila = pool;
                tocarAudioEntradaEspecial(botsNovos);
                G.participantes = new Set(G.personagens);
                G.humanos = [true, false, false, false];
                G.donos = [null, null, null, null];
                G.vago = [false, false, false, false];
                G.personagens.forEach(p => { p.total = 0; });
            } else {
                // Nas salas, mantém a regra de reposição de máquinas eliminadas.
                saindo.forEach(i => {
                    const saiu = G.personagens[i];
                    maquinasEliminadas.push(saiu);
                    G.fila.push(saiu);
                    const proxima = G.fila.shift();
                    G.personagens[i] = proxima;
                    G.participantes.add(proxima);
                });
                PERSONAGENS.forEach(p => { p.total = 0; });
            }
            G.rodada = 0;
            G.carteador = (G.carteador + 1) % 4;
        }
        G.nomes = G.personagens.map(p => p.nome);
        G.totais = G.personagens.map(p => p.total);
        novaRodada();
    };
}

function fimRodada() {
    const renunciante = G.renunciou.findIndex(Boolean);
    const lua = renunciante >= 0 ? -1 : G.pts.findIndex(p => p === 26);
    const ganho = renunciante >= 0
        ? G.pts.map((p, i) => i === renunciante ? 26 : 0)
        : G.pts.map((p, i) => lua >= 0 ? (i === lua ? 0 : 26) : p);
    G.pts = ganho.slice();

    G.personagens.forEach((p, i) => {
        p.total += ganho[i];
        G.totais[i] = p.total;
    });

    // A partida acaba assim que alguém chega a 60 pontos ou mais.
    const fim = G.personagens.some(p => p.total >= LIMITE);

    const d = {
        rodada: G.rodada, fim, ganho: ganho.slice(), ren: renunciante, lua,
        nomes: G.nomes.slice(), pers: G.personagens.map(p => p.id),
        totais: G.personagens.map(p => p.total), hum: G.humanos.slice(),
        saindo: [], entram: [], ordem: [], vencIds: []
    };
    d.vale = d.hum.every(Boolean);      // só partidas só com jogadores (modo Sala) valem para o ranking geral
    // Classificação da PARTIDA: quem tem menos pontos fica em primeiro.
    const ord = [0, 1, 2, 3].sort((a, b) => d.totais[a] - d.totais[b] || d.ganho[a] - d.ganho[b]);
    d.ordem = ord.map(i => d.pers[i]);
    d.vencIds = ord.filter(i => d.totais[i] === d.totais[ord[0]]).map(i => d.pers[i]);

    // Máquinas que chegaram a 60 saem; jogadores humanos continuam sempre na mesa.
    const saindo = [];
    if (fim) for (let i = 0; i < 4; i++) if (!G.humanos[i] && G.personagens[i].total >= LIMITE) saindo.push(i);
    d.saindo = saindo.map(i => G.nomes[i]);
    d.entram = G.fila.slice(0, saindo.length).map(p => p.nome);

    if (fim && MP.modo === 'solo') { desbloquearEstampasDosUltimos(d); concluirMissoesDaPartida(d); }
    aplicarFim(d);

    const avancar = criarAvancar(fim, saindo);
    MP.ultimoD = d;

    G.rodadaEncerrada = true;
    if (MP.emJogo && MP.papel === 'host') enviar('evt', { t: 'modal', d });
    mostrarModalFim(d, avancar);
    render();
}

// ================= MODAL DO RANKING GERAL =================
function abrirRankingGeral() {
    if (!G) return;
    // No modo Sozinho, o troféu mostra apenas a classificação da partida atual.
    if (MP.modo === 'solo') {
        desenharPlacarPartida();
        return;
    }
    desenharRanking();
    if (getSB()) carregarRankServidor().then(ok => { if (ok && !$('modalRanking').classList.contains('escondido')) desenharRanking(); });
}

function desenharPlacarPartida() {
    if (!G) return;
    const linhas = G.personagens.map((p, i) => ({ p, total: p.total || 0, i }))
        .sort((a, b) => a.total - b.total);
    let h = '<h2>🏆 Placar da partida</h2>';
    h += '<table><tr><th>#</th><th>Jogador</th><th>Pontos</th></tr>';
    linhas.forEach((l, i) => {
        const ehEu = jogadorHumano && l.p.id === jogadorHumano.id;
        h += `<tr class="${ehEu ? 'eu' : ''}"><td>${i + 1}º</td><td>${l.p.nome}${ehEu ? ' (Você)' : ''}</td><td><b>${l.total}</b></td></tr>`;
    });
    h += '</table>';
    h += '<button type="button" class="btn-modo" id="btnRodarMesa" style="margin:0 0 8px">🔄 Rodar mesa</button>';
    h += '<button type="button" class="btn-sec" id="btnSairBar" style="margin:0 0 8px">🚪 Sair do bar</button>';
    h += '<button type="button" class="btn-modo" id="btnFecharRanking">Fechar</button>';
    $('modalRankingBox').innerHTML = h;
    $('modalRanking').classList.remove('escondido');
    $('btnFecharRanking').focus();
    $('btnRodarMesa').onclick = () => {
        $('modalRanking').classList.add('escondido');
        pararAudiosEntrada();
        // iniciarPartida reinicia os pontos e sorteia três novos adversários no modo Sozinho.
        iniciarPartida();
    };
    $('btnFecharRanking').onclick = () => $('modalRanking').classList.add('escondido');
    $('btnSairBar').onclick = sairDoBar;
}

function desenharRanking() {
    const ranking = [...PERSONAGENS].sort((a, b) => a.pontosRank - b.pontosRank || a.nome.localeCompare(b.nome));
    const posGeral = posicoes(PERSONAGENS, p => p.pontosRank, 'geral');
    let h = '<h2>🏆 Ranking Geral</h2>';
    h += '<p class="legenda-pontos" style="margin-bottom:10px;">Só contam partidas com 4 jogadores (modo Sala). Ao fim de cada partida (quando alguém faz 60 ou mais): 1º lugar −1 · 2º e 3º +1 · último +2. Menos pontos = melhor posição.</p>';
    if (G.luaConquistada) {
        h += '<img class="sticker-lua-26" src="26.gif" alt="Lua: 26 pontos para os outros jogadores">';
    }
    if (G.renunciaConquistada) {
        h += '<img class="sticker-renuncia" src="renu.png" alt="Renúncia na partida">';
    }
    h += getSB() ? '<p class="legenda-pontos" style="margin-bottom:6px;">☁️ Ranking compartilhado (salvo no servidor)</p>' : '<p class="legenda-pontos" style="margin-bottom:6px;">📱 Ranking salvo só neste aparelho</p>';
    h += '<table><tr><th>#</th><th>Jogador</th><th>Pontos</th></tr>';
    ranking.forEach(p => {
        const ehEu = jogadorHumano && p.id === jogadorHumano.id;
        h += `<tr class="${ehEu ? 'eu' : ''}">
            <td>${posGeral.get(p)}º</td>
            <td>${p.nome}${ehEu ? ' (Você)' : ''}</td>
            <td><b>${p.pontosRank}</b></td>
        </tr>`;
    });
    h += '</table>';
    h += `<p class="legenda-pontos" style="margin-bottom:12px;">Seu histórico: ${ESTAT.partidas} partida(s) · ${ESTAT.vitorias} vitória(s) · ${ESTAT.zeros} rodada(s) sem pontos · ${ESTAT.luas} Lua(s)</p>`;
    h += '<button type="button" class="btn-sec" id="btnSairBar" style="margin:0 0 8px">🚪 Sair do bar</button>';
    h += '<button type="button" class="btn-modo" id="btnFecharRanking">Fechar</button>';
    $('modalRankingBox').innerHTML = h;
    $('modalRanking').classList.remove('escondido');
    $('btnFecharRanking').focus();
    $('btnFecharRanking').onclick = () => $('modalRanking').classList.add('escondido');
    $('btnSairBar').onclick = sairDoBar;
}

$('btnRanking').onclick = abrirRankingGeral;
function marcarSom() {
    const b = $('btnSom');
    b.innerHTML = `<i class="fas fa-volume-${AUDIO_PERS.ligado ? 'high' : 'xmark'}"></i>`;
    b.setAttribute('aria-pressed', String(!AUDIO_PERS.ligado));
    b.title = AUDIO_PERS.ligado ? 'Áudios de personagens ligados' : 'Áudios de personagens desligados';
}
$('btnSom').onclick = () => { AUDIO_PERS.alternar(); if (!AUDIO_PERS.ligado) pararAudiosEntrada(); marcarSom(); };
marcarSom();
$('modalRanking').addEventListener('click', e => {
    if (e.target === $('modalRanking')) $('modalRanking').classList.add('escondido');
});

// ================= FLUXO DE TURNOS =================
function agendar() {
    clearTimeout(G.timer);
    render();
    if (G.mesa.length === 4) return;
    if (G.vago && G.vago[G.turno]) return;       // jogador ausente: a partida espera ele voltar
    if (G.humanos[G.turno]) {
        // 2♣ abre a rodada sozinho para quem o tem (humano); nas demais jogadas, o humano escolhe
        if (G.vazas === 0 && G.mesa.length === 0) {
            const s = G.turno;
            G.timer = setTimeout(() => { if (!G.vago || !G.vago[s]) jogar(s, G.maos[s].find(c => c.naipe === PAU && c.valor === 0)); }, 900);
        }
    } else {
        G.timer = setTimeout(() => { const c = escolherBot(G.turno); jogar(G.turno, c); }, 700 + Math.random() * 450);
    }
}

function tentarJogar(c) {
    if (G.distribuindo || G.turno !== 0 || G.ocupado || G.mesa.length === 4) return;
    const erro = validar(0, c);
    const renuncia = G.mesa.length > 0 && c.naipe !== G.lider &&
        G.maos[0].some(x => x.naipe === G.lider);
    if (erro && !renuncia) { G.aviso = '⚠ ' + erro; G.avisoAte = Date.now() + 2500; render(true); return; }
    if (MP.papel === 'cliente') {          // convidado: pede ao anfitrião para jogar a carta
        cartaSelecionadaId = null;
        enviar('jogar', { pid: MP.pid, c: c.id });
        return;
    }
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
        return (mx > 15 && mx === tot) ? mj : -1;   // V70: passou de 15 e só ele pontuou

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
                soma[k] += f[i];   // V70: sem alvo fixo; cada um luta para fazer menos pontos
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
// V70 — ameaça de "lua" (26 pontos): alguém já passou de 15 pontos na rodada e
// só ele pontuou até agora. Nesse caso todos empurram os pontos para outra pessoa.
function jogadorEmPerigoDeLua(j) {
    return G.pts[j] > 15 && G.pts.every((p, k) => k === j || p === 0);
}
function jogadorAmeacaLua() {
    for (let j = 0; j < 4; j++) if (jogadorEmPerigoDeLua(j)) return j;
    return -1;
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

function pontuarJogadaBot(i, carta) {
    const cartas = [...G.mesa, { jogador: i, carta }];
    const lider = G.mesa.length ? G.lider : carta.naipe;
    const vencedor = vencedorProjetado(cartas, lider);
    const pontos = cartas.reduce((s, j) => s + pontosCarta(j.carta), 0);
    const ameaca = jogadorAmeacaLua();
    let nota = Math.random() * 0.15;

    // V70: todos querem fazer o mínimo de pontos e empurrar o resto para qualquer outro,
    // sem perseguir um jogador específico. Se alguém está perto dos 26, os pontos
    // NÃO podem ir para ele: vão para outro (inclusive para si, se for preciso).
    if (pontos > 0 && vencedor !== null) {
        if (ameaca >= 0 && ameaca !== i) {
            if (vencedor === ameaca) nota -= pontos * 8;
            else nota += pontos * 4;
        } else if (vencedor === i) nota -= pontos * 3.5;
        else nota += pontos * 3;
    }

    if (ehDama(carta)) {
        if (ameaca >= 0 && ameaca !== i) {
            if (vencedor === ameaca) nota -= 60;
            else nota += 20;
        } else if (vencedor === i) nota -= 45;
        else if (vencedor !== null) nota += 25;
    }

    // Sem a Dama na mão, puxa espadas (jogada comum para forçar a Dama a sair).
    if (carta.naipe === ESP && !G.maos[i].some(ehDama)) {
        nota += G.mesa.length === 0 ? 1 : 0.3;
    }
    if (vencedor === i && pontos > 0 && !(ameaca >= 0 && ameaca !== i)) nota -= 12;
    return nota;
}

function escolherBotV7(i) {
    const mao = G.maos[i];
    const v = mao.filter(c => !validar(i, c));
    const ord = (a, b) => a.valor - b.valor;

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
                pontuarJogadaBot(i, b) - pontuarJogadaBot(i, a)
            )[0];
            const semDama = candidatos.filter(c => !ehDama(c));
            if (!semDama.length || pontuarJogadaBot(i, melhorDama) > 8) return melhorDama;
        }
    }

    return [...candidatos].sort((a, b) =>
        pontuarJogadaBot(i, b) - pontuarJogadaBot(i, a)
    )[0];
}

function criarVersoCarta() {
    const d = document.createElement('div');
    d.className = 'carta verso';
    d.setAttribute('aria-label', 'Carta virada para baixo');
    const estampa = estampaSelecionada();
    if (estampa !== 'padrao') {
        const img = document.createElement('img');
        img.className = 'imagem-estampa-carta';
        img.alt = ''; img.draggable = false;
        img.decoding = 'async';
        d.classList.add('com-estampa');
        d.appendChild(img);
        // sem arquivo em nenhuma extensão: mantém o verso padrão
        carregarImagemEstampa(img, estampa, () => { d.classList.remove('com-estampa'); img.remove(); });
    }
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

// V90 — a medição ignora transformações/animações passageiras (carta recebida, pulso do turno)
// e não aceita medir uma mesa "colapsada" (teclado aberto, transição de tela): nesses casos
// mantém a escala anterior em vez de encolher tudo para o tamanho mínimo.
function ajustarEscala() {
    const jogo = $('jogo');
    if (jogo.classList.contains('escondido')) return;
    if ($('mesa').clientHeight < 140 || $('mesa').clientWidth < 140) return;
    jogo.classList.add('medindo');
    try {
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
    } finally { jogo.classList.remove('medindo'); }
}

let rafEscala = 0;
function bloquearOrientacaoRetrato() {
    // Só no celular: no PC o jogo aceita vertical e horizontal.
    if (!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches)) return;
    try {
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
            screen.orientation.lock('portrait').catch(() => {});
        }
    } catch (e) {}
}

function atualizarOrientacao() {
    // Usa a orientação informada pelo sistema (e o tamanho da janela como fallback).
    // Não precisa ler os movimentos do giroscópio, apenas detectar a rotação da tela.
    const tipo = screen.orientation && screen.orientation.type;
    const deitada = tipo ? tipo.includes('landscape') :
        (window.matchMedia && window.matchMedia('(orientation: landscape)').matches);
    document.documentElement.classList.toggle('orientacao-deitada', !!deitada);
    document.documentElement.classList.toggle('orientacao-em-pe', !deitada);
}
// V90 — altura estável da tela do jogo (--app-h). O teclado virtual NUNCA muda esse valor,
// então abrir/fechar o chat não mexe na mesa, nos personagens nem nas cartas.
const TECLADO = { ativo: false, tSaida: 0 };
function tecladoDoChatAtivo() { return TECLADO.ativo || document.activeElement === $('chatInp'); }
function atualizarAlturaApp() {
    if (tecladoDoChatAtivo()) return;
    document.documentElement.style.setProperty('--app-h', window.innerHeight + 'px');
}
let ultimaEscalaU = 0;
function recalcularMesa(forcarRender) {
    if (tecladoDoChatAtivo()) return;
    atualizarAlturaApp();
    ajustarEscala();
    if (G && (forcarRender || Math.abs(ESC.u - ultimaEscalaU) > 0.02)) render();
    ultimaEscalaU = ESC.u;
}
// Reforço: remede logo depois e de novo quando as transições terminam (cura qualquer medida ruim).
function reforcarEscala() {
    [0, 120, 450, 1000].forEach(ms => setTimeout(() => recalcularMesa(ms === 0), ms));
}
function reajustar() {
    atualizarOrientacao();
    // O teclado virtual pode disparar vários resize seguidos. Esperamos a tela assentar
    // (debounce) e não medimos nada enquanto o campo do chat estiver em uso.
    clearTimeout(rafEscala);
    rafEscala = setTimeout(() => recalcularMesa(true), 180);
}
atualizarOrientacao();
atualizarAlturaApp();
addEventListener('resize', reajustar);
addEventListener('orientationchange', () => setTimeout(reajustar, 300));
addEventListener('pageshow', reforcarEscala);
document.addEventListener('visibilitychange', () => { if (!document.hidden) reforcarEscala(); });
document.addEventListener('fullscreenchange', () => setTimeout(reajustar, 250));
if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', reajustar);
}
// Vigia: se algum momento ruim deixar a mesa fora de proporção (personagens encolhidos ou
// cortados), remede sozinho. Só mede com o jogo visível, sem distribuição de cartas em andamento
// e com o teclado do chat fechado. A busca é determinística: se já está certo, nada muda.
setInterval(() => {
    if (document.hidden || !G || G.distribuindo || $('jogo').classList.contains('escondido') || tecladoDoChatAtivo()) return;
    if ($('mesa').clientHeight < 140) return;
    recalcularMesa(false);
}, 1500);

// ================= TELA =================
function avisoTemp(msg, ms) {
    if (!G) return;
    if (MP.emJogo && MP.papel === 'host') enviar('evt', { t: 'aviso', m: msg, ms });
    G.aviso = msg;
    G.avisoAte = Date.now() + ms;
    clearTimeout(G.tAviso);
    G.tAviso = setTimeout(() => {
        if (G && G.aviso === msg) { G.aviso = ''; atualizarStatus(); }
    }, ms);
    atualizarStatus();
}

function atualizarStatus() {
    if (!G) return;
    const minha = G.turno === 0 && !G.ocupado && G.mesa.length < 4;
    const st = $('status');
    st.classList.toggle('aviso', G.aviso.startsWith('⚠'));
    let txt;
    if (G.distribuindo) txt = G.distMsg || 'Preparando o baralho…';
    else if (G.aviso) txt = G.aviso;
    else if (minha) txt = 'Sua vez';
    else txt = `Vez de ${G.nomes[G.turno]}`;
    st.textContent = txt;
    ajustarFonteStatus(st);
}

// Se o texto não couber na caixa, reduz a fonte até caber.
function ajustarFonteStatus(st) {
    st.style.fontSize = '';
    let px = parseFloat(getComputedStyle(st).fontSize);
    let guarda = 0;
    while ((st.scrollHeight > st.clientHeight + 1 || st.scrollWidth > st.clientWidth + 1) && px > 8 && guarda++ < 30) {
        px -= 0.5;
        st.style.fontSize = px + 'px';
    }
}

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
        const ranking = posicoes(G.personagens, p => p.total, 'partida').get(G.personagens[i]);
        const espClick = MP.espectador ? ' onclick="verCartasEspectador(' + i + ')" style="cursor:pointer" title="Ver cartas de ' + G.nomes[i] + '"' : '';
        box.innerHTML = `<img class="avatar-jogador" data-pid="${(G.donos && G.donos[i]) || ''}" src="${G.personagens[i].foto}" alt="${G.nomes[i]}" onerror="this.src='fotos/${G.personagens[i].id}.png'; this.onerror=null"${espClick}>
            <div class="info-jogador">
                <span class="nome nome-ajusta" title="${G.nomes[i]}"><span class="nome-txt">${nomeCurto(G.nomes[i])}</span> <small class="ranking">${ranking}º</small><i class="indicador-sala ${(G.donos && G.donos[i] && (MP.membros.some(m => m.pid === G.donos[i]) || (G.donos[i] === MP.pid && MP.ativo))) ? 'sala-online' : 'sala-offline'}" data-pid="${(G.donos && G.donos[i]) || ''}" title="${(G.donos && G.donos[i] && (MP.membros.some(m => m.pid === G.donos[i]) || (G.donos[i] === MP.pid && MP.ativo))) ? 'Usuário nesta sala' : 'Máquina ou usuário em outra sala'}" aria-label="${(G.donos && G.donos[i] && (MP.membros.some(m => m.pid === G.donos[i]) || (G.donos[i] === MP.pid && MP.ativo))) ? 'Usuário nesta sala' : 'Máquina ou usuário em outra sala'}"></i></span>
                <span class="tot">Total: ${G.totais[i]}</span>
                <span class="rod">Rodada: ${G.pts[i]}</span>
            </div>`;
        ajustarNomes(box);
        if (G.rodadaEncerrada && i !== 0) {
            const faixa = document.createElement('div'); faixa.className = 'pontos-mao-final';
            G.pegas[i].forEach(c => faixa.appendChild(criarElementoCarta(c, 'carta-ponto-final')));
            box.appendChild(faixa);
        }
    }

    atualizarIndicadoresSala();
    atualizarStatus();
    marcarFalando();
    atualizarBtnFrases();
    agendarDifusao();
    atualizarPausa();
    publicarMesa();
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
// ⭐ Rádio (Souto Pagode) que sempre vem selecionada ao iniciar o jogo
const PREFERIDA = /souto\s*pagode/i;
function fixarPref(lista, gen) {
    if (gen !== 'pagode' && gen !== 'samba') return lista;
    let pref = lista.find(e => PREFERIDA.test(e.nome));
    if (!pref) { try { pref = JSON.parse(localStorage.getItem('radioPrefSouto') || 'null'); } catch (e) {} if (!pref) return lista; }
    else try { localStorage.setItem('radioPrefSouto', JSON.stringify(pref)); } catch (e) {}
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
    const ix = R.lastUrl ? R.est.findIndex(e => e.url === R.lastUrl) : -1;
    if (ix >= 0) s.value = ix;
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
            ...(gen === 'pagode' || gen === 'samba' ? [buscaRB('name=' + encodeURIComponent('Souto Pagode') + '&limit=20'), buscaRB('name=' + encodeURIComponent('Studio Souto') + '&limit=20')] : [])
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
    R.on = true; R.tent = 0; R.dir = 1; marcarBotao(); setR('Procurando rádio…');
    if (!R.est.length) await acharEstacoes();
    // Retoma da rádio em que estávamos (ou da Souto Pagode, se for a primeira vez)
    let ix = R.lastUrl ? R.est.findIndex(e => e.url === R.lastUrl) : -1;
    if (ix < 0) ix = R.est.findIndex(e => PREFERIDA.test(e.nome));
    if (ix >= 0 && PREFERIDA.test(R.est[ix].nome)) bloq.delete(R.est[ix].url);
    if (ix >= 0) bloq.delete(R.est[ix].url);
    R.i = ix >= 0 ? ix - 1 : -1;
    if (R.on) tentarEstacao(1);
}
function tentarEstacao(dir) {
    if (dir === 1 || dir === -1) R.dir = dir; else if (!R.dir) R.dir = 1;
    clearTimeout(R.t); pararSynth();
    if (!R.est.length || R.tent >= Math.min(R.est.length, 8)) return musicaInterna();
    let g = 0; do { R.i = (R.i + R.dir + R.est.length) % R.est.length; g++; } while (bloq.has(R.est[R.i].url) && g < R.est.length);
    R.tent++;
    const e = R.est[R.i];
    R.lastUrl = e.url;
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
$('btnProx').onclick = () => { if (!R.on) return ligarRadio(); if (R.a.paused && R.est[R.i]) bloquear(R.est[R.i].url); R.tent = 0; tentarEstacao(1); };
$('btnAnt').onclick = () => { if (!R.on) return ligarRadio(); R.tent = 0; tentarEstacao(-1); };
const recarregarRadios = async () => {
    generoRadio = $('selGenero').value;
    R.est = []; R.i = -1; R.dir = 1; R.tent = 0; preencherLista();
    if (R.on) { R.a.pause(); setR('Procurando rádio…'); }
    await acharEstacoes();
    if (R.on) tentarEstacao();
};
$('selGenero').onchange = recarregarRadios;
// Ao iniciar o jogo: seleciona a rádio Souto Pagode (e sintoniza, se a rádio já estiver ligada).
async function selecionarRadioInicial() {
    try {
        if (generoRadio !== 'pagode') { $('selGenero').value = 'pagode'; await recarregarRadios(); }
        else if (!R.est.length) await acharEstacoes();
        const ix = R.est.findIndex(e => PREFERIDA.test(e.nome));
        if (ix < 0) return;
        bloq.delete(R.est[ix].url);
        R.lastUrl = R.est[ix].url;
        preencherLista();
        if (R.on) { R.i = ix - 1; R.tent = 0; tentarEstacao(1); }
    } catch (e) {}
}
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
    } else if (document.documentElement.requestFullscreen && confirm('Deseja abrir o jogo em tela cheia?')) {
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
    R.i = i - 1; R.tent = 0; tentarEstacao(1);
};
preencherLista();

// =====================================================================
// ================= MULTIJOGADOR (V20) · SUPABASE + VOZ ================
// =====================================================================
const MSG_CONFIG = 'O Supabase ainda não foi configurado.\nPreencha o arquivo config.js (veja o LEIA-ME).';
const MSG_OFFLINE = 'Servidor indisponível. Verifique sua internet e tente de novo.';
function msgSB() {
    const c = window.MIQ_SUPABASE || {};
    return (!c.url || !c.anonKey || /COLE_AQUI/.test(c.url + c.anonKey)) ? MSG_CONFIG : MSG_OFFLINE;
}
function msgErro(e) {
    const m = String((e && (e.message || e.details || e.hint)) || e || '');
    if (/failed to fetch|networkerror|network request|load failed|timeout|timed out|cannot read prop|is not a function|is not defined|null|undefined|abort/i.test(m)) return MSG_OFFLINE;
    return m.length > 140 ? m.slice(0, 140) + '…' : (m || MSG_OFFLINE);
}
function getSB() {
    if (MP.sb) return MP.sb;
    const c = window.MIQ_SUPABASE || {};
    if (!c.url || !c.anonKey || /COLE_AQUI/.test(c.url + c.anonKey) || !window.supabase) return null;
    MP.sb = window.supabase.createClient(c.url, c.anonKey, { realtime: { params: { eventsPerSecond: 20 }, timeout: 12000, heartbeatIntervalMs: 15000 } });
    return MP.sb;
}
async function rpc(nome, args) {
    const sb = getSB();
    if (!sb) throw new Error(MSG_OFFLINE);
    const { data, error } = await sb.rpc(nome, args || {});
    if (error) throw error;
    return data;
}
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const restante = () => MP.inicio + TEMPO_MISTO - (Date.now() + MP.offset);
const souHost = () => !!MP.membros[0] && MP.membros[0].pid === MP.pid;
const cartaDeId = id => { const [n, v] = id.split('-').map(Number); return { naipe: n, valor: v, id }; };

// ---------- nomes de bar e senha ----------
const BAR_M = { a: ['Bar do', 'Boteco do', 'Buteco do', 'Cantinho do', 'Armazém do', 'Pé-Sujo do', 'Esquina do'],
    b: ['Zé Pinguço', 'Juvenal Cachaça', 'Seu Madruga Fiado', 'Tio Chopp', 'Careca da Saideira', 'Mané Gelada', 'Compadre Torresmo', 'Zeca Birita', 'Tonhão Caipirinha', 'Bêbado Honesto', 'Gordo do Espetinho', 'Cabo Cerveja'] };
const BAR_F = { a: ['Bar da', 'Boteco da', 'Buteco da', 'Tasca da', 'Esquina da', 'Birosca da'],
    b: ['Dona Pinga', 'Tia Saideira', 'Maria Fiado', 'Vovó Cachaça', 'Lurdes Torresmo', 'Neide Petisco', 'Cleide Gelada', 'Zefa Cervejinha', 'Fofoca Quente', 'Saideira Eterna'] };
const sorteia = l => l[Math.floor(Math.random() * l.length)];
function nomeBarAleatorio() { const g = Math.random() < 0.55 ? BAR_M : BAR_F; return `${sorteia(g.a)} ${sorteia(g.b)}`; }
function senhaAleatoria() {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = '';
    for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
}

// ---------- canal em tempo real ----------
async function conectarCanal(canal) {
    const sb = getSB();
    MP.ativo = true; MP.membros = []; MP.naEspera = false; MP.emJogo = false; MP.papel = null;
    let ultimo = null;
    for (let tent = 1; tent <= 3; tent++) {            // Supabase às vezes dá TIMED_OUT: tenta de novo com canal limpo
        const ch = sb.channel('mq-' + canal, { config: { broadcast: { self: false }, presence: { key: MP.pid } } });
        MP.ch = ch;
        ch.on('presence', { event: 'sync' }, () => typeof aoPresenca === 'function' ? aoPresenca() : aoPresencaBase());
        ch.on('broadcast', { event: 'snap' }, ({ payload }) => aoSnap(payload));
        ch.on('broadcast', { event: 'jogar' }, ({ payload }) => aoJogar(payload));
        ch.on('broadcast', { event: 'evt' }, ({ payload }) => aoEvento(payload));
        ch.on('broadcast', { event: 'sig' }, ({ payload }) => aoSinal(payload));
        ch.on('broadcast', { event: 'voz' }, ({ payload }) => setFalando(payload.pid, payload.on));
        try {
            await new Promise((res, rej) => {
                const t = setTimeout(() => rej(new Error('Tempo esgotado ao conectar')), 14000);
                ch.subscribe(st => {
                    if (st === 'SUBSCRIBED') { clearTimeout(t); res(); }
                    else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') { clearTimeout(t); rej(new Error('Falha ao conectar (' + st + ')')); }
                });
            });
            clearInterval(MP.tick); MP.tick = setInterval(tick, 500);
            aoPresenca();
            return;
        } catch (e) {
            ultimo = e;
            try { await sb.removeChannel(ch); } catch (e2) {}
            MP.ch = null;
            if (tent < 3) await new Promise(r => setTimeout(r, 800));
        }
    }
    throw ultimo || new Error('Falha ao conectar');
}
function enviar(event, payload) { if (MP.ch) MP.ch.send({ type: 'broadcast', event, payload }); }
function pingAgora() {
    if (MP.sala && !MP.espectador && getSB()) rpc('ping_sala', { p_canal: MP.sala.canal, p_n: Math.max(1, MP.membros.length) }).catch(() => {});
}
function iniciarPing() {
    clearInterval(MP.tPing);
    MP.tPing = setInterval(pingAgora, 20000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) pingAgora(); });

function aoPresencaBase() {
    if (!MP.ch) return;
    const lista = [];
    Object.values(MP.ch.presenceState()).forEach(arr => { const m = arr[arr.length - 1]; if (m && m.pid && !m.espectador) lista.push(m); });
    lista.sort((a, b) => a.ordem - b.ordem || a.pid.localeCompare(b.pid));
    MP.membros = lista;
    const vivos = new Set(lista.map(m => m.pid));
    [...MP.falando].forEach(p => { if (!vivos.has(p) && p !== MP.pid) MP.falando.delete(p); });
    atualizarCharsOcupados(); atualizarEspera(); atualizarFaixa(); atualizarIndicadoresSala(); sincronizarVoz(); verificarSaidas(); marcarFalando();
}

// Verde somente para quem está presente no canal da mesma sala.
// Personagens controlados pela máquina e jogadores de outras salas ficam vermelhos.
function atualizarIndicadoresSala() {
    const presentes = new Set((MP.ativo ? MP.membros : []).map(m => m.pid).filter(Boolean));
    document.querySelectorAll('.indicador-sala').forEach(ind => {
        const pid = ind.dataset.pid || '';
        const naMesmaSala = !!pid && (presentes.has(pid) || (pid === MP.pid && MP.ativo));
        ind.classList.toggle('sala-online', naMesmaSala);
        ind.classList.toggle('sala-offline', !naMesmaSala);
        ind.title = naMesmaSala ? 'Usuário nesta sala' : 'Máquina ou usuário em outra sala';
    });
}

function atualizarCharsOcupados() {
    const ocup = new Set(MP.membros.filter(m => m.pid !== MP.pid).map(m => m.char));
    document.querySelectorAll('.personagem-card').forEach((c, i) => c.classList.toggle('ocupado', ocup.has(PERSONAGENS[i].id)));
    if (jogadorHumano && ocup.has(jogadorHumano.id) && !MP.naEspera) {
        jogadorHumano = null;
        $('personagemEscolhido').textContent = 'Esse personagem foi escolhido por outro jogador';
        $('btnComecar').disabled = true;
        document.querySelectorAll('.personagem-card').forEach(c => c.classList.remove('escolhido'));
    }
}

function atualizarFaixa() {
    if (MP.modo === 'solo' || !MP.sala) return;
    const n = MP.membros.length, plural = n === 1 ? 'jogador' : 'jogadores';
    let t, pisca = false;
    if (MP.modo === 'misto') {
        const r = restante();
        pisca = r > 0 && !MP.emJogo;
        t = r > 0 ? `🔴 Sala Misto aberta — a partida começa em ${mmss(r)} · ${n} ${plural} dentro` : `🔴 Sala Misto — iniciando… · ${n} ${plural}`;
    } else t = `🍺 ${MP.sala.nome} · ${n} ${plural}`;
    document.querySelectorAll('.faixa-sala').forEach(f => { f.textContent = t; f.classList.toggle('piscando', pisca); });
}

function atualizarEspera() {
    if (!MP.naEspera || !MP.sala) return;
    const sala = MP.modo === 'sala';
    $('esperaTitulo').textContent = sala ? MP.sala.nome : 'Sala Misto';
    $('esperaSenhaLinha').classList.toggle('escondido', !(sala && MP.sala.senha));
    $('esperaSenha').textContent = MP.sala.senha || '';
    $('listaEspera').innerHTML = MP.membros.map((m, i) => {
        const p = PERSONAGENS.find(x => x.id === m.char);
        const nome = (p ? p.nome : '?') + (i === 0 ? ' 👑' : '') + (m.pid === MP.pid ? ' (você)' : '');
        return `<div class="membro"><img data-pid="${m.pid}" src="${p ? p.foto : `fotos/${m.char}.png`}" alt="" onerror="this.onerror=null;this.src='fotos/${m.char}.png'"><span>${nome}</span></div>`;
    }).join('');
    const jogando = MP.membros.some(m => m.jogando);
    const n = MP.membros.length;
    let info;
    if (MP.volta && !MP.emJogo) info = 'Voltando para a partida…';
    else if (jogando && !MP.emJogo) info = 'Essa sala já está com uma partida em andamento.';
    else if (sala) info = `Aguardando jogadores: ${n}/4. A partida começa quando o bar encher (aqui não entram máquinas).`;
    else info = 'Quando o relógio zerar, as máquinas completam a mesa. Se entrarem 4 jogadores, a partida começa na hora, sem máquinas.';
    $('esperaInfo').textContent = (MP.avisoEspera ? MP.avisoEspera + ' ' : '') + info;
    marcarFalando();
}

function vigiarSalaVazia() {
    if (MP.membros.length > 0) { MP.vazioDesde = 0; return; }
    if (Date.now() - (MP.espectadorDesde || 0) < 4000) return;
    if (!MP.vazioDesde) MP.vazioDesde = Date.now();
    if (Date.now() - MP.vazioDesde < 3000) return;
    const c = MP.sala && MP.sala.canal;
    if (c && getSB()) rpc('ping_sala', { p_canal: c, p_n: 0 }).catch(() => {});   // ninguém jogando: zera a sala
    sairParaMenu('telaModo');
    setTimeout(() => alert('Essa sala foi encerrada: ninguém está jogando.'), 50);
}

function tick() {
    if (!MP.ativo) return;
    if (MP.espectador) vigiarSalaVazia();
    atualizarFaixa();
    if (!MP.naEspera || MP.emJogo || MP.membros.some(m => m.jogando) || !souHost()) { MP.cheiaDesde = 0; return; }
    if (MP.membros.length >= 4) {                    // mesa cheia: começa na hora (sem máquinas)
        if (!MP.cheiaDesde) MP.cheiaDesde = Date.now();
        if (Date.now() - MP.cheiaDesde >= 1500) iniciarMP();
        return;
    }
    MP.cheiaDesde = 0;
    if (MP.modo === 'misto' && restante() <= 0) iniciarMP();   // fim dos 2 min: máquinas completam
}

// ================= COLEÇÃO DE ESTAMPAS (persistência por usuário) =================
const ESTAMPAS_KEY = 'copasEstampasDesbloqueadas'; // cache legado/local
const ESTAMPA_ATIVA_KEY = 'copasEstampaAtiva';
let ESTAMPAS_USUARIO = new Set();
let ESTAMPA_ATIVA = 'padrao';
let estampasCarregando = false;
function chaveEstampasLocal() { return `${ESTAMPAS_KEY}:${usuarioAtual?.usuario || 'anon'}`; }
function chaveEstampaAtivaLocal() { return `${ESTAMPA_ATIVA_KEY}:${usuarioAtual?.usuario || 'anon'}`; }
function estampasDesbloqueadas() { return new Set(ESTAMPAS_USUARIO); }
function estampaSelecionada() { return ESTAMPAS_USUARIO.has(Number(ESTAMPA_ATIVA)) || ESTAMPA_ATIVA === 'padrao' ? ESTAMPA_ATIVA : 'padrao'; }
function arquivoEstampa(personagemId) {
    const p = PERSONAGENS.find(x => Number(x.id) === Number(personagemId));
    if (!p) return `${personagemId}.png`;
    const nome = p.fotoNome || (p.foto || '').split('/').pop() || `${personagemId}.png`;
    return nome.replace(/^.*[\\/]/, '').replace(/\.(jpe?g|webp)$/i, '.png');
}
function srcEstampa(personagemId) { return `estampa/${encodeURIComponent(arquivoEstampa(personagemId))}`; }
// V67 — a imagem da estampa pode estar como .png, .jpg, .jpeg ou .webp (qualquer caixa).
// Tenta uma extensão após a outra e memoriza a que funcionou; se nenhuma existir, chama aoFalhar.
const EXT_ESTAMPA = ['png', 'jpg', 'jpeg', 'webp', 'PNG', 'JPG', 'JPEG', 'WEBP'];
const EXT_ESTAMPA_OK = {};
function carregarImagemEstampa(img, personagemId, aoFalhar) {
    const base = arquivoEstampa(personagemId).replace(/\.[^.]+$/, '');
    const url = ext => `estampa/${encodeURIComponent(base)}.${ext}`;
    const memo = EXT_ESTAMPA_OK[base];
    const ordem = memo ? [memo, ...EXT_ESTAMPA.filter(e => e !== memo)] : EXT_ESTAMPA.slice();
    let k = 0;
    img.onerror = () => {
        k++;
        if (k < ordem.length) img.src = url(ordem[k]);
        else { img.onerror = null; if (aoFalhar) aoFalhar(); }
    };
    img.onload = () => { EXT_ESTAMPA_OK[base] = ordem[k]; };
    img.src = url(ordem[0]);
}
function salvarCacheEstampas() {
    try {
        localStorage.setItem(chaveEstampasLocal(), JSON.stringify([...ESTAMPAS_USUARIO]));
        localStorage.setItem(chaveEstampaAtivaLocal(), String(ESTAMPA_ATIVA));
    } catch (e) {}
}
async function carregarEstampasUsuario() {
    if (!usuarioAtual) return;
    estampasCarregando = true;
    try {
        const local = JSON.parse(localStorage.getItem(chaveEstampasLocal()) || '[]');
        ESTAMPAS_USUARIO = new Set((Array.isArray(local) ? local : []).map(Number).filter(Number.isFinite));
        ESTAMPA_ATIVA = localStorage.getItem(chaveEstampaAtivaLocal()) || 'padrao';
    } catch (e) { ESTAMPAS_USUARIO = new Set(); ESTAMPA_ATIVA = 'padrao'; }
    if (getSB() && SES.token) {
        try {
            const r = await rpc('estampas_listar', { p_usuario: usuarioAtual.usuario, p_token: SES.token });
            if (r && r.ok) {
                ESTAMPAS_USUARIO = new Set((r.desbloqueadas || []).map(Number).filter(Number.isFinite));
                ESTAMPA_ATIVA = String(r.ativa || 'padrao');
                salvarCacheEstampas();
            }
        } catch (e) { console.warn('Estampas: usando cache local até sincronizar com o banco.', e); }
    }
    if (getSB() && SES.token && usuarioAtual) {
        try {
            const mr = await rpc('missoes_listar', { p_usuario: usuarioAtual.usuario, p_token: SES.token });
            (mr && mr.desbloqueadas || []).forEach(x => MISSION_UNLOCKS.add(x.missao_id));
            (mr && mr.recompensas || []).forEach(r => { if (Number(r.estampa_id) > 0) ESTAMPAS_USUARIO.add(Number(r.estampa_id)); });
            salvarCacheEstampas();
            salvarMissoesLocais();
        } catch (e) { console.warn('Missões: não foi possível sincronizar agora.', e); }
    }
    if (!ESTAMPAS_USUARIO.has(Number(ESTAMPA_ATIVA)) && ESTAMPA_ATIVA !== 'padrao') ESTAMPA_ATIVA = 'padrao';
    estampasCarregando = false;
}
async function salvarEstampaAtiva(id) {
    ESTAMPA_ATIVA = String(id);
    salvarCacheEstampas();
    if (getSB() && SES.token && usuarioAtual) {
        try { await rpc('estampas_selecionar', { p_usuario: usuarioAtual.usuario, p_token: SES.token, p_personagem: id === 'padrao' ? null : Number(id) }); }
        catch (e) { console.warn('Estampa escolhida ficou salva localmente; sincronização pendente.', e); }
    }
}
async function desbloquearEstampasDosUltimos(d) {
    const maximo = Math.max(...d.totais);
    const novos = [];
    d.totais.forEach((total, i) => {
        if (i > 0 && total === maximo) {
            const id = Number(d.pers[i]);
            if (Number.isFinite(id) && !ESTAMPAS_USUARIO.has(id)) { ESTAMPAS_USUARIO.add(id); novos.push(id); }
        }
    });
    if (!novos.length) return;
    salvarCacheEstampas();
    novos.forEach(conquistaEstampa);
    if (getSB() && SES.token && usuarioAtual) {
        try { await rpc('estampas_desbloquear', { p_usuario: usuarioAtual.usuario, p_token: SES.token, p_personagens: novos }); }
        catch (e) { console.warn('Estampas desbloqueadas no aparelho; sincronização com o banco pendente.', e); }
    }
}
// V82 — amplia a estampa até o tamanho máximo e mantém a visualização aberta.
// O botão X fecha a ampliação; a estampa continua selecionada na coleção.
function pulsarEstampa(origem) {
    document.querySelectorAll('.pulso-estampa, .fechar-pulso-estampa').forEach(x => x.remove());
    const r = origem.getBoundingClientRect();
    if (!r.width || !r.height) return;

    const c = origem.cloneNode(true);
    c.classList.add('pulso-estampa');
    Object.assign(c.style, {
        left: r.left + 'px', top: r.top + 'px',
        width: r.width + 'px', height: r.height + 'px'
    });
    document.body.appendChild(c);

    const maxEsc = Math.min(innerWidth * 0.94 / r.width, innerHeight * 0.94 / r.height);
    const cx = innerWidth / 2 - (r.left + r.width / 2);
    const cy = innerHeight / 2 - (r.top + r.height / 2);
    const transformInicial = 'translate(0,0) scale(1)';
    const transformFinal = `translate(${cx}px,${cy}px) scale(${maxEsc})`;

    const fechar = document.createElement('button');
    fechar.type = 'button';
    fechar.className = 'fechar-pulso-estampa';
    fechar.textContent = '×';
    fechar.setAttribute('aria-label', 'Fechar visualização da estampa');
    document.body.appendChild(fechar);

    let animacao = null;
    let fechando = false;
    const remover = () => {
        c.remove();
        fechar.remove();
    };

    if (c.animate) {
        animacao = c.animate([
            { transform: transformInicial },
            { transform: transformFinal }
        ], { duration: 900, easing: 'ease-out', fill: 'forwards' });
        animacao.onfinish = () => { fechar.classList.add('visivel'); };
    } else {
        c.style.transform = transformFinal;
        fechar.classList.add('visivel');
    }

    fechar.onclick = () => {
        if (fechando) return;
        fechando = true;
        fechar.classList.remove('visivel');
        if (animacao) {
            animacao.reverse();
            animacao.onfinish = remover;
        } else remover();
    };
}
// ================= CONQUISTAS (V90) — aviso estilo "Xbox", só nosso =================
// Aparece quando uma estampa ou um personagem de missão é desbloqueado.
// Várias conquistas ao mesmo tempo entram numa fila e aparecem uma após a outra.
const FILA_CONQUISTAS = [];
let conquistaEmTela = false;
function mostrarConquista(c) {
    FILA_CONQUISTAS.push(c);
    if (!conquistaEmTela) proximaConquista();
}
function proximaConquista() {
    const c = FILA_CONQUISTAS.shift();
    if (!c) { conquistaEmTela = false; return; }
    conquistaEmTela = true;
    let host = document.getElementById('conquistas');
    if (!host) {
        host = document.createElement('div');
        host.id = 'conquistas';
        host.setAttribute('role', 'status');
        host.setAttribute('aria-live', 'polite');
        document.documentElement.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = 'conquista';
    const icone = document.createElement('div'); icone.className = 'conquista-icone';
    const img = document.createElement('img'); img.alt = ''; img.draggable = false;
    icone.appendChild(img);
    const sel = document.createElement('span'); sel.className = 'conquista-selo'; sel.textContent = '🏆';
    icone.appendChild(sel);
    const txt = document.createElement('div'); txt.className = 'conquista-texto';
    const topo = document.createElement('small'); topo.textContent = c.tipo || 'Conquista desbloqueada';
    const nome = document.createElement('strong'); nome.textContent = c.titulo || '';
    const det = document.createElement('span'); det.textContent = c.detalhe || '';
    txt.append(topo, nome); if (c.detalhe) txt.appendChild(det);
    el.append(icone, txt);
    host.appendChild(el);
    if (c.estampaId != null) carregarImagemEstampa(img, c.estampaId, () => { img.onerror = null; img.src = c.imagem || ''; });
    else img.src = c.imagem || '';
    try { SFX.conquista(); } catch (e) {}
    let fechada = false;
    const fechar = () => {
        if (fechada) return; fechada = true;
        el.classList.remove('entrando'); el.classList.add('saindo');
        setTimeout(() => { el.remove(); proximaConquista(); }, 450);
    };
    el.onclick = fechar;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('entrando')));
    setTimeout(fechar, 5200);
}
function nomeDoPersonagemPorId(id) {
    const p = PERSONAGENS.find(x => Number(x.id) === Number(id));
    return p ? p.nome : `Personagem ${id}`;
}
function conquistaEstampa(id) {
    const p = PERSONAGENS.find(x => Number(x.id) === Number(id));
    mostrarConquista({ tipo: 'Estampa desbloqueada', titulo: `Estampa de ${nomeDoPersonagemPorId(id)}`,
        detalhe: 'Disponível na coleção de estampas', estampaId: id, imagem: p ? p.foto : '' });
}

// ================= MISSÕES E RECOMPENSAS (V80) =================
let MISSION_UNLOCKS = new Set();
const MISSION_LOCAL_KEY = 'copasMissoesDesbloqueadas';
function carregarMissoesLocais() {
    try {
        const v = JSON.parse(localStorage.getItem(`${MISSION_LOCAL_KEY}:${usuarioAtual?.usuario || 'anon'}`) || '[]');
        (Array.isArray(v) ? v : []).forEach(id => MISSION_UNLOCKS.add(id));
    } catch (e) { MISSION_UNLOCKS = new Set(); }
}
function salvarMissoesLocais() {
    try { localStorage.setItem(`${MISSION_LOCAL_KEY}:${usuarioAtual?.usuario || 'anon'}`, JSON.stringify([...MISSION_UNLOCKS])); } catch (e) {}
}
async function concluirMissoesDaPartida(d) {
    if (!usuarioAtual || !jogadorHumano || !Array.isArray(window.MISSOES)) return;
    // V99 — confere TODAS as missões ainda não liberadas (duas podem liberar na mesma partida).
    for (const m of window.MISSOES) { if (!MISSION_UNLOCKS.has(m.id)) await concluirUmaMissao(m, d); }
}
async function concluirUmaMissao(missao, d) {
    if (!missao || MISSION_UNLOCKS.has(missao.id)) return;
    const participantes = new Set((d.pers || []).map(Number));
    const requisitos = requisitosDaMissao(missao);
    if (!requisitos.every(id => participantes.has(Number(id)))) return;

    // Objetivo: cada personagem da missão deve terminar na posição indicada em
    // missao.posicoes (1º = menos pontos; empate divide a melhor posição).
    // Missões antigas sem "posicoes" mantêm a regra: não terminar em último.
    const pers = (d.pers || []).map(Number);
    const totais = (d.totais || []).map(Number);
    const posDe = id => { const i = pers.indexOf(Number(id)); return i < 0 ? -1 : 1 + totais.filter(t => t < totais[i]).length; };
    if (missao.terceiro || Array.isArray(missao.condicoes)) {
        if (!condicoesCumpridas(missao, pers, totais, jogadorHumano.id)) return;
    } else if (Array.isArray(missao.posicoes) && missao.posicoes.length === requisitos.length) {
        if (!requisitos.every((id, k) => posDe(id) === Number(missao.posicoes[k]))) return;
    } else {
        const indice = pers.indexOf(Number(jogadorHumano.id));
        if (indice < 0) return;
        if (!(totais[indice] < Math.max(...totais))) return;
    }

    MISSION_UNLOCKS.add(missao.id);
    const recompensa = missao.recompensa || {};
    const estampaNova = !!recompensa.estampaId && !ESTAMPAS_USUARIO.has(Number(recompensa.estampaId));
    if (recompensa.estampaId) ESTAMPAS_USUARIO.add(Number(recompensa.estampaId));
    salvarCacheEstampas();
    mostrarConquista({ tipo: 'Missão concluída', titulo: `${recompensa.nomePersonagem || 'Personagem'} desbloqueado`,
        detalhe: missao.nome, imagem: recompensa.foto || `fotos/${recompensa.personagemId}.png` });
    if (estampaNova) mostrarConquista({ tipo: 'Estampa desbloqueada', titulo: `Estampa de ${recompensa.nomePersonagem || nomeDoPersonagemPorId(recompensa.estampaId)}`,
        detalhe: 'Disponível na coleção de estampas', estampaId: Number(recompensa.estampaId), imagem: recompensa.foto || '' });
    salvarMissoesLocais();
    if (getSB() && SES.token) {
        try {
            await rpc('missoes_concluir', {
                p_usuario: usuarioAtual.usuario, p_token: SES.token,
                p_missao: missao.id,
                p_personagem: Number(recompensa.personagemId || 0),
                p_estampa: Number(recompensa.estampaId || 0)
            });
        } catch (e) { console.warn('Missão concluída localmente; sincronização com o banco pendente.', e); }
    }
    avisoTemp(`🏆 Missão concluída: ${missao.nome}! ${recompensa.nomePersonagem || 'Recompensa'} liberado(a)!`, 6000);
}

function abrirMissoes() {
    carregarMissoesLocais();
    const lista = $('listaMissoes');
    lista.textContent = '';
    (window.MISSOES || []).forEach(m => {
        const concluida = MISSION_UNLOCKS.has(m.id);
        const card = document.createElement('div');
        card.className = 'missao-card';
        const titulo = document.createElement('h3'); titulo.textContent = `${concluida ? '✅' : '🔒'} ${m.nome}`;
        const desc = document.createElement('p'); desc.textContent = m.descricao;
        const premio = document.createElement('p'); premio.textContent = `Recompensa: ${m.recompensa.nomePersonagem} + estampa ${m.recompensa.estampaId}`;
        const status = document.createElement('p'); status.className = 'missao-status' + (concluida ? ' concluida' : '');
        status.textContent = concluida ? 'Missão concluída — recompensa liberada' : 'Ainda não concluída';
        card.append(titulo, desc, premio, status);
        // Só missões que ESTE usuário concluiu têm o botão de ouvir o áudio.
        if (concluida) {
            const r = m.recompensa || {};
            const src = r.audioEntrada || (r.personagemId ? `audio/${r.personagemId}.mp3` : '');
            if (src) {
                const play = document.createElement('button');
                play.type = 'button'; play.className = 'btn-play-missao';
                play.title = 'Ouvir áudio'; play.setAttribute('aria-label', `Ouvir áudio de ${r.nomePersonagem || m.nome}`);
                play.textContent = '▶';
                play.onclick = e => { e.stopPropagation(); abrirEstampaMissao(r, m, src); };
                card.appendChild(play);
            }
        }
        lista.appendChild(card);
    });
    $('telaMissoes').classList.remove('escondido');
}
let audioMissaoAtual = null;
function pararAudioMissao() {
    if (audioMissaoAtual) { try { audioMissaoAtual.pause(); audioMissaoAtual.currentTime = 0; } catch (e) {} }
    audioMissaoAtual = null;
}
function fecharEstampaMissao() {
    pararAudioMissao();
    const v = document.getElementById('visorEstampaMissao');
    if (v) v.remove();
}
// Abre a estampa da missão e toca o áudio; o X fecha a estampa e para o áudio.
function abrirEstampaMissao(r, m, src) {
    fecharEstampaMissao();
    pararAudiosEntrada();
    const v = document.createElement('div'); v.id = 'visorEstampaMissao';
    const x = document.createElement('button'); x.type = 'button'; x.className = 'visor-estampa-x';
    x.setAttribute('aria-label', 'Fechar'); x.textContent = '✕'; x.onclick = fecharEstampaMissao;
    const img = document.createElement('img'); img.alt = r.nomePersonagem || m.nome; img.draggable = false;
    const cap = document.createElement('strong'); cap.textContent = r.nomePersonagem || m.nome;
    v.append(x, img, cap);
    document.body.appendChild(v);
    const id = r.estampaId != null ? r.estampaId : r.personagemId;
    carregarImagemEstampa(img, id, () => { img.onerror = null; img.src = r.foto || r.estampa || ''; });
    const a = new Audio(src);
    audioMissaoAtual = a;
    a.onended = () => { if (audioMissaoAtual === a) audioMissaoAtual = null; };
    a.play().catch(() => {});
}
$('btnModoMissoes').onclick = abrirMissoes;
$('btnFecharMissoes').onclick = () => { fecharEstampaMissao(); $('telaMissoes').classList.add('escondido'); };
$('telaMissoes').addEventListener('click', e => { if (e.target === $('telaMissoes')) { fecharEstampaMissao(); $('telaMissoes').classList.add('escondido'); } });

function abrirColecaoEstampas() {
    const grade = $('gradeEstampas'); grade.textContent = '';
    const itens = [{ id: 'padrao', nome: 'Padrão' }, ...[...estampasDesbloqueadas()].sort((a,b)=>a-b).map(id => ({ id: String(id), nome: (PERSONAGENS.find(p => p.id === id) || {}).nome || `Personagem ${id}` }))];
    const ativa = estampaSelecionada();
    itens.forEach(item => {
        const btn = document.createElement('button'); btn.type = 'button';
        btn.className = 'item-estampa' + (String(item.id) === ativa ? ' selecionada' : '');
        const preview = document.createElement('div'); preview.className = 'preview-estampa';
        if (item.id !== 'padrao') {
            const img = document.createElement('img'); img.alt = ''; img.draggable = false;
            preview.appendChild(img);
            carregarImagemEstampa(img, item.id, () => { img.remove(); preview.classList.add('estampa-padrao-fallback'); });
        } else preview.classList.add('estampa-padrao-fallback');
        const nome = document.createElement('span'); nome.textContent = item.nome;
        btn.append(preview, nome);
        btn.onclick = async () => {
            await salvarEstampaAtiva(item.id);
            document.querySelectorAll('.item-estampa').forEach(x => x.classList.remove('selecionada'));
            btn.classList.add('selecionada');
            pulsarEstampa(preview);
            if (G) render();
        };
        grade.appendChild(btn);
    });
    $('modalEstampas').classList.remove('escondido');
}
$('btnModoEstampas').onclick = abrirColecaoEstampas;
$('btnFecharEstampas').onclick = () => $('modalEstampas').classList.add('escondido');
$('modalEstampas').addEventListener('click', e => { if (e.target === $('modalEstampas')) $('modalEstampas').classList.add('escondido'); });

// ---------- fluxo de telas ----------
$('btnModoSozinho').onclick = () => {
    bloquearOrientacaoRetrato();
    MP.modo = 'solo';
    jogadorHumano = personagemDoUsuario();
    if (!jogadorHumano) { abrirAcesso(); return; }
    iniciarPartida();
};
$('btnModoMisto').onclick = () => { bloquearOrientacaoRetrato(); abrirSalas('misto'); };
$('btnModoSala').onclick = () => { bloquearOrientacaoRetrato(); abrirSalas('sala'); };
$('btnVoltarSalas').onclick = () => { clearInterval(MP.tLista); mostrarTela('telaModo'); };
$('btnSairEspera').onclick = () => sairParaMenu('telaInicial');
$('btnChave').onclick = () => {
    $('nomeSalaTexto').textContent = MP.sala ? MP.sala.nome : '';
    $('senhaTexto').textContent = (MP.sala && MP.sala.senha) || '—';
    $('modalSenha').classList.remove('escondido');
};
$('btnFecharSenha').onclick = () => $('modalSenha').classList.add('escondido');
$('modalSenha').addEventListener('click', e => { if (e.target === $('modalSenha')) $('modalSenha').classList.add('escondido'); });

async function _entrarMisto() {
    if (!getSB()) { alert(msgSB()); return; }
    try {
        const r = await rpc('entrar_misto');
        MP.sala = { id: r.id, canal: r.canal, nome: 'Misto', tipo: 'misto', senha: '' };
        MP.offset = Date.parse(r.agora) - Date.now();
        MP.inicio = Date.parse(r.inicio_em);
        MP.modo = 'misto';
        await conectarCanal(r.canal);
        iniciarPing(); await entrarNaEspera();
    } catch (e) { alert('Não foi possível entrar no modo Misto: ' + msgErro(e)); await sairSala(); MP.modo = 'solo'; abrirSalas('misto'); }
}

let listaModo = 'sala';
async function abrirSalas(modo) {
    if (!getSB()) { alert(msgSB()); return; }
    listaModo = modo === 'misto' ? 'misto' : 'sala';
    const m = listaModo === 'misto';
    $('tituloSalas').textContent = m ? '👥 Salas Misto' : '🍺 Bares abertos';
    $('subSalas').textContent = m ? 'Existe uma única sala Misto. Entre para jogar ou toque em 👁 Assistir.' : 'Toque em um bar para entrar, ou crie o seu. Toque no 👁 para só assistir.';
    $('btnJogarMisto').classList.toggle('escondido', !m);
    $('btnCriarSala').classList.toggle('escondido', m);
    mostrarTela('telaSalas');
    await carregarSalas();
    clearInterval(MP.tLista); MP.tLista = setInterval(carregarSalas, 4000);
}
$('btnJogarMisto').onclick = () => { clearInterval(MP.tLista); entrarMisto(); };
async function carregarSalas() {
    const box = $('listaSalas'), m = listaModo === 'misto';
    try {
        const lista = await rpc(m ? 'listar_mistos' : 'listar_salas');
        if (!lista || !lista.length) { box.innerHTML = '<div class="vazio">' + (m ? 'Nenhuma partida Misto aberta. Toque em Jogar para abrir a sala (inicia em 30 s e as máquinas completam a mesa).' : 'Nenhum bar aberto agora. Crie o primeiro!') + '</div>'; return; }
        box.innerHTML = '';
        lista.forEach((s, k) => {
            const row = document.createElement('div');
            row.className = 'sala-linha';
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sala-item' + (s.status === 'jogando' ? ' jogando' : '') + (!m && s.contagem >= 4 ? ' cheia' : '');
            const n = document.createElement('b'); n.textContent = m ? 'Sala Misto' : s.nome;
            const i = document.createElement('span'); i.textContent = `${m ? '👥' : '🍺'} ${s.contagem}/4${s.status === 'jogando' ? ' · jogando' : ''}`;
            b.append(n, i);
            b.onclick = () => m ? $('btnJogarMisto').click() : entrarNaSala(s);
            const e = document.createElement('button');
            e.type = 'button'; e.className = 'sala-olho'; e.textContent = '👁 Assistir'; e.title = 'Assistir como telespectador';
            e.onclick = () => assistirSala(s, m ? 'misto' : 'sala');
            row.append(b, e);
            box.appendChild(row);
        });
    } catch (e) { box.innerHTML = '<div class="vazio">Erro ao carregar as salas. Verifique a configuração do Supabase.</div>'; }
}
async function _entrarNaSala(s) {
    if (s.contagem >= 4) { alert('Esse bar está lotado (4/4).'); return; }
    try {
        const r = await rpc('entrar_sala_aberta', { p_id: s.id });
        if (!r || r.erro) { alert('Esse bar não existe mais.'); return carregarSalas(); }
        clearInterval(MP.tLista);
        MP.sala = { id: s.id, canal: r.canal, nome: r.nome, tipo: 'sala', senha: '' };
        MP.offset = Date.parse(r.agora) - Date.now(); MP.modo = 'sala';
        await conectarCanal(r.canal);
        iniciarPing(); await entrarNaEspera();
    } catch (e) { alert('Erro ao entrar na sala: ' + msgErro(e)); await sairSala(); MP.modo = 'solo'; abrirSalas('sala'); }
}
async function _criarSala() {
    const nome = nomeBarAleatorio(), senha = '';
    let canalCriado = null;
    try {
        const r = await rpc('criar_sala', { p_nome: nome, p_senha: senha });
        canalCriado = r.canal;
        clearInterval(MP.tLista);
        MP.sala = { id: r.id, canal: r.canal, nome, tipo: 'sala', senha };
        MP.offset = Date.parse(r.agora) - Date.now(); MP.modo = 'sala';
        await conectarCanal(r.canal);
        iniciarPing(); await entrarNaEspera();
    } catch (e) { alert('Erro ao criar a sala: ' + msgErro(e)); if (canalCriado && getSB()) rpc('ping_sala', { p_canal: canalCriado, p_n: 0 }).catch(() => {}); await sairSala(); MP.modo = 'solo'; abrirSalas('sala'); }
}

// V98 — trava anti clique repetido: só uma entrada/criação de sala por vez (e nunca com sala já aberta).
let entrandoSala = false;
function comTrava(fn) {
    return async function (...a) {
        if (entrandoSala || (MP.ch && MP.sala)) return;
        entrandoSala = true;
        const bts = Array.from(document.querySelectorAll('#telaSalas button'));
        const antes = bts.map(b => b.disabled); bts.forEach(b => { b.disabled = true; });
        try { return await fn.apply(this, a); }
        finally { entrandoSala = false; bts.forEach((b, i) => { b.disabled = antes[i]; }); }
    };
}
const entrarMisto = comTrava(_entrarMisto), entrarNaSala = comTrava(_entrarNaSala);
const assistirSala = comTrava(_assistirSala), criarSala = comTrava(_criarSala);
$('btnCriarSala').onclick = () => criarSala();

async function entrarNaEspera() {
    if (MP.espectador) { return entrarNaEsperaEspectador(); }
    jogadorHumano = personagemDoUsuario();
    if (!jogadorHumano || !MP.ch) return;
    await new Promise(r => setTimeout(r, 700));        // deixa a lista de quem já está na sala chegar
    const recusa = async msg => { alert(msg); await sairSala(); MP.modo = 'solo'; mostrarTela('telaModo'); };
    const emJogo = MP.membros.find(m => m.jogando && m.mesa);
    MP.volta = false;
    if (emJogo) {                                   // partida em andamento: só volta quem tem lugar vago na mesa
        const assento = emJogo.mesa.find(a => a.c === jogadorHumano.id && a.h);
        if (!assento || MP.membros.some(m => m.char === jogadorHumano.id)) return recusa('Essa sala já está com partida em andamento. Toque no 👁 para assistir.');
        MP.volta = true;
    } else if (MP.membros.some(m => m.jogando)) return recusa('Essa sala já está com partida em andamento. Toque no 👁 para assistir.');
    if (MP.membros.length >= 4 && !MP.membros.some(m => m.pid === MP.pid)) return recusa('A sala está cheia (4 jogadores).');
    if (MP.membros.some(m => m.char === jogadorHumano.id && m.pid !== MP.pid)) return recusa('Esse usuário já está nesta sala em outro aparelho.');
    MP.naEspera = true; MP.char = jogadorHumano.id; MP.ordem = Date.now() + MP.offset; MP.avisoEspera = '';
    await MP.ch.track(Object.assign({ pid: MP.pid, char: MP.char, ordem: MP.ordem }, MP.volta ? { volta: true } : {}));
    mostrarTela('telaEspera');
    atualizarEspera(); atualizarFaixa();
}

async function sairSala() {
    falarParar();
    Object.keys(VOZ.pcs).forEach(fecharPC);
    clearInterval(MP.tick); clearInterval(MP.tPing); clearInterval(MP.tLista); clearTimeout(MP.tDif); clearTimeout(MP.tSaida);
    MP.tkCli = null; document.body.classList.remove('modo-espectador');
    MP.tSaida = null; MP.gid = null; MP.gidMorto = null; MP.avisoEspera = ''; MP.cheiaDesde = 0;
    MP.ultimoSnap = null; MP.mesaMeta = ''; MP.volta = false;
    $('pausaJogo').classList.add('escondido');
    const ch = MP.ch, sala = MP.sala, restam = MP.membros.filter(m => m.pid !== MP.pid).length;
    const estava = !MP.espectador && MP.membros.some(m => m.pid === MP.pid);   // falha ao conectar não pode apagar a sala dos outros
    MP.ch = null; MP.ativo = false; MP.emJogo = false; MP.papel = null; MP.naEspera = false;
    MP.membros = []; MP.falando.clear(); MP.sala = null; MP.ultimo = ''; MP.tDif = null; MP.espectador = false;
    $('btnChave').classList.add('escondido');
    if (ch) { try { await ch.untrack(); } catch (e) {} try { getSB().removeChannel(ch); } catch (e) {} }
    if (sala && estava && getSB()) rpc('ping_sala', { p_canal: sala.canal, p_n: restam }).catch(() => {});
}
function sairParaMenu(destino) {
    if (G && G.timer) clearTimeout(G.timer);
    if (G && G.tAuto) clearTimeout(G.tAuto);
    if (G && G.tk) G.tk.pular = true;
    ocultarPalco();
    pararAudiosEntrada();
    sairSala();
    G = null; jogadorHumano = null; cartaSelecionadaId = null; MP.modo = 'solo';
    maquinasEliminadas = []; filaMaquinas = [];
    ultimoCliqueCarta = { id: null, tempo: 0 };
    $('modalRanking').classList.add('escondido'); $('modal').classList.add('escondido'); $('modalSenha').classList.add('escondido');
    $('btnFrases').classList.add('escondido'); fecharPainelFrases();
    $('pausaJogo').classList.add('escondido');
    mostrarTela(destino || 'telaModo');
    if (destino === 'telaInicial') pararIntro();
}
function sairDoBar() {
    if (!confirm('Sair do bar e voltar ao início?')) return;
    sairParaMenu('telaInicial');
}

// Sala (sem máquinas): se alguém sai no meio da partida, todos voltam à espera do bar até completar 4.
function voltarParaEspera(msg) {
    if (G && G.timer) clearTimeout(G.timer);
    if (G && G.tAuto) clearTimeout(G.tAuto);
    if (G && G.tk) G.tk.pular = true;
    ocultarPalco();
    pararAudiosEntrada();
    clearTimeout(MP.tDif); MP.tDif = null; MP.ultimo = '';
    MP.gidMorto = G ? G.gid : null;
    G = null; cartaSelecionadaId = null;
    MP.emJogo = false; MP.papel = null; MP.naEspera = true; MP.cheiaDesde = 0; MP.avisoEspera = msg || '';
    $('modal').classList.add('escondido'); $('modalRanking').classList.add('escondido');
    if (MP.ch) MP.ch.track({ pid: MP.pid, char: MP.char, ordem: MP.ordem }).catch(() => {});
    if (MP.sala && getSB()) rpc('marcar_espera', { p_canal: MP.sala.canal }).catch(() => {});
    mostrarTela('telaEspera');
    atualizarEspera(); atualizarFaixa();
}

const souPrimeiroDaMesa = () => {
    const sentados = new Set((G && G.donos) || []);
    const m = MP.membros.find(x => sentados.has(x.pid));
    return !!m && m.pid === MP.pid;
};

// Publica na presença quem está sentado na mesa (permite que um jogador volte ao lugar vago).
function publicarMesa() {
    if (!MP.ch || !G || !MP.emJogo || !G.personagens) return;
    const mesa = G.personagens.map((p, i) => ({ c: p.id, h: !!G.humanos[i] }));
    const txt = JSON.stringify(mesa);
    if (txt === MP.mesaMeta) return;
    MP.mesaMeta = txt;
    MP.ch.track({ pid: MP.pid, char: MP.char, ordem: MP.ordem, jogando: true, mesa }).catch(() => {});
}

function atualizarPausa() {
    const el = $('pausaJogo');
    const vagos = (MP.emJogo && G && G.vago) ? G.vago.map((v, i) => v ? i : -1).filter(i => i >= 0) : [];
    if (!vagos.length) { el.classList.add('escondido'); return; }
    $('pausaTexto').textContent = `⏸ Aguardando ${vagos.map(i => G.nomes[i]).join(' e ')} voltar…`;
    const maquinas = G.humanos.filter(x => !x).length;
    $('btnAddMaquina').classList.toggle('escondido', !(MP.papel === 'host' && maquinas < 3 && G.fila && G.fila.length));
    el.classList.remove('escondido');
}

// Retoma o andamento depois que um lugar vago foi preenchido (jogador voltou ou entrou máquina).
function retomar() {
    if (!G || G.rodadaEncerrada || G.ocupado || G.distribuindo || G.mesa.length >= 4) { render(); return; }
    if (G.vago && G.vago[G.turno]) { render(); return; }
    agendar();
}

// O primeiro jogador presente coloca uma máquina no lugar de quem saiu (a partida deixa de valer para o ranking).
function adicionarMaquina() {
    if (!G || MP.papel !== 'host') return;
    const s = G.vago.findIndex(Boolean);
    if (s < 0 || G.humanos.filter(x => !x).length >= 3 || !G.fila.length) return;
    const nova = G.fila.shift();
    nova.total = G.personagens[s].total;           // a máquina continua com a pontuação do lugar
    G.personagens[s] = nova; G.nomes[s] = nova.nome;
    G.humanos[s] = false; G.donos[s] = null; G.vago[s] = false;
    G.participantes.add(nova);
    G.totais = G.personagens.map(p => p.total);
    MP.mesaMeta = '';
    retomar();
}
$('btnAddMaquina').onclick = adicionarMaquina;

// Anfitrião: quem voltou à sala reassume o seu lugar vago.
function reassentarVoltas(vivos) {
    MP.membros.filter(m => m.volta && !G.donos.includes(m.pid)).forEach(m => {
        const s = G.personagens.findIndex((p, i) => p.id === m.char && G.humanos[i] && (!G.donos[i] || !vivos.has(G.donos[i])));
        if (s < 0) return;
        G.donos[s] = m.pid; G.vago[s] = false;
        MP.mesaMeta = '';
        retomar();
    });
}

// O próximo jogador da mesa assume o comando da partida usando a cópia do estado.
function promoverParaHost() {
    const P = MP.ultimoSnap;
    if (!P || !P.bk || !G || MP.papel !== 'cliente') return false;
    const { s, bk } = P;
    const eu = s.do.indexOf(MP.pid);
    if (eu < 0) return false;
    const rot = a => [0, 1, 2, 3].map(v => a[(v + eu) % 4]);
    const v = i => (i - eu + 4) % 4;
    const acha = id => PERSONAGENS.find(p => p.id === id);
    const pers = rot(s.pe).map(acha), totais = rot(s.to);
    pers.forEach((p, i) => { p.total = totais[i]; });
    const fila = bk.fl.map(acha).filter(Boolean);
    const g = {
        nomes: rot(s.no), personagens: pers, totais, pts: rot(s.pt), turno: v(s.t), ocupado: s.oc,
        distribuindo: false, distMsg: '', recebidas: [13, 13, 13, 13], rodadaEncerrada: s.re,
        mesa: s.me.map(([j, c]) => ({ jogador: v(j), carta: cartaDeId(c) })), lider: s.li, quebrada: s.qb, vazas: s.vz,
        maos: rot(bk.H).map(a => a.map(cartaDeId)), pegas: rot(s.pg).map(a => a.map(cartaDeId)),
        aviso: '', carteador: v(s.ca), rodada: s.r, venc: s.vc == null ? null : v(s.vc),
        humanos: rot(s.ho), donos: rot(s.do), hostPid: MP.pid, gid: s.g || null, virarMao: false,
        renunciou: rot(bk.rn), jogadas: Uint8Array.from(bk.jg), vazios: rot(bk.vz), fila,
        participantes: new Set([...pers, ...fila]), vago: rot(s.vg || [false, false, false, false]),
        nivel: bk.ni || nivelIA, luaConquistada: G.luaConquistada, renunciaConquistada: G.renunciaConquistada,
        timer: null, tk: { pular: true, acordar: null }, avisoAte: 0
    };
    filaMaquinas = fila;
    maquinasEliminadas = (bk.me || []).map(acha).filter(Boolean);
    G = g; MP.papel = 'host'; MP.ultimo = ''; MP.mesaMeta = '';
    render();
    // continua do ponto em que o antigo anfitrião parou
    if (g.rodadaEncerrada) {
        const d = MP.ultimoD;
        const saindo = [];
        if (d && d.fim) for (let i = 0; i < 4; i++) if (!g.humanos[i] && g.personagens[i].total >= LIMITE) saindo.push(i);
        if (d) mostrarModalFim(d, criarAvancar(!!d.fim, saindo));
        else { $('modal').classList.remove('escondido'); criarAvancar(false, [])(); }
    } else if (g.renunciou.some(Boolean) && g.ocupado) {
        g.timer = setTimeout(fimRodada, 1200);
    } else if (g.mesa.length === 4) {
        if (g.venc != null) {
            const w = g.venc;
            g.timer = setTimeout(() => {
                G.mesa = []; G.venc = null; G.lider = null; G.ocupado = false; G.aviso = '';
                for (let i = 0; i < 4; i++) $(`carta-${i}`).innerHTML = '';
                G.turno = w;
                if (G.vazas === 13) fimRodada(); else agendar();
            }, 600);
        } else { g.ocupado = true; g.timer = setTimeout(resolverVaza, 600); }
    } else { g.ocupado = false; agendar(); }
    return true;
}

function verificarSaidas() {
    if (!MP.emJogo || !G) return;
    const vivos = new Set(MP.membros.map(m => m.pid));
    if (MP.modo === 'sala') {
        // Sala (só jogadores): se alguém sai, a partida PARA e espera a pessoa voltar.
        if (MP.papel === 'host') {
            reassentarVoltas(vivos);
            let mudou = false;
            G.donos.forEach((pid, i) => { if (G.humanos[i] && pid && vivos.has(pid) && G.vago[i]) { G.vago[i] = false; mudou = true; } });
            if (mudou) retomar();
            const novos = G.donos.some((pid, i) => G.humanos[i] && pid && !vivos.has(pid) && !G.vago[i]);
            if (novos && !MP.tSaida) {
                MP.tSaida = setTimeout(() => {          // 3 s de tolerância para oscilações de conexão
                    MP.tSaida = null;
                    if (!G || MP.papel !== 'host') return;
                    const v2 = new Set(MP.membros.map(m => m.pid));
                    let m2 = false;
                    G.donos.forEach((pid, i) => { if (G.humanos[i] && pid && !v2.has(pid) && !G.vago[i]) { G.vago[i] = true; m2 = true; } });
                    if (m2) render();
                }, 3000);
            }
        } else if (G.hostPid && !vivos.has(G.hostPid)) {
            if (!MP.tSaida) MP.tSaida = setTimeout(() => {
                MP.tSaida = null;
                if (!G || MP.papel !== 'cliente') return;
                const v2 = new Set(MP.membros.map(m => m.pid));
                if (!v2.has(G.hostPid) && souPrimeiroDaMesa()) promoverParaHost();
            }, 3000);
        }
        return;
    }
    if (MP.papel === 'cliente') {
        if (G.hostPid && !vivos.has(G.hostPid)) { alert('O anfitrião saiu da sala. A partida foi encerrada.'); sairParaMenu('telaModo'); }
        return;
    }
    G.donos.forEach((pid, i) => {
        if (pid && pid !== MP.pid && !vivos.has(pid) && G.humanos[i]) {
            G.humanos[i] = false;           // no Misto, quem saiu é substituído por uma máquina
            if (G.turno === i && !G.ocupado && !G.distribuindo && G.mesa.length < 4) agendar();
        }
    });
}

// ---------- início da partida multijogador (anfitrião) ----------
function iniciarMP() {
    if (MP.emJogo || !souHost()) return;
    const humanos = MP.membros.map(m => ({ pid: m.pid, p: PERSONAGENS.find(x => x.id === m.char) })).filter(h => h.p).slice(0, 4);
    if (!humanos.length) return;
    MP.emJogo = true; MP.papel = 'host'; MP.avisoEspera = '';
    MP.gid = Math.random().toString(36).slice(2, 9);
    jogadorHumano = humanos[0].p;
    if (MP.modo === 'misto' && humanos.length === 4) {
        // Misto cheio migra para o modo Sala: ganha nome e senha e passa a não aceitar máquinas.
        const nome = nomeBarAleatorio(), senha = '';
        MP.modo = 'sala'; MP.sala.tipo = 'sala'; MP.sala.nome = nome; MP.sala.senha = senha;
        enviar('evt', { t: 'sala', nome, senha });
        if (getSB()) rpc('migrar_para_sala', { p_canal: MP.sala.canal, p_nome: nome, p_senha: senha }).catch(() => {});
    }
    MP.mesaMeta = '';
    if (getSB()) rpc('marcar_jogando', { p_canal: MP.sala.canal }).catch(() => {});
    iniciarPartida(humanos);
}

// ---------- sincronização do estado ----------
function agendarDifusao() {
    if (!(MP.emJogo && MP.papel === 'host') || MP.tDif) return;
    MP.tDif = setTimeout(() => { MP.tDif = null; difundir(); }, 100);
}
function difundir() {
    if (!G || !MP.ch || !MP.emJogo) return;
    const s = {
        r: G.rodada, t: G.turno, oc: G.ocupado, di: G.distribuindo, dm: G.distMsg, rc: G.recebidas, re: G.rodadaEncerrada,
        me: G.mesa.map(j => [j.jogador, j.carta.id]), li: G.lider, qb: G.quebrada, vz: G.vazas, pt: G.pts,
        to: G.personagens.map(p => p.total), no: G.nomes, pe: G.personagens.map(p => p.id),
        pg: G.pegas.map(a => a.map(c => c.id)), av: /renunciou/.test(G.aviso) ? G.aviso : '',
        ca: G.carteador, vc: G.venc == null ? null : G.venc, ho: G.humanos, do: G.donos, g: G.gid || null, vg: G.vago
    };
    const maos = {};
    G.donos.forEach((pid, i) => { if (pid && pid !== MP.pid) maos[pid] = G.maos[i].map(c => c.id); });
    // cópia completa do jogo: se o anfitrião sair, o próximo jogador da mesa assume a partida com ela
    const bk = {
        H: G.maos.map(m => m.map(c => c.id)), rn: G.renunciou, jg: Array.from(G.jogadas), vz: G.vazios,
        fl: G.fila.map(p => p.id), me: maquinasEliminadas.map(p => p.id), ni: G.nivel
    };
    const payload = { s, maos, bk };
    const txt = JSON.stringify(payload);
    if (txt === MP.ultimo) return;
    MP.ultimo = txt;
    enviar('snap', payload);
}

function aoSnap(payload) {
    const { s, maos } = payload;
    if (MP.papel === 'host' || !MP.ch) return;
    if (s.g && s.g === MP.gidMorto) return;           // sobra de uma partida já encerrada
    // Spectator: não está sentado, mas pode ver o estado completo
    if (MP.espectador) { aoSnapEspectador(payload); return; }
    const eu = s.do.indexOf(MP.pid);
    if (eu < 0) return;                      // não está sentado nesta partida
    MP.eu = eu;
    MP.ultimoSnap = payload;
    const rot = a => [0, 1, 2, 3].map(v => a[(v + eu) % 4]);
    const v = i => (i - eu + 4) % 4;
    const ant = MP.emJogo ? G : null;
    const g = {
        nomes: rot(s.no), personagens: rot(s.pe).map(id => PERSONAGENS.find(p => p.id === id)), totais: rot(s.to), pts: rot(s.pt),
        turno: v(s.t), ocupado: s.oc, distribuindo: s.di, distMsg: s.dm, recebidas: rot(s.rc), rodadaEncerrada: s.re,
        mesa: s.me.map(([j, c]) => ({ jogador: v(j), carta: cartaDeId(c) })), lider: s.li, quebrada: s.qb, vazas: s.vz,
        maos: [(maos[MP.pid] || []).map(cartaDeId), [], [], []], pegas: rot(s.pg).map(a => a.map(cartaDeId)),
        aviso: s.av || '', carteador: v(s.ca), rodada: s.r, venc: s.vc == null ? null : v(s.vc),
        humanos: rot(s.ho), donos: rot(s.do), hostPid: s.do[0], virarMao: false, gid: s.g || null,
        luaConquistada: ant ? ant.luaConquistada : false, renunciaConquistada: ant ? ant.renunciaConquistada : false,
        avisoAte: 0, rodadaAnterior: ant ? ant.rodada : 0,
        vago: rot(s.vg || [false, false, false, false])
    };
    if (ant && ant.avisoAte > Date.now() && !g.aviso) { g.aviso = ant.aviso; g.avisoAte = ant.avisoAte; }
    g.personagens.forEach((p, i) => { p.total = g.totais[i]; });
    g.distMsg = legendaCliente(g, true);
    if (ant && ant.distribuindo && !g.distribuindo && !reduzMovimento()) g.virarMao = true;
    const primeira = !MP.emJogo;
    if (primeira) {
        MP.emJogo = true; MP.papel = 'cliente'; MP.naEspera = false; MP.avisoEspera = ''; MP.volta = false; MP.mesaMeta = '';
        const eu0 = g.personagens[0]; if (eu0) jogadorHumano = eu0;
        mostrarTela('jogo'); pararIntro();
        $('btnChave').classList.add('escondido');
        G = g; render(); ajustarEscala(); selecionarRadioInicial();
    }
    const eraEncerrada = ant && ant.rodadaEncerrada;
    G = g;
    render();
    g.virarMao = false;
    sincronizarMesaCliente();
    if (!ant || ant.rodada !== g.rodada) { frasesUsadas = 0; atualizarBtnFrases(); }   // 3 frases por rodada
    animBaralhoCliente(ant, g);
    if (eraEncerrada && !g.rodadaEncerrada) $('modal').classList.add('escondido');
}

function sincronizarMesaCliente() {
    for (let i = 0; i < 4; i++) {
        const el = $(`carta-${i}`), entrada = G.mesa.find(j => j.jogador === i);
        const atual = el.firstChild;
        if (entrada) {
            if (!atual || atual.dataset.id !== entrada.carta.id) {
                el.innerHTML = '';
                const e = criarElementoCarta(entrada.carta, 'jogada' + (G.mesa[0] === entrada ? ' carta-lider' : ''));
                e.dataset.id = entrada.carta.id;
                el.appendChild(e);
                animarEntrada(e, i, null);
                SFX.jogar();
                if (ehDama(entrada.carta)) { mostrarQ(); tocarAudioDama(); }
            }
            const alvo = el.firstChild;
            if (alvo) alvo.classList.toggle('carta-vencedora', G.venc === i);
        } else if (atual && !G.varrendo) el.innerHTML = '';
    }
}

function aoEvento(p) {
    if (p.t === 'sala') {     // Misto cheio virou Sala
        MP.modo = 'sala';
        if (MP.sala) { MP.sala.tipo = 'sala'; MP.sala.nome = p.nome; MP.sala.senha = p.senha; }
        return;
    }
    if (MP.papel !== 'cliente' || !G) return;
    if (p.t === 'varrer') {
        G.varrendo = true; setTimeout(() => { if (G) G.varrendo = false; }, 450);
        varrerVaza((p.w - MP.eu + 4) % 4);
    } else if (p.t === 'aviso') avisoTemp(p.m, p.ms);
    else if (p.t === 'modal') { MP.ultimoD = p.d; aplicarFim(p.d); mostrarModalFim(p.d, null); }
}

function aoJogar({ pid, c }) {
    if (MP.papel !== 'host' || !G) return;
    const s = G.donos.indexOf(pid);
    if (s < 1 || !G.humanos[s] || (G.vago && G.vago[s])) return;
    if (G.distribuindo || G.turno !== s || G.ocupado || G.mesa.length === 4) return;
    const carta = G.maos[s].find(x => x.id === c);
    if (!carta) return;
    const erro = validar(s, carta);
    const renuncia = G.mesa.length > 0 && carta.naipe !== G.lider && G.maos[s].some(x => x.naipe === G.lider);
    if (erro && !renuncia) return;
    clearTimeout(G.timer);
    jogar(s, carta);
}

// =====================================================================
// ======================= VOZ (WebRTC ponto a ponto) ===================
// O áudio vai direto entre os jogadores (nada é gravado nem passa pelo banco).
// O Supabase só leva os "recados" para conectar (sinalização).
// =====================================================================
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
const sinal = (para, tipo, dados) => enviar('sig', { de: MP.pid, para, tipo, dados });

function sincronizarVoz() {
    if (!MP.ativo || !window.RTCPeerConnection) return;
    const ids = new Set(MP.membros.map(m => m.pid).filter(p => p !== MP.pid));
    ids.forEach(pid => { if (!VOZ.pcs[pid] && MP.pid < pid) abrirPC(pid, true); });
    Object.keys(VOZ.pcs).forEach(pid => { if (!ids.has(pid)) fecharPC(pid); });
}
function fecharPC(pid) {
    const o = VOZ.pcs[pid]; if (!o) return;
    try { o.pc.close(); } catch (e) {}
    if (o.aud) { o.aud.srcObject = null; o.aud.remove(); }
    delete VOZ.pcs[pid];
}
function abrirPC(pid, iniciar) {
    if (VOZ.pcs[pid]) return VOZ.pcs[pid];
    const pc = new RTCPeerConnection(ICE);
    const o = { pc, sender: null, fila: [], aud: null };
    VOZ.pcs[pid] = o;
    if (iniciar) o.sender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender;
    pc.onicecandidate = e => { if (e.candidate) sinal(pid, 'ice', e.candidate.toJSON()); };
    pc.ontrack = e => {
        if (!o.aud) { o.aud = document.createElement('audio'); o.aud.autoplay = true; o.aud.playsInline = true; document.body.appendChild(o.aud); }
        o.aud.srcObject = e.streams[0] || new MediaStream([e.track]);
        o.aud.play().catch(() => {});
    };
    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' && VOZ.pcs[pid] === o) {
            fecharPC(pid);
            if (MP.pid < pid) setTimeout(sincronizarVoz, 1500);
        }
    };
    if (iniciar) {
        pc.createOffer().then(of => pc.setLocalDescription(of))
            .then(() => sinal(pid, 'offer', { type: pc.localDescription.type, sdp: pc.localDescription.sdp })).catch(() => {});
    }
    if (VOZ.mic && o.sender) o.sender.replaceTrack(VOZ.mic.getAudioTracks()[0]).catch(() => {});
    return o;
}
async function aoSinal({ de, para, tipo, dados }) {
    if (para !== MP.pid || !window.RTCPeerConnection) return;
    try {
        if (tipo === 'offer') {
            fecharPC(de);
            const o = abrirPC(de, false);
            await o.pc.setRemoteDescription(dados);
            const t = o.pc.getTransceivers().find(x => x.receiver && x.receiver.track && x.receiver.track.kind === 'audio');
            if (t) { t.direction = 'sendrecv'; o.sender = t.sender; }
            o.fila.splice(0).forEach(c => o.pc.addIceCandidate(c).catch(() => {}));
            const resp = await o.pc.createAnswer();
            await o.pc.setLocalDescription(resp);
            sinal(de, 'answer', { type: resp.type, sdp: resp.sdp });
            if (VOZ.mic && o.sender) o.sender.replaceTrack(VOZ.mic.getAudioTracks()[0]).catch(() => {});
        } else if (tipo === 'answer') {
            const o = VOZ.pcs[de]; if (!o) return;
            await o.pc.setRemoteDescription(dados);
            o.fila.splice(0).forEach(c => o.pc.addIceCandidate(c).catch(() => {}));
        } else if (tipo === 'ice') {
            const o = VOZ.pcs[de]; if (!o) return;
            if (o.pc.remoteDescription) await o.pc.addIceCandidate(dados).catch(() => {}); else o.fila.push(dados);
        }
    } catch (e) { console.warn('Voz:', e); }
}

function setFalando(pid, on) { if (on) MP.falando.add(pid); else MP.falando.delete(pid); marcarFalando(); }
function marcarFalando() {
    if (MP.modo === 'solo' && !MP.ativo) { const im = document.querySelector('#j0 img'); if (im) im.classList.toggle('falando', !!VOZ.ativo); }
    document.querySelectorAll('img[data-pid]').forEach(el => el.classList.toggle('falando', !!el.dataset.pid && MP.falando.has(el.dataset.pid)));
}

// Bip estilo rádio Nextel (trinado curto e agudo) ao abrir o áudio, só para sinalizar o início.
let _ctxBip = null;
let _bufFim = null, _bufFimCarregando = false;
// Nextel2 (fim do áudio) tocado pelo Web Audio: mais confiável que <audio> logo depois de soltar o microfone no celular
function carregarBufFim() {
    if (_bufFim || _bufFimCarregando || !_ctxBip) return;
    _bufFimCarregando = true;
    fetch('audio/Nextel2.mp3').then(r => r.arrayBuffer()).then(ab => new Promise((ok, no) => _ctxBip.decodeAudioData(ab, ok, no)))
        .then(b => { _bufFim = b; }).catch(() => { _bufFimCarregando = false; });
}
function tocarFimWebAudio() {
    if (!_ctxBip || !_bufFim) return false;
    try {
        if (_ctxBip.state === 'suspended') _ctxBip.resume().catch(() => {});
        const src = _ctxBip.createBufferSource(), g = _ctxBip.createGain();
        src.buffer = _bufFim; g.gain.value = 1; src.connect(g); g.connect(_ctxBip.destination); src.start(0);
        return true;
    } catch (e) { return false; }
}
// O navegador só libera som depois de um toque/clique: cria e destrava o contexto no primeiro gesto.
['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(ev => window.addEventListener(ev, () => {
    try {
        if (!_ctxBip) _ctxBip = new (window.AudioContext || window.webkitAudioContext)();
        if (_ctxBip.state === 'suspended') _ctxBip.resume().catch(() => {});
        carregarBufFim();
    } catch (e) {}
    if (!window._bipsLiberados) {   // destrava os dois bips no primeiro toque (o navegador só deixa tocar depois de um gesto)
        window._bipsLiberados = true;
        [_audioBipIni, _audioBipFim].forEach(a => { try { a.muted = true; const p = a.play(); const f = () => { a.pause(); a.currentTime = 0; a.muted = false; }; if (p && p.then) p.then(f).catch(() => { a.muted = false; window._bipsLiberados = false; }); else f(); } catch (e) { a.muted = false; } });
    }
}, { capture: true, passive: true }));
// Bips do rádio (pasta "audio"): Nextel1.mp3 ao iniciar o áudio, Nextel2.mp3 ao terminar.
// Valem para segurar/soltar a tela e para o botão de microfone (iniciar/parar). Atenção às maiúsculas nos nomes.
const BIP_INICIO_ARQUIVO = 'audio/Nextel1.mp3';
const BIP_FIM_ARQUIVO = 'audio/Nextel2.mp3';
const _audioBipIni = new Audio(BIP_INICIO_ARQUIVO), _audioBipFim = new Audio(BIP_FIM_ARQUIVO);
[_audioBipIni, _audioBipFim].forEach(a => { a.preload = 'auto'; a.volume = 1; });
function tocarBip(a, tentativa = 0) { try { a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => { if (tentativa < 2) setTimeout(() => tocarBip(a, tentativa + 1), 250); }); } catch (e) {} }
function bipNextel() { tocarBip(_audioBipIni); }       // início do áudio
function bipNextelFim() { setTimeout(() => { if (!tocarFimWebAudio()) tocarBip(_audioBipFim); }, 300); }   // espera o celular largar o microfone, senão o som do bip é cortado    // fim do áudio
const vozPermitida = () => MP.ativo || (MP.modo === 'solo' && !!G);   // Sozinho: abre o mic mesmo sem ninguém ouvir
async function falarIniciar() {
    if (!vozPermitida() || VOZ.ativo) return;
    bipNextel();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert('Seu navegador não permite usar o microfone aqui (é preciso HTTPS).'); return; }
    VOZ.ativo = true;
    const tk = ++VOZ.token;
    setFalando(MP.pid, true); if (MP.ativo) enviar('voz', { pid: MP.pid, on: true });
    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
        if (VOZ.token === tk) { VOZ.ativo = false; setFalando(MP.pid, false); if (MP.ativo) enviar('voz', { pid: MP.pid, on: false }); }
        if (!VOZ.negado) { VOZ.negado = true; alert('Permita o acesso ao microfone para falar com a sala.'); }
        return;
    }
    if (!VOZ.ativo || VOZ.token !== tk) { stream.getTracks().forEach(t => t.stop()); return; }   // soltou antes de abrir
    VOZ.mic = stream;
    const trilha = stream.getAudioTracks()[0];
    Object.values(VOZ.pcs).forEach(o => { if (o.sender) o.sender.replaceTrack(trilha).catch(() => {}); });
}
function falarParar() {
    if (!VOZ.ativo) return;
    VOZ.ativo = false; VOZ.token++;
    if (VOZ.mic) { VOZ.mic.getTracks().forEach(t => t.stop()); VOZ.mic = null; }
    Object.values(VOZ.pcs).forEach(o => { if (o.sender) o.sender.replaceTrack(null).catch(() => {}); });
    bipNextelFim();
    setFalando(MP.pid, false); if (MP.ativo) enviar('voz', { pid: MP.pid, on: false });
}
// Botão de microfone (topo): um toque abre o áudio e fica aberto; outro toque fecha.
function marcarMic() { const b = $('btnMic'); if (!b) return; const on = VOZ.ativo && VOZ.fonte === 'botao'; b.classList.toggle('ligado', on); b.setAttribute('aria-pressed', String(on)); b.title = on ? 'Fechar o microfone' : 'Abrir o microfone (fica aberto até tocar de novo)'; }
$('btnMic').onclick = () => {
    if (!vozPermitida()) { alert('O microfone só funciona durante uma partida.'); return; }
    if (VOZ.ativo && VOZ.fonte === 'botao') falarParar();
    else if (!VOZ.ativo) { VOZ.fonte = 'botao'; falarIniciar(); }
    marcarMic(); setTimeout(marcarMic, 400);
};
setInterval(marcarMic, 700);
// Modo cartas coloridas (Ouros dourado, Paus verde); preferência guardada neste aparelho.
function marcarCores() {
    const on = document.body.classList.contains('cartas-coloridas'), b = $('btnCores');
    b.classList.toggle('preto-vermelho', on); b.setAttribute('aria-pressed', String(on));
    b.innerHTML = on ? '<span class="nv">♠</span><span class="nr">♥</span>' : '<span class="c1">♠</span><span class="c2">♥</span><span class="c3">♦</span><span class="c4">♣</span>';
    b.title = on ? 'Voltar às cores normais (preto/vermelho)' : 'Cartas coloridas';
}
$('btnCores').onclick = () => {
    document.body.classList.toggle('cartas-coloridas');
    try { localStorage.setItem('copasCartasColoridas', document.body.classList.contains('cartas-coloridas') ? '1' : '0'); } catch (e) {}
    marcarCores();
};
try { if (localStorage.getItem('copasCartasColoridas') === '1') document.body.classList.add('cartas-coloridas'); } catch (e) {}
marcarCores();
const suprimirCliques = () => { VOZ.semClique = Date.now() + 500; };
window.addEventListener('click', e => { if (Date.now() < VOZ.semClique) { e.stopPropagation(); e.preventDefault(); } }, true);

// PC: segurar o botão ESQUERDO e o DIREITO do mouse ao mesmo tempo
let cliqueVoz = null;
function cancelarCliqueVoz() { if (cliqueVoz) { clearTimeout(cliqueVoz.tm); cliqueVoz = null; } }
const mouseDeVerdade = e => !(e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents);
const dentroDoChat = e => !!(e.target && e.target.closest && e.target.closest('#painelChat, #btnChat, #btnMic, #btnCores'));
window.addEventListener('mousedown', e => {
    if (!vozPermitida() || !mouseDeVerdade(e) || dentroDoChat(e)) return;
    if (e.buttons === 3) { cancelarCliqueVoz(); VOZ.fonte = 'mouse'; falarIniciar(); return; }   // esquerdo + direito
    if (e.button === 0 && e.buttons === 1) {                                                      // esquerdo segurado por 1 s
        cancelarCliqueVoz();
        const o = { x: e.clientX, y: e.clientY, ativo: false };
        o.tm = setTimeout(() => { o.ativo = true; VOZ.fonte = 'clique'; falarIniciar(); }, 1000);
        cliqueVoz = o;
    }
}, true);
window.addEventListener('mousemove', e => {
    if (!cliqueVoz || cliqueVoz.ativo) return;
    if (Math.hypot(e.clientX - cliqueVoz.x, e.clientY - cliqueVoz.y) > 14) cancelarCliqueVoz();   // arrastar carta não abre a voz
}, true);
window.addEventListener('mouseup', e => {
    if (VOZ.ativo && VOZ.fonte === 'mouse' && e.buttons !== 3) { falarParar(); suprimirCliques(); }
    if (cliqueVoz && e.button === 0) {
        const ativo = cliqueVoz.ativo; cancelarCliqueVoz();
        if (ativo && VOZ.ativo && VOZ.fonte === 'clique') { falarParar(); suprimirCliques(); }
    }
}, true);
window.addEventListener('blur', () => { cancelarCliqueVoz(); falarParar(); });
document.addEventListener('contextmenu', e => { if (MP.ativo) e.preventDefault(); }, true);

// Celular: tocar na tela e segurar por 1 segundo (solta = para de falar)
let toqueVoz = null;
function cancelarToque() { if (toqueVoz) { clearTimeout(toqueVoz.tm); toqueVoz = null; } }
window.addEventListener('touchstart', e => {
    if (!vozPermitida() || dentroDoChat(e)) return;
    if (e.touches.length !== 1) { cancelarToque(); return; }
    const t = e.touches[0];
    cancelarToque();
    const o = { x: t.clientX, y: t.clientY, ativo: false };
    o.tm = setTimeout(() => { o.ativo = true; VOZ.fonte = 'toque'; falarIniciar(); if (navigator.vibrate) navigator.vibrate(30); }, 1000);
    toqueVoz = o;
}, { passive: true });
window.addEventListener('touchmove', e => {
    if (!toqueVoz || toqueVoz.ativo) return;
    const t = e.touches[0];
    if (Math.hypot(t.clientX - toqueVoz.x, t.clientY - toqueVoz.y) > 14) cancelarToque();
}, { passive: true });
function fimToque() {
    if (!toqueVoz) return;
    clearTimeout(toqueVoz.tm);
    const ativo = toqueVoz.ativo; toqueVoz = null;
    if (ativo) { falarParar(); suprimirCliques(); }
}
window.addEventListener('touchend', fimToque);
window.addEventListener('touchcancel', fimToque);

// =====================================================================
// ============ RANKING GERAL NO SERVIDOR (tabela ranking_geral) ========
// Cada jogo tem o seu ranking pela coluna "jogo". Para a Sueca, use outro
// JOGO_ID e outro DELTA_RANK no jogo novo, com as mesmas funções.
// =====================================================================
const JOGO_ID = 'copas';
const DELTA_RANK = [-1, 1, 1, 2];        // 1º lugar -1 · 2º e 3º +1 · último +2

function somarRankLocal(d) {
    d.ordem.forEach((id, pos) => { const p = PERSONAGENS.find(x => x.id === id); if (p) p.pontosRank += DELTA_RANK[pos]; });
    salvarRankGeral();
}
async function enviarRankServidor(d) {
    try {
        await rpc('ranking_registrar', { p_jogo: JOGO_ID, p_personagens: d.ordem, p_deltas: DELTA_RANK.slice(0, d.ordem.length) });
    } catch (e) { console.warn('Ranking: não gravou no servidor, guardando neste aparelho.', e); somarRankLocal(d); }
}
async function carregarRankServidor() {
    if (!getSB()) return false;
    try {
        const lista = await rpc('ranking_listar', { p_jogo: JOGO_ID });
        PERSONAGENS.forEach(p => { p.pontosRank = 0; });
        (lista || []).forEach(r => { const p = PERSONAGENS.find(x => x.id === r.personagem); if (p) p.pontosRank = r.pontos; });
        salvarRankGeral();
        return true;
    } catch (e) { console.warn('Ranking: não leu o servidor.', e); return false; }
}
if (getSB()) carregarRankServidor();

// =====================================================================
// ======================= LOGIN (usuário e senha) ======================
// Cada usuário é dono de um personagem; é sempre ele que você joga.
// =====================================================================
const SESSAO_KEY = 'copasSessao';
let usuarioAtual = null;
try {
    const s = JSON.parse(localStorage.getItem(SESSAO_KEY) || 'null');
    if (s && s.usuario && PERSONAGENS.some(p => p.id === s.personagem)) usuarioAtual = s;
} catch (e) {}
carregarMissoesLocais();
const personagemDoUsuario = () => USUARIOS.personagemDaConta(usuarioAtual, PERSONAGENS);

function abrirAcesso() {
    if (usuarioAtual) { validarEIrParaModo(); return; }
    $('acessoErro').textContent = '';
    $('inpSenha').value = '';
    mostrarTela('telaAcesso');
    $('inpUsuario').focus();
}
function irParaModo() {
    jogadorHumano = personagemDoUsuario();
    if (!jogadorHumano) { deslogar('Personagem não encontrado. Entre novamente.'); return; }
    $('btnModoAdmin').classList.toggle('escondido', !souAdmin());
    $('btnModoEstampas').classList.remove('escondido');
    $('modoFoto').src = jogadorHumano.foto;
    $('modoNome').textContent = `${jogadorHumano.nome} (${usuarioAtual.usuario})`;
    $('btnModoManutencao').classList.toggle('escondido', !souAdmin());
    mostrarTela(manutencao && !liberadoManut() ? 'telaManutencao' : 'telaModo');
    carregarEstampasUsuario().then(() => { if (G) render(); });
    if (!SES.tPing) iniciarSessao();
}
// Primeiro login com uma senha nova (ex.: o admin trocou): pede de novo as permissões de áudio e microfone.
// Guarda neste aparelho só um hash da senha usada por último em cada usuário.
async function impressaoSenha(u, s) {
    const t = `copas|${u}|${s}`;
    try { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
    catch (e) { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return 'x' + h; }
}
async function pedirPermissoesSeSenhaNova(u, s) {
    try {
        const chave = `copasSenhaVista:${u}`, fp = await impressaoSenha(u, s);
        if (localStorage.getItem(chave) === fp) return;
        localStorage.setItem(chave, fp);
        try { const ac = new (window.AudioContext || window.webkitAudioContext)(); await ac.resume(); ac.close(); } catch (e) {}   // libera o áudio
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const st = await navigator.mediaDevices.getUserMedia({ audio: true });   // pede o microfone
            st.getTracks().forEach(t => t.stop());
        }
    } catch (e) { /* negou ou sem suporte: segue o login normalmente */ }
}
async function fazerLogin() {
    const erro = $('acessoErro');
    if (!getSB()) { erro.textContent = msgSB().split('\n')[0]; return; }
    const u = USUARIOS.normalizarLogin($('inpUsuario').value), s = $('inpSenha').value;
    if (!u || !s) { erro.textContent = 'Digite o usuário e a senha.'; return; }
    $('btnEntrar').disabled = true; erro.textContent = 'Entrando…';
    try {
        const token = novoToken();
        const r = await rpc('sessao_iniciar', { p_usuario: u, p_senha: s, p_token: token });
        if (!r || r.erro) { erro.textContent = 'Usuário ou senha incorretos.'; return; }
        SES.token = token;
        usuarioAtual = { usuario: r.usuario, personagem: r.personagem };
        try {
            if ($('chkLembrar').checked) { localStorage.setItem(SESSAO_KEY, JSON.stringify(usuarioAtual)); localStorage.setItem(TOKEN_KEY, token); }
            else { localStorage.removeItem(SESSAO_KEY); localStorage.removeItem(TOKEN_KEY); }
        } catch (e) {}
        erro.textContent = ''; $('inpSenha').value = '';
        await pedirPermissoesSeSenhaNova(u, s);
        try { await carregarExtras(); } catch (e) {}
        await checarManutencao();
        irParaModo();
    } catch (e) { erro.textContent = 'Não foi possível entrar. Verifique a internet e tente de novo.'; }
    finally { $('btnEntrar').disabled = false; }
}
$('btnEntrar').onclick = fazerLogin;
$('inpUsuario').addEventListener('keydown', e => { if (e.key === 'Enter') $('inpSenha').focus(); });
$('inpSenha').addEventListener('keydown', e => { if (e.key === 'Enter') fazerLogin(); });
$('btnVoltarAcesso').onclick = () => mostrarTela('telaInicial');
$('btnTrocarUsuario').onclick = () => deslogar('', true);

// =====================================================================
// ===== V31 · SESSÃO ÚNICA · DESLIGA POR INATIVIDADE · CONVERSA GERAL ==
// Só uma pessoa por usuário: quem entra por último derruba o anterior.
// 15 minutos sem jogar, sem falar e sem tocar na tela = desconecta,
// mas só em sala com mais de um jogador humano (sozinho ou no menu não há limite).
// Tudo passa por funções do Supabase (veja o SQL da V31).
// =====================================================================
const TOKEN_KEY = 'copasToken';
const INATIVIDADE_MS = 15 * 60 * 1000;
const PING_MS = 8000;
const CHAT_MAX = 45;
const SES = {
    token: null, tPing: null, tInat: null, tChat: null, ultAtiv: Date.now(),
    online: [], chaveOnline: '', maxSrv: 0, visto: 0, carregado: 0, primeiro: true,
    aberto: false, carregando: false, enviando: false, geracao: null, pver: null
};
try { SES.token = localStorage.getItem(TOKEN_KEY) || null; } catch (e) {}

function novoToken() {
    const a = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- atividade e inatividade ----------
['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel', 'click'].forEach(ev =>
    window.addEventListener(ev, () => { SES.ultAtiv = Date.now(); }, { passive: true, capture: true }));

function checarInatividade() {
    if (!usuarioAtual) return;
    const emSalaComOutros = MP.ativo && MP.membros.length > 1;
    if (!emSalaComOutros || VOZ.ativo) { SES.ultAtiv = Date.now(); return; }   // sozinho/menu: sem limite; voz conta como atividade
    if (Date.now() - SES.ultAtiv >= INATIVIDADE_MS) deslogar('Você foi desconectado: 15 minutos sem atividade na sala.', true, 'inatividade');
}

// ---------- ciclo da sessão ----------
function iniciarSessao() {
    pararSessao();
    SES.ultAtiv = Date.now(); SES.primeiro = true;
    pingSessao();
    SES.tPing = setInterval(pingSessao, PING_MS);
    SES.tInat = setInterval(checarInatividade, 5000);
}
function pararSessao() {
    clearInterval(SES.tPing); clearInterval(SES.tInat); SES.tPing = SES.tInat = null;
    fecharChat();
    SES.online = []; SES.chaveOnline = ''; SES.maxSrv = 0; SES.visto = 0; SES.carregado = 0; SES.geracao = null; SES.pver = null;
    $('chatMsgs').textContent = ''; marcarChatNovo(false); desenharOnline(true);
}
function motivoSessao(m, entrar) {
    if (m === 'derrubado') return 'Você foi desligado pelo administrador.';
    if (m === 'outro_login') return entrar ? 'Esta conta entrou em outro aparelho. Entre novamente.' : 'Esta conta entrou em outro aparelho. Você foi desconectado.';
    return 'Sua sessão terminou. Entre novamente.';
}
// o administrador pode limpar o chat: a "geração" muda e todos apagam as mensagens da tela
function aplicarGeracao(g) {
    if (g === undefined || g === null) return false;
    if (SES.geracao === null) { SES.geracao = g; return false; }
    if (g === SES.geracao) return false;
    SES.geracao = g; $('chatMsgs').textContent = ''; SES.carregado = 0;
    return true;
}
async function pingSessao() {
    if (!usuarioAtual || !SES.token || !getSB()) return;
    try {
        const r = await rpc('sessao_ping', { p_usuario: usuarioAtual.usuario, p_token: SES.token });
        if (!usuarioAtual) return;
        if (!r || r.ok === false) {
            deslogar(motivoSessao(r && r.motivo, false));
            return;
        }
        SES.online = r.online || [];
        desenharOnline();
        checarManutencao();
        if (r.pver !== undefined && r.pver !== null) {
            if (SES.pver === null) SES.pver = r.pver;
            else if (r.pver !== SES.pver) { SES.pver = r.pver; carregarExtras(); }
        }
        const limpou = aplicarGeracao(r.geracao);
        SES.maxSrv = +r.ultimo_chat || 0;
        if (limpou) SES.visto = 0;
        if (SES.primeiro) { SES.primeiro = false; SES.visto = SES.maxSrv; }
        if (SES.aberto) carregarChat(); else marcarChatNovo(SES.maxSrv > SES.visto);
    } catch (e) { /* sem internet agora: tenta de novo no próximo ciclo */ }
}
async function validarEIrParaModo() {
    if (SES.token && getSB()) {
        try {
            const r = await rpc('sessao_ping', { p_usuario: usuarioAtual.usuario, p_token: SES.token });
            if (!r || r.ok === false) {
                deslogar(motivoSessao(r && r.motivo, true));
                return;
            }
        } catch (e) { /* offline: deixa entrar; o ping seguinte confere */ }
        try { await carregarExtras(); } catch (e) {}
        await checarManutencao();
        irParaModo();
    } else {
        deslogar('Entre novamente para continuar.');
    }
}
function deslogar(msg, avisarServidor, motivo) {
    const u = usuarioAtual, t = SES.token;
    pararSessao();
    usuarioAtual = null; SES.token = null;
    try { localStorage.removeItem(SESSAO_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    if (avisarServidor && u && t && getSB()) rpc('sessao_encerrar', { p_usuario: u.usuario, p_token: t, p_motivo: motivo || 'saiu' }).catch(() => {});
    if (G || MP.ativo || MP.sala) sairParaMenu('telaModo');       // sai do bar/partida em andamento
    jogadorHumano = null;
    abrirAcesso();
    $('acessoErro').textContent = msg || '';
}

// ---------- conversa geral ----------
const souAdmin = () => !!usuarioAtual && usuarioAtual.usuario === 'nelson';

// =====================================================================
// ===== V94 · JOGO EM MANUTENÇÃO =======================================
// Nelson liga/desliga. Só Nelson, Ronaldo, Xandão e Dezinho continuam jogando;
// os demais caem na tela "Em manutenção" (e voltam sozinhos quando acabar).
// =====================================================================
const MANUT_LIBERADOS = ['nelson', 'ronaldo', 'xandao', 'dezinho'];
const semAcento = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const liberadoManut = () => !!usuarioAtual && MANUT_LIBERADOS.includes(semAcento(usuarioAtual.usuario));
let manutencao = false;
async function checarManutencao() {
    if (!getSB()) return;
    try { aplicarManutencao((await rpc('manutencao_ler')) === true); } catch (e) { /* sem rede/SQL: mantém o estado atual */ }
}
function aplicarManutencao(on) {
    manutencao = on;
    $('manutEstado').textContent = on ? 'LIGADA — toque para desligar' : 'Desligada — toque para ligar';
    if (!usuarioAtual) return;
    const tela = $('telaManutencao'), visivel = !tela.classList.contains('escondido');
    if (on && !liberadoManut() && !visivel) {
        if (G || MP.ativo || MP.sala) sairParaMenu('telaManutencao');   // derruba da partida/sala
        else mostrarTela('telaManutencao');
    } else if (!on && visivel) irParaModo();
}
$('btnManutSair').onclick = () => deslogar('', true);
$('btnModoManutencao').onclick = async () => {
    if (!souAdmin()) return;
    const novo = !manutencao;
    if (!confirm(novo ? 'Ligar a manutenção? Todos serão derrubados, menos Nelson, Ronaldo, Xandão e Dezinho.' : 'Encerrar a manutenção e liberar o jogo para todos?')) return;
    try {
        const r = await rpc('manutencao_definir', { p_usuario: usuarioAtual.usuario, p_token: SES.token, p_ligado: novo });
        if (r && r.erro) { alert('Não foi possível alterar: ' + r.erro); return; }
        aplicarManutencao(novo);
    } catch (e) { alert('Erro (rode o SQL v94 no Supabase): ' + msgErro(e)); }
};
const avisoChat = m => { $('chatAviso').textContent = m || ''; };
const doisD = n => String(n).padStart(2, '0');
function fmtDataHora(iso) {
    const d = new Date(iso);
    return `${doisD(d.getDate())}/${doisD(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${doisD(d.getHours())}:${doisD(d.getMinutes())}:${doisD(d.getSeconds())}`;
}
// V92 — nomes grandes: abrevia a primeira palavra ("Caneta Azul" -> "C. Azul"); se ainda não couber, reduz a fonte.
function nomeCurto(nome, max = 9) {
    nome = String(nome == null ? '' : nome).trim();
    if (nome.length <= max) return nome;
    const partes = nome.split(/\s+/);
    if (partes.length < 2) return nome;
    const abrev = Array.from(partes[0])[0].toUpperCase() + '.';
    return [abrev, ...partes.slice(1)].join(' ');
}
function ajustarFonteNome(el) {
    if (!el) return;
    el.style.fontSize = '';
    if (!el.clientWidth) return;
    let px = parseFloat(getComputedStyle(el).fontSize) || 12;
    const min = 7;
    while (el.scrollWidth > el.clientWidth + 1 && px > min) { px -= 0.5; el.style.fontSize = px + 'px'; }
}
function ajustarNomes(raiz) {
    (raiz || document).querySelectorAll('.nome-ajusta').forEach(ajustarFonteNome);
}
const nomeDoPersonagem = id => { const p = PERSONAGENS.find(x => x.id === id); return p ? p.nome : '?'; };

function desenharOnline(forcar) {
    const lista = (SES.online || []).map(o => +o.personagem).filter(id => PERSONAGENS.some(p => p.id === id));
    const chave = lista.join(',');
    $('chatContador').textContent = lista.length;
    $('chatQtd').textContent = lista.length;
    if (!forcar && chave === SES.chaveOnline) return;
    SES.chaveOnline = chave;
    const bola = $('chatBola'); bola.textContent = '';
    lista.forEach(id => {
        const p = PERSONAGENS.find(x => x.id === id);
        const it = document.createElement('div'); it.className = 'chat-online'; it.dataset.personagem = id;
        const img = document.createElement('img'); img.src = p.foto; img.alt = p.nome; img.draggable = false;
        img.title = souAdmin() && usuarioAtual && id !== usuarioAtual.personagem ? `${p.nome} — segure 3 s para desligar` : p.nome;
        const nm = document.createElement('span'); nm.textContent = nomeCurto(p.nome); nm.className = 'nome-ajusta'; nm.title = p.nome;
        it.append(img, nm); bola.appendChild(it);
    });
    ajustarNomes(bola);
}
function atualizarChatVisivel() {
    const ok = !!usuarioAtual && (ultimaTela === 'telaModo' || ultimaTela === 'jogo');
    $('btnChat').classList.toggle('escondido', !ok);
    fecharChat();                                   // ao trocar de tela o painel fecha
}
function marcarChatNovo(sim) { $('chatNovo').classList.toggle('escondido', !sim); }

function acrescentarMsgs(msgs) {
    const box = $('chatMsgs');
    const noFim = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    msgs.forEach(m => {
        const meu = !!usuarioAtual && +m.personagem === usuarioAtual.personagem;
        const d = document.createElement('div'); d.className = 'chat-msg' + (meu ? ' minha' : '');
        const cab = document.createElement('div'); cab.className = 'chat-cab';
        const n = document.createElement('b'); n.textContent = nomeDoPersonagem(+m.personagem);
        const t = document.createElement('span'); t.textContent = ' · ' + fmtDataHora(m.criado_em);
        cab.append(n, t);
        const tx = document.createElement('div'); tx.className = 'chat-texto'; tx.textContent = m.texto;
        d.append(cab, tx); box.appendChild(d);
    });
    while (box.children.length > 50) box.removeChild(box.firstChild);
    if (noFim || msgs.length && box.children.length === msgs.length) box.scrollTop = box.scrollHeight;
}
async function carregarChat() {
    if (!usuarioAtual || !SES.token || SES.carregando) return;
    SES.carregando = true;
    try {
        const r = await rpc('chat_listar', { p_usuario: usuarioAtual.usuario, p_token: SES.token, p_apos: SES.carregado });
        if (r) aplicarGeracao(r.geracao);
        const msgs = (r && r.msgs) || [];
        if (msgs.length) {
            acrescentarMsgs(msgs);
            SES.carregado = Math.max(SES.carregado, ...msgs.map(m => +m.id));
        }
        SES.visto = Math.max(SES.visto, SES.carregado, SES.maxSrv);
        marcarChatNovo(false);
    } catch (e) { /* tenta no próximo ciclo */ }
    finally { SES.carregando = false; }
}
// O painel de chat é um portal direto no BODY: fica fora das camadas/transformações
// do tabuleiro e não participa do cálculo de escala das cartas e fotos.
function elevarChatParaCamadaSuperior() {
    const botao = $('btnChat'), painel = $('painelChat');
    // O elemento é movido para a raiz do documento, fora de qualquer stacking context
    // criado pelo tabuleiro, telas, transformações ou contêineres com overflow.
    if (botao && botao.parentElement !== document.documentElement) document.documentElement.appendChild(botao);
    if (painel && painel.parentElement !== document.documentElement) document.documentElement.appendChild(painel);
}
elevarChatParaCamadaSuperior();
// V90 — chat fluido. A janela é um "bottom sheet" independente da mesa:
//  • fechada: fica logo acima do botão (e da mão de cartas);
//  • ao escrever: sobe até ficar COLADA no topo do teclado, com a caixa de texto sempre visível;
//  • a mesa não é remedida nem mexe: o teclado é tratado como sobreposição (overlay).
// Altura do teclado: VirtualKeyboard API (Chrome/Android) ou visualViewport (iOS e demais).
function sobreporTeclado(sim) { try { if (navigator.virtualKeyboard) navigator.virtualKeyboard.overlaysContent = !!sim; } catch (e) {} }
function alturaDoTeclado() {
    const layoutH = document.documentElement.clientHeight;
    let kb = 0;
    const vk = navigator.virtualKeyboard;
    if (vk && vk.overlaysContent && vk.boundingRect) kb = vk.boundingRect.height || 0;
    if (!kb && window.visualViewport) {
        const vv = window.visualViewport;
        kb = layoutH - vv.height - vv.offsetTop;   // 0 quando o navegador já redimensiona a tela sozinho
    }
    return kb > 80 ? Math.round(kb) : 0;           // barras do navegador/zoom não contam como teclado
}
function atualizarViewportChat() {
    const painel = $('painelChat');
    if (!painel) return;
    const focado = document.activeElement === $('chatInp');
    const raiz = document.documentElement.style;
    if (!focado) {
        painel.classList.remove('chat-teclado-aberto');
        raiz.removeProperty('--chat-kb'); raiz.removeProperty('--chat-max');
        return;
    }
    const kb = alturaDoTeclado();
    const layoutH = document.documentElement.clientHeight;
    const visivel = kb ? layoutH - kb : (window.visualViewport ? window.visualViewport.height : layoutH);
    painel.classList.add('chat-teclado-aberto');
    raiz.setProperty('--chat-kb', kb + 'px');
    raiz.setProperty('--chat-max', Math.max(190, Math.min(440, Math.round(visivel - 20))) + 'px');
}
let rafChat = 0;
function agendarViewportChat() {
    cancelAnimationFrame(rafChat);
    rafChat = requestAnimationFrame(atualizarViewportChat);
}
function focarCampoChat() {
    elevarChatParaCamadaSuperior();
    clearTimeout(TECLADO.tSaida);
    TECLADO.ativo = true;                 // congela a medição da mesa enquanto escreve
    sobreporTeclado(true);                // só durante o chat: os outros formulários seguem como antes
    atualizarViewportChat();
    [60, 160, 320, 600].forEach(ms => setTimeout(atualizarViewportChat, ms));
}
// Teclado fechou: solta o congelamento e remede a mesa uma única vez, já com tudo assentado.
function soltarTecladoChat() {
    clearTimeout(TECLADO.tSaida);
    TECLADO.tSaida = setTimeout(() => {
        if (document.activeElement === $('chatInp')) return;
        TECLADO.ativo = false;
        sobreporTeclado(false);
        atualizarViewportChat();
        reforcarEscala();
    }, 450);
}
if (navigator.virtualKeyboard) navigator.virtualKeyboard.addEventListener('geometrychange', agendarViewportChat);
if (window.visualViewport) {
    visualViewport.addEventListener('resize', agendarViewportChat);
    visualViewport.addEventListener('scroll', agendarViewportChat);
}
window.addEventListener('resize', agendarViewportChat);
$('chatInp').addEventListener('focus', focarCampoChat);
$('chatInp').addEventListener('blur', () => { setTimeout(atualizarViewportChat, 60); soltarTecladoChat(); });

function abrirChat() {
    if (!usuarioAtual) return;
    elevarChatParaCamadaSuperior();
    SES.aberto = true;
    $('chatLimpar').classList.toggle('escondido', !souAdmin());
    $('painelChat').classList.remove('escondido');
    atualizarViewportChat();
    $('chatAviso').textContent = '';
    desenharOnline(true);
    carregarChat();
    clearInterval(SES.tChat);
    SES.tChat = setInterval(() => {
        if ($('btnChat').classList.contains('escondido')) fecharChat(); else carregarChat();
    }, 3000);
}
function fecharChat() {
    const tinhaTeclado = TECLADO.ativo;
    SES.aberto = false; clearInterval(SES.tChat); SES.tChat = null;
    $('painelChat').classList.remove('chat-teclado-aberto');
    $('painelChat').classList.add('escondido');
    try { $('chatInp').blur(); } catch (e) {}
    if (tinhaTeclado) soltarTecladoChat();
}
function atualizarContChat() {
    const n = Array.from($('chatInp').value).length;
    $('chatCont').textContent = `${n}/${CHAT_MAX}`;
    $('chatCont').classList.toggle('cheio', n >= CHAT_MAX);
}
async function enviarChat() {
    if (!usuarioAtual || !SES.token || SES.enviando) return;
    const inp = $('chatInp');
    const texto = inp.value.replace(/\s+/g, ' ').trim();
    if (!texto) return;
    if (Array.from(texto).length > CHAT_MAX) { $('chatAviso').textContent = `Máximo de ${CHAT_MAX} caracteres.`; return; }
    SES.enviando = true; $('chatEnviar').disabled = true; $('chatAviso').textContent = '';
    try {
        const r = await rpc('chat_enviar', { p_usuario: usuarioAtual.usuario, p_token: SES.token, p_texto: texto });
        if (r && r.ok) { inp.value = ''; atualizarContChat(); await carregarChat(); }
        else if (r && r.erro === 'rapido') $('chatAviso').textContent = 'Calma, um instante entre as mensagens.';
        else if (r && r.erro === 'sessao') pingSessao();
        else $('chatAviso').textContent = 'Não foi possível enviar.';
    } catch (e) {
        console.error('Erro ao enviar mensagem no chat:', e);
        $('chatAviso').textContent = 'Não foi possível enviar. ' + (navigator.onLine === false ? 'Verifique a internet.' : msgErro(e));
    }
    finally { SES.enviando = false; $('chatEnviar').disabled = false; }
}
$('btnChat').onclick = () => (SES.aberto ? fecharChat() : abrirChat());
$('chatFechar').onclick = fecharChat;
$('chatEnviar').onclick = enviarChat;
$('chatInp').addEventListener('input', atualizarContChat);
$('chatInp').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enviarChat(); } });

// ---------- administrador (usuário nelson): limpar chat e desligar usuários ----------
async function limparChat() {
    if (!souAdmin() || !SES.token) return;
    if (!confirm('Apagar todas as mensagens do chat?')) return;
    try {
        const r = await rpc('chat_limpar', { p_usuario: usuarioAtual.usuario, p_token: SES.token });
        if (r && r.ok) {
            $('chatMsgs').textContent = ''; SES.carregado = 0; SES.visto = 0;
            if (r.geracao !== undefined && r.geracao !== null) SES.geracao = r.geracao;
            avisoChat('Chat limpo.'); carregarChat();
        } else avisoChat('Não foi possível limpar.');
    } catch (e) { avisoChat('Não foi possível limpar. Verifique a internet.'); }
}
async function derrubarUsuario(id) {
    if (!souAdmin() || !SES.token) return;
    const nome = nomeDoPersonagem(id);
    try {
        const r = await rpc('sessao_derrubar', { p_usuario: usuarioAtual.usuario, p_token: SES.token, p_personagem: id });
        if (r && r.ok) { avisoChat(`${nome} foi desligado.`); pingSessao(); }
        else if (r && r.erro === 'ninguem') { avisoChat(`${nome} já não está online.`); pingSessao(); }
        else avisoChat('Não foi possível desligar.');
    } catch (e) { avisoChat('Não foi possível desligar. Verifique a internet.'); }
}
let seguraFoto = null;
function cancelarSegura() {
    if (!seguraFoto) return;
    clearTimeout(seguraFoto.tm); seguraFoto.el.classList.remove('segurando'); seguraFoto = null;
}
$('chatBola').addEventListener('pointerdown', e => {
    if (!souAdmin()) return;
    const el = e.target.closest && e.target.closest('.chat-online'); if (!el) return;
    const id = +el.dataset.personagem;
    if (!id || id === usuarioAtual.personagem) return;          // não desliga a si mesmo
    cancelarSegura();
    el.classList.add('segurando');
    seguraFoto = { el, tm: setTimeout(() => { seguraFoto = null; el.classList.remove('segurando'); derrubarUsuario(id); }, 3000) };
});
['pointerup', 'pointercancel'].forEach(ev => window.addEventListener(ev, cancelarSegura));
$('chatBola').addEventListener('pointerleave', cancelarSegura);
$('chatBola').addEventListener('contextmenu', e => e.preventDefault());
$('chatLimpar').onclick = limparChat;


// =====================================================================
// ============ V35 · ADMINISTRADOR: usuários, senhas e personagens =====
// Só o usuário nelson vê o botão. Quem valida de verdade é o banco.
// =====================================================================
async function carregarExtras() {
    const lista = await rpc('personagens_listar');
    if (!Array.isArray(lista)) return;
    try { localStorage.setItem(EXTRAS_KEY, JSON.stringify(lista)); } catch (e) {}
    aplicarExtras(lista, true);
}
const numeroDaFoto = nome => { const m = /^(\d+)\./.exec(nome || ''); return m ? +m[1] : 0; };
function maiorFotoUsada() {
    let m = 0;
    PERSONAGENS.forEach(p => { m = Math.max(m, p.id, numeroDaFoto(p.fotoNome)); });
    return m;
}
const admMsg = (t, ok) => { const e = $('admMsg'); e.textContent = t || ''; e.style.color = ok ? '#8be28b' : ''; };
const ERROS_ADMIN = {
    permissao: 'Sem permissão.', tabela: 'Tabela de usuários não encontrada (veja config_admin no SQL).',
    nome: 'Nome inválido (1 a 30 letras, sem < > " & \\).', usuario: 'Usuário inválido (2 a 20: letras minúsculas, números, . _ -).',
    senha: 'Senha inválida (4 a 40 caracteres).', foto_nome: 'Nome da foto inválido. Use número e extensão, ex.: 16.png, 16.jpg ou 16.webp.',
    foto_base: 'Esse número de foto é de um personagem fixo. Use um maior.', foto_existe: 'Esse nome de foto já está em uso.',
    usuario_existe: 'Esse usuário já existe.', foto: 'Foto inválida ou grande demais.', inexistente: 'Usuário não encontrado.'
};

function abrirAdmin() {
    if (!souAdmin()) return;
    mostrarTela('telaAdmin');
    $('admVistaLista').classList.remove('escondido'); $('admVistaCadastro').classList.add('escondido');
    admMsg('');
    carregarAdmin();
}
async function carregarAdmin() {
    const box = $('admLista'); box.textContent = 'Carregando…';
    try {
        const r = await rpc('admin_listar', { p_usuario: usuarioAtual.usuario, p_token: SES.token });
        if (!r || !r.ok) { box.textContent = ''; admMsg(ERROS_ADMIN[r && r.erro] || 'Não foi possível listar.'); return; }
        const us = (r.usuarios || []).slice().sort((a, b) => nomeDoPersonagem(+a.personagem).localeCompare(nomeDoPersonagem(+b.personagem)));
        $('admTotal').textContent = us.length;
        box.textContent = '';
        us.forEach(u => box.appendChild(linhaAdmin(u)));
    } catch (e) { box.textContent = ''; admMsg('Não foi possível listar. Verifique a internet.'); }
}
function linhaAdmin(u) {
    const p = PERSONAGENS.find(x => x.id === +u.personagem);
    const d = document.createElement('div'); d.className = 'adm-linha';
    const topo = document.createElement('div'); topo.className = 'adm-topo';
    const img = document.createElement('img'); img.src = p ? p.foto : ''; img.alt = '';
    const nm = document.createElement('span'); nm.textContent = `${p ? p.nome : '?'} (${u.usuario})`;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-mini'; b.textContent = 'Trocar senha';
    topo.append(img, nm, b);
    const form = document.createElement('div'); form.className = 'adm-senha escondido';
    const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'campo'; inp.maxLength = 40; inp.placeholder = 'Nova senha (mínimo 4)';
    inp.autocomplete = 'off'; inp.autocapitalize = 'none'; inp.spellcheck = false;
    const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn-mini'; ok.textContent = 'Salvar';
    form.append(inp, ok);
    b.onclick = () => { form.classList.toggle('escondido'); if (!form.classList.contains('escondido')) inp.focus(); };
    ok.onclick = async () => {
        const nova = inp.value;
        if (nova.length < 4 || nova.length > 40) { admMsg(ERROS_ADMIN.senha); return; }
        ok.disabled = true; admMsg('Salvando…');
        try {
            const r = await rpc('admin_trocar_senha', { p_usuario: usuarioAtual.usuario, p_token: SES.token, p_alvo: u.usuario, p_nova: nova });
            if (r && r.ok) { admMsg(`Senha de ${u.usuario} alterada.`, true); inp.value = ''; form.classList.add('escondido'); }
            else admMsg(ERROS_ADMIN[r && r.erro] || 'Não foi possível trocar a senha.');
        } catch (e) { admMsg('Não foi possível trocar a senha. Verifique a internet.'); }
        finally { ok.disabled = false; }
    };
    d.append(topo, form);
    return d;
}

let admFotoData = null, admFotoPng = null, admFotoCanvas = null;
function abrirCadastro() {
    admMsg(''); admFotoData = null; admFotoPng = null;
    ['admNome', 'admUsuario', 'admSenha'].forEach(id => { $(id).value = ''; });
    admFotoCanvas = null; $('admFotoArq').value = ''; $('admFotoPrev').classList.add('escondido'); $('admFotoPrev').removeAttribute('src');
    const maior = maiorFotoUsada();
    $('admMaiorFoto').textContent = `Maior foto já usada: ${maior}.png`;
    $('admFotoNome').value = `${maior + 1}.png`;           // pode apagar e mudar antes de cadastrar
    $('admVistaLista').classList.add('escondido'); $('admVistaCadastro').classList.remove('escondido');
    $('admNome').focus();
}
function lerFotoRedimensionada(file) {
    admFotoCanvas = null;
    return new Promise((res, rej) => {
        const url = URL.createObjectURL(file), img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
            const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, S, S);
            const lado = Math.min(img.width, img.height);
            const sx = (img.width - lado) / 2, sy = Math.max(0, img.height - lado) * 0.3;   // corta quadrado, favorecendo o rosto
            ctx.drawImage(img, sx, sy, lado, lado, 0, 0, S, S);
            admFotoCanvas = c; admFotoPng = 'ok';
            res(c.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('imagem')); };
        img.src = url;
    });
}
$('admFotoArq').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; admFotoData = null; admFotoPng = null;
    if (!f) { $('admFotoPrev').classList.add('escondido'); return; }
    try {
        admFotoData = await lerFotoRedimensionada(f);
        $('admFotoPrev').src = admFotoData; $('admFotoPrev').classList.remove('escondido'); admMsg('');
    } catch (err) { admMsg('Não foi possível ler essa imagem.'); $('admFotoPrev').classList.add('escondido'); }
});
// Salva fotos/<nome> (a extensão do campo) no repositório do GitHub (precisa de um token com permissão de escrita em Contents).
// O token é pedido uma vez e guardado só neste aparelho. Sem token/erro: baixa o arquivo para você colocar em fotos/.
async function enviarFotoRepo(fnome, dataUrl) {
    const baixar = () => { const a = document.createElement('a'); a.href = dataUrl; a.download = fnome; document.body.appendChild(a); a.click(); a.remove(); };
    try {
        const dono = location.hostname.split('.')[0], repo = location.pathname.split('/')[1];
        if (!/github\.io$/.test(location.hostname) || !repo) { baixar(); return `Foto baixada como ${fnome}: coloque na pasta fotos.`; }
        let tk = ''; try { tk = localStorage.getItem('copasGhToken') || ''; } catch (e) {}
        if (!tk) { tk = (prompt('Token do GitHub (permissão Contents: leitura e escrita) para salvar a foto na pasta fotos. Cancelar = baixar o arquivo.') || '').trim();
            if (tk) try { localStorage.setItem('copasGhToken', tk); } catch (e) {} }
        if (!tk) { baixar(); return `Foto baixada como ${fnome}: coloque na pasta fotos.`; }
        const url = `https://api.github.com/repos/${dono}/${repo}/contents/fotos/${fnome}`;
        const h = { Authorization: 'Bearer ' + tk, Accept: 'application/vnd.github+json' };
        const corpo = { message: `Foto ${fnome}`, content: dataUrl.split(',')[1] };
        const ex = await fetch(url, { headers: h });
        if (ex.ok) corpo.sha = (await ex.json()).sha;
        const r = await fetch(url, { method: 'PUT', headers: h, body: JSON.stringify(corpo) });
        if (r.ok) return `Foto salva em fotos/${fnome}.`;
        if (r.status === 401 || r.status === 403) { try { localStorage.removeItem('copasGhToken'); } catch (e) {} }
        baixar(); return `Não deu para salvar no GitHub (erro ${r.status}); a foto foi baixada como ${fnome}.`;
    } catch (e) { baixar(); return `Sem acesso ao GitHub; a foto foi baixada como ${fnome}.`; }
}
async function salvarCadastro() {
    const nome = $('admNome').value.trim(), usu = $('admUsuario').value.trim().toLowerCase();
    const senha = $('admSenha').value;
    const fnome = $('admFotoNome').value.trim().toLowerCase().replace(/\s+/g, '').replace(/\.jpeg$/, '.jpg');   // nome e extensão exatamente como estão no campo (.jpeg vira .jpg)
    const extF = (/\.([a-z0-9]+)$/.exec(fnome) || [])[1] || '';
    if (!nome) { admMsg(ERROS_ADMIN.nome); return; }
    if (!/^[a-z0-9_.-]{2,20}$/.test(usu)) { admMsg(ERROS_ADMIN.usuario); return; }
    if (senha.length < 4 || senha.length > 40) { admMsg(ERROS_ADMIN.senha); return; }
    if (!/^\d{1,4}\.(png|jpg|webp)$/.test(fnome)) { admMsg(ERROS_ADMIN.foto_nome + ' [app, nome: ' + fnome + ']'); return; }
    $('btnAdmSalvar').disabled = true; admMsg('Cadastrando…');
    try {
        const r = await rpc('admin_cadastrar', { p_usuario: usuarioAtual.usuario, p_token: SES.token, p_nome: nome,
            p_novo_usuario: usu, p_senha: senha, p_foto_nome: fnome, p_foto_data: admFotoData });
        if (r && r.ok) {
            try { await carregarExtras(); } catch (e) {}
            let aviso = '';
            if (admFotoCanvas) aviso = await enviarFotoRepo(fnome, admFotoCanvas.toDataURL(extF === 'jpg' ? 'image/jpeg' : extF === 'webp' ? 'image/webp' : 'image/png', 0.92));
            $('admVistaCadastro').classList.add('escondido'); $('admVistaLista').classList.remove('escondido');
            admMsg(`${nome} cadastrado (usuário ${usu}). ${aviso}`, true);
            carregarAdmin();
        } else admMsg((ERROS_ADMIN[r && r.erro] || 'Não foi possível cadastrar.') + (r && r.erro === 'foto_nome' ? ' [recusado pelo servidor, nome enviado: ' + fnome + ']' : ''));
    } catch (e) { admMsg('Não foi possível cadastrar. Verifique a internet.'); }
    finally { $('btnAdmSalvar').disabled = false; }
}
$('btnModoAdmin').onclick = abrirAdmin;
$('btnAdmCadastrar').onclick = abrirCadastro;
$('btnAdmSalvar').onclick = salvarCadastro;
$('btnAdmCancelar').onclick = () => { admMsg(''); $('admVistaCadastro').classList.add('escondido'); $('admVistaLista').classList.remove('escondido'); };
$('btnAdmVoltar').onclick = () => { admMsg(''); mostrarTela('telaModo'); };

// =====================================================================
// =================== V91 · TELESPECTADOR =============================
// Entre em modo Misto ou Sala apenas para assistir, sem escolher personagem.
// Clique no avatar de um jogador para ver suas cartas.
// =====================================================================

async function _assistirSala(s, tipo) {
    if (!getSB()) { alert(msgSB()); return; }
    try {
        const r = await rpc('assistir_sala', { p_id: s.id });
        if (!r || r.erro) { alert('Essa sala não existe mais.'); return carregarSalas(); }
        clearInterval(MP.tLista);
        MP.sala = { id: s.id, canal: r.canal, nome: r.nome, tipo, senha: '' };
        MP.offset = Date.parse(r.agora) - Date.now();
        if (tipo === 'misto') MP.inicio = Date.parse(r.inicio_em);
        MP.modo = tipo;
        MP.espectador = true; MP.espectadorDesde = Date.now(); MP.vazioDesde = 0;
        await conectarCanal(r.canal);
        iniciarPing();
        await entrarNaEsperaEspectador();
    } catch (e) { alert('Não foi possível assistir (rode o SQL v92 no Supabase): ' + msgErro(e)); MP.espectador = false; sairSala(); }
}

async function entrarNaEsperaEspectador() {
    if (!MP.ch) return;
    await new Promise(r => setTimeout(r, 700));
    MP.naEspera = true; MP.char = 0; MP.ordem = Date.now() + MP.offset + 999999; // fica por último na lista
    await MP.ch.track({ pid: MP.pid, char: 0, ordem: MP.ordem, espectador: true });
    mostrarTela('telaEspera');
    atualizarEspera(); atualizarFaixa();
}

// Espectador recebe o snap completo e renderiza a mesa sem controles de jogo
function aoSnapEspectador(payload) {
    const { s, bk } = payload;
    if (!s || !s.pe) return;
    MP.ultimoSnapEsp = payload;
    const rot = a => a; // espectador usa perspectiva do assento 0 (sem rotação)
    const v = i => i;
    const acha = id => PERSONAGENS.find(p => p.id === id);
    const ant = G;
    const g = {
        nomes: s.no, personagens: s.pe.map(acha), totais: s.to, pts: s.pt,
        turno: s.t, ocupado: s.oc, distribuindo: s.di, distMsg: s.dm, recebidas: s.rc, rodadaEncerrada: s.re,
        mesa: s.me.map(([j, c]) => ({ jogador: j, carta: cartaDeId(c) })), lider: s.li, quebrada: s.qb, vazas: s.vz,
        maos: bk ? bk.H.map(a => a.map(cartaDeId)) : [[], [], [], []],
        pegas: s.pg.map(a => a.map(cartaDeId)), aviso: s.av || '',
        carteador: s.ca, rodada: s.r, venc: s.vc,
        humanos: s.ho, donos: s.do, hostPid: s.do[0], virarMao: false, gid: s.g || null,
        luaConquistada: ant ? ant.luaConquistada : false, renunciaConquistada: ant ? ant.renunciaConquistada : false,
        avisoAte: 0, vago: s.vg || [false, false, false, false]
    };
    if (g.personagens.some(p => !p)) {   // personagem extra ainda não carregado: busca e tenta de novo
        if (!MP.carregandoExtras) { MP.carregandoExtras = true; carregarExtras().catch(() => {}).finally(() => { MP.carregandoExtras = false; if (MP.espectador && MP.ultimoSnapEsp) aoSnapEspectador(MP.ultimoSnapEsp); }); }
        return;
    }
    g.personagens.forEach((p, i) => { if (p) p.total = g.totais[i]; });
    g.distMsg = legendaCliente(g, false);
    const primeira = !MP.emJogo;
    if (primeira) {
        document.body.classList.add('modo-espectador'); MP.emJogo = true; MP.papel = 'espectador'; MP.naEspera = false; MP.volta = false; MP.mesaMeta = '';
        jogadorHumano = g.personagens[0]; // usa o primeiro como referência para htmlFim etc.
        mostrarTela('jogo'); pararIntro();
        $('btnChave').classList.add('escondido');
        $('maoJogador').innerHTML = '<div style="text-align:center;color:#aaa;padding:8px;font-size:13px">👁 Telespectador · Clique numa foto para ver as cartas</div>';
    }
    MP.ultimoSnap = payload;
    G = g;
    renderEspectador();
    sincronizarMesaCliente();
    animBaralhoCliente(ant, g);
    if (ant && ant.rodadaEncerrada && !g.rodadaEncerrada) $('modal').classList.add('escondido');
}

function renderEspectador() {
    if (!G) return;
    // Mão do espectador: mantém o aviso fixo
    $('maoJogador').innerHTML = '<div style="text-align:center;color:#aaa;padding:8px;font-size:13px">👁 Telespectador · Clique numa foto para ver as cartas</div>';
    $('maoJogador').classList.remove('mao-pontos-finais');

    for (let i = 0; i < 4; i++) {
        const box = $(`j${i}`);
        box.classList.toggle('turno-ativo', i === G.turno && !G.ocupado && !G.distribuindo);
        const ranking = posicoes(G.personagens, p => p.total, 'partida').get(G.personagens[i]);
        const p = G.personagens[i];
        if (!p) continue;
        box.innerHTML = `<img class="avatar-jogador" data-pid="${(G.donos && G.donos[i]) || ''}" src="${p.foto}" alt="${G.nomes[i]}" onclick="verCartasEspectador(${i})" style="cursor:pointer" title="Ver cartas de ${G.nomes[i]}" onerror="this.src='fotos/${p.id}.png'; this.onerror=null">
            <div class="info-jogador">
                <span class="nome nome-ajusta" title="${G.nomes[i]}"><span class="nome-txt">${nomeCurto(G.nomes[i])}</span> <small class="ranking">${ranking}º</small></span>
                <span class="tot">Total: ${G.totais[i]}</span>
                <span class="rod">Rodada: ${G.pts[i]}</span>
            </div>`;
        ajustarNomes(box);
        if (G.rodadaEncerrada && i !== 0) {
            const faixa = document.createElement('div'); faixa.className = 'pontos-mao-final';
            G.pegas[i].forEach(c => faixa.appendChild(criarElementoCarta(c, 'carta-ponto-final')));
            box.appendChild(faixa);
        }
    }
    atualizarIndicadoresSala();
    atualizarStatus();
    marcarFalando();
}

function verCartasEspectador(jogador) {
    if (!G || !G.maos || !G.maos[jogador]) return;
    const overlay = $('espectadorOverlay');
    const nome = G.nomes[jogador] || `Jogador ${jogador + 1}`;
    $('espectadorNome').textContent = `🃏 Cartas de ${nome}`;
    const container = $('espectadorCartas');
    container.innerHTML = '';
    const cartas = G.maos[jogador];
    if (!cartas.length) {
        container.innerHTML = '<p style="color:#aaa;padding:8px">Sem cartas (fim de rodada)</p>';
    } else {
        cartas.slice().sort((a, b) => ORDEM_MAO.indexOf(a.naipe) - ORDEM_MAO.indexOf(b.naipe) || a.valor - b.valor)
            .forEach(c => container.appendChild(criarElementoCarta(c)));
    }
    overlay.classList.remove('escondido');
}
$('espectadorFechar').onclick = () => $('espectadorOverlay').classList.add('escondido');
$('espectadorOverlay').addEventListener('click', e => { if (e.target === $('espectadorOverlay')) $('espectadorOverlay').classList.add('escondido'); });

// =====================================================================
// ===== V91 · ESTAMPA DE CADA JOGADOR NAS CARTAS DO EMBARALHAR ========
// Cartas que voam para a mão de cada jogador usam a estampa daquele
// jogador (armazenada em G.estampasJogadores[i], preenchida ao iniciar).
// =====================================================================

// Cria verso de carta usando a estampa de um jogador específico
function criarVersoCartaParaJogador(jogador) {
    if (!G || !G.estampasJogadores) return criarVersoCarta();
    const pid = G.donos && G.donos[jogador];
    // Para o próprio jogador (posição 0 no modo solo/host): usa estampa ativa do usuário
    if (jogador === 0 || !pid) {
        // Usa a estampa do usuário local
        return criarVersoCarta();
    }
    // Para outros: usa a estampa divulgada via presença (G.estampasJogadores[jogador])
    const estampaId = G.estampasJogadores[jogador];
    if (!estampaId || estampaId === 'padrao') return criarVersoCarta();
    const d = document.createElement('div');
    d.className = 'carta verso';
    d.setAttribute('aria-label', 'Carta virada para baixo');
    const img = document.createElement('img');
    img.className = 'imagem-estampa-carta';
    img.alt = ''; img.draggable = false; img.decoding = 'async';
    d.classList.add('com-estampa');
    d.appendChild(img);
    carregarImagemEstampa(img, estampaId, () => { d.classList.remove('com-estampa'); img.remove(); });
    return d;
}

// Ao entrar na espera, publica a estampa ativa junto com a presença
const _entrarNaEsperaOrig = entrarNaEspera;
// Sobrescreve track para incluir estampa
const _trackComEstampa = async () => {
    const estampa = estampaSelecionada();
    if (MP.ch) {
        await MP.ch.track(Object.assign(
            { pid: MP.pid, char: MP.char, ordem: MP.ordem },
            MP.volta ? { volta: true } : {},
            { estampa: estampa !== 'padrao' ? String(estampa) : '' }
        )).catch(() => {});
    }
};

// Ao receber presença, preenche G.estampasJogadores
const _aoPresencaOrig = aoPresenca;
// Monkey-patch aoPresenca to also fill estampas

// Patch aoPresenca to also update estampasJogadores
function aoPresenca() {
    if (!MP.ch) return;
    const lista = [];
    Object.values(MP.ch.presenceState()).forEach(arr => { const m = arr[arr.length - 1]; if (m && m.pid && !m.espectador) lista.push(m); });
    lista.sort((a, b) => a.ordem - b.ordem || a.pid.localeCompare(b.pid));
    MP.membros = lista;
    const vivos = new Set(lista.map(m => m.pid));
    [...MP.falando].forEach(p => { if (!vivos.has(p) && p !== MP.pid) MP.falando.delete(p); });
    // Atualiza estampas dos jogadores
    if (G) {
        if (!G.estampasJogadores) G.estampasJogadores = ['', '', '', ''];
        lista.forEach(m => {
            const idx = G.donos ? G.donos.indexOf(m.pid) : -1;
            if (idx >= 0) G.estampasJogadores[idx] = m.estampa || '';
        });
    }
    atualizarCharsOcupados(); atualizarEspera(); atualizarFaixa(); atualizarIndicadoresSala(); sincronizarVoz(); verificarSaidas(); marcarFalando();
}

// Initialize estampasJogadores when game starts
const _iniciarPartidaOrig = iniciarPartida;
// Patch G init to add estampasJogadores

// Also track estampa when joining espera

// =====================================================================
// ===== V96 · BARALHO PARA QUEM NÃO É ANFITRIÃO =======================
// O anfitrião roda a animação; os outros recebem só o estado. Aqui cada um
// vê embaralhar/cortar localmente e as cartas voando conforme os snaps chegam.
function legendaCliente(g, voce) {
    const nome = i => (voce && i === 0) ? 'Você' : g.nomes[i];
    const dm = String(g.distMsg || '');
    if (/embaralha/.test(dm)) return `${nome(g.carteador)} embaralha as cartas…`;
    if (/corta/.test(dm)) return `${nome((g.carteador + 3) % 4)} corta o baralho…`;
    if (/distribui/.test(dm)) return `${nome(g.carteador)} distribui as cartas…`;
    return dm;
}
function voarCartaCli(jogador) {
    const tk = MP.tkCli; if (!tk || !G) return;
    const tw = larguraCartaMesa(), w = tw, h = tw * 1.4286, palco = $('palcoBaralho');
    const de = centroDe($('baralhoMesa'));
    let para;
    if (jogador === 0 && MP.papel !== 'espectador') {
        const r = $('maoJogador').getBoundingClientRect();
        para = { x: r.left + r.width / 2 + (Math.random() * 30 - 15), y: r.bottom - r.height * 0.3 };
    } else para = centroDe($(`j${jogador}`));
    const el = criarVersoCartaParaJogador(jogador);
    el.classList.add('voando');
    el.style.left = (de.x - w / 2) + 'px'; el.style.top = (de.y - h / 2) + 'px';
    palco.appendChild(el);
    const dx = para.x - de.x, dy = para.y - de.y, esc = jogador === 0 ? 1.25 : 0.6;
    const rot = (jogador === 1 ? -50 : jogador === 3 ? 50 : jogador === 2 ? 20 : 0) + (Math.random() * 24 - 12);
    const anim = el.animate([
        { transform: 'translate(0, 0) rotate(0deg) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${esc})` }
    ], { duration: 280, easing: 'cubic-bezier(.25,.8,.3,1)', fill: 'forwards' });
    anim.finished.then(() => {
        el.remove();
        const box = $(`j${jogador}`);
        if (box) { box.classList.add('recebeu'); setTimeout(() => box.classList.remove('recebeu'), 140); }
        SFX.dar();
    }).catch(() => el.remove());
    tk.n = (tk.n || 0) + 1;
    if (tk.n % 3 === 0 && baralhoVisual.length) { const c = baralhoVisual.pop(); if (c) c.remove(); }   // o monte vai diminuindo
}
function animBaralhoCliente(ant, g) {
    if (reduzMovimento() || !g) return;
    const legenda = $('legendaTexto');
    if (g.distribuindo) {
        if (!MP.tkCli) {
            const tk = { pular: false, cliente: true };
            MP.tkCli = tk;
            prepararPalco();
            if (legenda) legenda.textContent = '';
            tk.fim = (async () => {
                try { await animEmbaralhar(tk); if (viva(tk) && !tk.pular) await animCortar(tk); } catch (e) {}
                tk.acabou = true;
                if (tk.pular) baralhoVisual.forEach((el, k) => pose(el, 0, -k * 0.7, 0, 0, 0));   // monte arrumado
            })();
        }
        const tk = MP.tkCli;
        if (legenda) legenda.textContent = g.distMsg || '';
        if (ant && ant.distribuindo && ant.recebidas) {
            let n = 0;
            for (let i = 0; i < 4; i++) {
                const d = Math.min(13, (g.recebidas[i] || 0) - (ant.recebidas[i] || 0));
                for (let k = 0; k < d; k++) { setTimeout(() => voarCartaCli(i), n * 58); n++; }
            }
            if (n > 0 && !tk.acabou) tk.pular = true;      // já está dando as cartas: encerra o embaralhar
        }
    } else if (MP.tkCli) {
        MP.tkCli.pular = true; MP.tkCli = null;
        ocultarPalco();
        if (legenda) legenda.textContent = '';
    }
}

// ===== V91 · FRASES RÁPIDAS ==========================================
// Até 3 frases por partida; aparecem como balão de fala do jogador.
// Só visíveis quando há 2+ jogadores humanos.
// =====================================================================

const FRASES = [
    'Sentou para o bonde!',
    'Olha a inquilina aí!',
    'Ihhhhhhhh!',
    'Chora!!!',
    'Pediu pra sair!',
    'Hoje tem passeio?',
    'Passei o pau na tua cara.',
    'Vai pagar a coca!',
    'Hoje é valendo a bunda hein.',
    'Tá valendo o quê?',
    'Isso não é bicho pra ficar cercando não.',
    '😄', '😡', '😭', '😮'
];
const GIFS = ['gifs/g1.gif', 'gifs/g2.gif', 'gifs/g3.gif', 'gifs/g4.gif', 'gifs/g5.gif'];   // aparecem ao lado do quadrado do personagem
const gifSrc = src => (window.GIFS_DATA && window.GIFS_DATA[src]) || src;
const MAX_FRASES = 3;
let frasesUsadas = 0;
let frasesBalaoTimer = null;

function atualizarBtnFrases() {
    const btn = $('btnFrases');
    if (!btn) return;
    // Só mostra se estiver em jogo com 2+ humanos e não for espectador e não estar em modo solo
    const mostra = G && !MP.espectador && ((MP.modo === 'solo' && !MP.ativo) || (MP.ativo && MP.membros.length > 1));
    btn.classList.toggle('escondido', !mostra);
    if (mostra) {
        const restam = MAX_FRASES - frasesUsadas;
        btn.title = restam > 0 ? `Frases rápidas (${restam} restantes)` : 'Frases esgotadas';
        btn.style.opacity = restam > 0 ? '1' : '0.4';
    }
}

function fecharPainelFrases() {
    const p = $('painelFrases'); if (p) p.classList.add('escondido');
}

function abrirPainelFrases() {
    const restam = MAX_FRASES - frasesUsadas;
    if (restam <= 0) { avisoTemp('Você já usou suas 3 frases nesta rodada! 🤐', 2500); return; }
    const p = $('painelFrases');
    $('frasesRestantes').textContent = `(${restam} restante${restam === 1 ? '' : 's'})`;
    const lista = $('frasesList');
    lista.innerHTML = '';
    const gl = $('gifsList'); gl.innerHTML = '';
    GIFS.forEach(src => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'gif-item';
        b.innerHTML = '<img src="' + gifSrc(src) + '" alt="GIF">';
        b.onclick = () => { fecharPainelFrases(); usarFrase('gif:' + src); };
        gl.appendChild(b);
    });
    FRASES.forEach(fr => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'frase-item';
        btn.textContent = fr;
        btn.onclick = () => { fecharPainelFrases(); usarFrase(fr); };
        lista.appendChild(btn);
    });
    p.classList.remove('escondido');
}

function usarFrase(texto) {
    if (frasesUsadas >= MAX_FRASES || (!MP.ativo && !(MP.modo === 'solo' && G))) return;
    frasesUsadas++;
    atualizarBtnFrases();
    // Envia para todos via evt
    if (MP.emJogo && (MP.papel === 'host' || MP.papel === 'cliente')) {
        enviar('evt', { t: 'frase', pid: MP.pid, char: jogadorHumano ? jogadorHumano.id : 0, texto });
    }
    // Mostra localmente também
    mostrarBalaoFrase(0, texto, true);
}

const _baloes = {};
function mostrarBalaoFrase(assento, texto, meu) {
    // assento = posição na mesa (0-3); o balão aparece ao lado da foto, como se o jogador falasse
    const box = $(`j${assento}`);
    if (!box) return;
    if (_baloes[assento]) { clearTimeout(_baloes[assento].t); _baloes[assento].el.remove(); }
    const foto = box.querySelector('.avatar-jogador') || box;
    const rb = box.getBoundingClientRect(), rf = foto.getBoundingClientRect();
    const balao = document.createElement('div');
    const ehGif = typeof texto === 'string' && texto.startsWith('gif:');
    if (ehGif) {             // GIF: não é balão de fala, fica ao lado do quadrado do personagem
        const src = texto.slice(4);
        if (!GIFS.includes(src)) return;
        const aDir = (rb.left + rb.width / 2) > window.innerWidth * 0.55;
        // tamanho máximo = quadro da foto do personagem
        const maxW = Math.max(24, Math.min(rf.width, aDir ? rb.left - 10 : window.innerWidth - rb.right - 10)), maxH = rf.height;
        balao.className = 'gif-lado';
        balao.innerHTML = '<img src="' + gifSrc(src) + '" alt="" style="max-width:' + maxW + 'px;max-height:' + maxH + 'px">';
        balao.style.top = (rf.top + rf.height / 2) + 'px';
        if (aDir) balao.style.right = (window.innerWidth - rb.left + 6) + 'px'; else balao.style.left = (rb.right + 6) + 'px';
        document.body.appendChild(balao);
        _baloes[assento] = { el: balao, t: setTimeout(() => { balao.remove(); delete _baloes[assento]; }, 4000) };
        return;
    }
    const meuLugar = Number(assento) === 0;
    if (meuLugar) {          // meu personagem: balão ao lado da foto
        const aDireita = (rb.left + rb.width / 2) > window.innerWidth * 0.55;
        balao.className = 'balao-frase' + (meu ? ' balao-meu' : '') + (aDireita ? ' balao-esq' : ' balao-dir');
        balao.textContent = texto;
        balao.style.top = (rf.top + rf.height / 2) + 'px';
        if (aDireita) { balao.style.right = (window.innerWidth - rb.left + 8) + 'px'; balao.style.maxWidth = Math.max(80, rb.left - 16) + 'px'; }
        else { balao.style.left = (rb.right + 8) + 'px'; balao.style.maxWidth = Math.max(80, window.innerWidth - rb.right - 16) + 'px'; }
    } else {                 // os outros: balão embaixo da caixa, para não cobrir as cartas
        balao.className = 'balao-frase balao-baixo';
        balao.textContent = texto;
        balao.style.top = (rb.bottom + 6) + 'px';
        balao.style.maxWidth = Math.min(200, window.innerWidth - 16) + 'px';
        balao.style.visibility = 'hidden';
    }
    document.body.appendChild(balao);
    if (!meuLugar) {         // centraliza na caixa sem sair da tela
        const w = balao.offsetWidth;
        balao.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, rb.left + rb.width / 2 - w / 2)) + 'px';
        balao.style.visibility = '';
    }
    _baloes[assento] = { el: balao, t: setTimeout(() => { balao.remove(); delete _baloes[assento]; }, 3000) };
}
// botão e painel de frases ficam na raiz (fixos à direita, na altura do botão do chat)
document.body.appendChild($('btnFrases')); document.body.appendChild($('painelFrases'));

// Recebe frase de outro jogador via evento
const _aoEventoOrig = aoEvento;
aoEvento = function(p) {
    if (p.t === 'frase') {
        // Encontra o assento pelo pid ou char
        let assento = -1;
        if (G) {
            assento = G.donos ? G.donos.indexOf(p.pid) : -1;
            if (assento < 0 && G.personagens) assento = G.personagens.findIndex(px => px && px.id === p.char);
        }
        if (assento < 0) assento = 1; // fallback
        mostrarBalaoFrase(assento, p.texto, false);
        return;
    }
    _aoEventoOrig(p);
};

$('btnFrases').onclick = () => {
    const p = $('painelFrases');
    if (p.classList.contains('escondido')) abrirPainelFrases(); else fecharPainelFrases();
};
$('frasesFechar').onclick = fecharPainelFrases;
// Fecha ao clicar fora
document.addEventListener('click', e => {
    if (!$('painelFrases').classList.contains('escondido') &&
        !e.target.closest('#painelFrases') && !e.target.closest('#btnFrases')) {
        fecharPainelFrases();
    }
});

// =====================================================================
// ===== V96 · ATUALIZAÇÃO DO CÓDIGO DERRUBA OS USUÁRIOS ================
// Quando o código muda no git, quem não está em partida é deslogado e a página recarrega
// (precisa fazer login de novo). Quem está em partida só cai depois de sair dela.
// =====================================================================
(() => {
    const ARQS = ['index.html', 'script.js', 'style.css', 'missoes.js', 'personagens.js'];
    let base = null, pendente = false, aplicando = false;
    async function assinatura() {
        const partes = [];
        for (const a of ARQS) {
            const r = await fetch(`${a}?_=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
            if (!r.ok) throw new Error('http');
            partes.push([r.headers.get('etag'), r.headers.get('last-modified'), r.headers.get('content-length')].join('|'));
        }
        const s = partes.join('#');
        return /[^|#]/.test(s) ? s : null;   // sem cabeçalhos (ex.: arquivo local): não dá para comparar
    }
    async function verificar() {
        if (pendente) return;
        try {
            const s = await assinatura();
            if (!s) return;
            if (base === null) base = s; else if (s !== base) pendente = true;
        } catch (e) {}
    }
    function aplicar() {
        if (!pendente || aplicando || !usuarioAtual) return;
        if (document.body.dataset.tela === 'jogo') return;   // em partida: espera terminar
        aplicando = true;
        try { deslogar('', true, 'atualizacao'); } catch (e) {}
        alert('O jogo foi atualizado. A página vai recarregar e você precisa fazer login novamente.');
        location.reload();
    }
    verificar();
    setInterval(verificar, 60000);
    setInterval(aplicar, 3000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) verificar(); });
})();
