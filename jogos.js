// ================= JOGOS EXTRAS: núcleo + Truco, Mau-mau e Pife =================
// Telas próprias (#telaJogos), no mesmo padrão do Blackjack: você contra máquinas, botão do troféu (placar, regras, sair).
// Janelas de fim de mão/partida NUNCA fecham sozinhas: só quando você clica no botão.
// Buraco, Bridge e Paciência estão em jogos2.js (registram-se aqui com Jogos.reg).
const Jogos = (() => {
    const MODS = {}, J = {}; let M = null, tm = [], nome = '';
    const $$ = id => document.getElementById(id);
    J.sh = a => embaralhar(a.slice());
    J.baralho = (dec = 1) => { const b = []; for (let d = 0; d < dec; d++) for (let n = 0; n < 4; n++) for (let v = 0; v < 13; v++) b.push({ naipe: n, valor: v, id: `${n}-${v}-${d}` }); return b; };
    J.ord = cs => cs.sort((a, b) => ORDEM_MAO.indexOf(a.naipe) - ORDEM_MAO.indexOf(b.naipe) || a.valor - b.valor);
    J.carta = (c, o = {}) => `<span class="jg-c${o.sel ? ' sel' : ''}${o.off ? ' off' : ''}"${o.a ? ` data-a="${o.a}" data-id="${c.id}"` : ''}>${criarElementoCarta(c).outerHTML}</span>`;
    J.verso = (a) => `<span class="jg-c"${a ? ` data-a="${a}"` : ''}><div class="carta verso"></div></span>`;
    J.mao = (cs, f) => `<div class="jg-mao">${cs.map(c => J.carta(c, f ? f(c) : {})).join('')}</div>`;
    J.costas = n => `<div class="jg-mao">${Array.from({ length: n }, () => J.verso()).join('')}</div>`;
    J.nome = p => `<div class="jg-nome">${p.foto ? `<img src="${p.foto}" alt="">` : ''}<b>${p.nome}</b></div>`;
    J.eu = () => ({ nome: (typeof jogadorHumano !== 'undefined' && jogadorHumano && jogadorHumano.nome) || 'Você', foto: (jogadorHumano && jogadorHumano.foto) || '' });
    J.bots = n => embaralhar(PERSONAGENS.filter(p => !jogadorHumano || p.id !== jogadorHumano.id).slice()).slice(0, n).map(p => ({ nome: p.nome, foto: p.foto }));
    J.mesa = h => { $$('jgMesa').innerHTML = h; };
    J.msg = t => { $$('jgMsg').textContent = t || ''; };
    J.ctrl = h => { $$('jgControles').innerHTML = h; };
    J.info = t => { $$('jgInfo').textContent = t || ''; };
    J.btn = (a, t, o = {}) => `<button type="button" data-a="${a}"${o.d ? ' disabled' : ''}${o.v !== undefined ? ` data-v="${o.v}"` : ''} class="${o.s ? 'sec' : ''}">${t}</button>`;
    J.espera = (fn, ms) => { const m = M; const t = setTimeout(() => { if (M === m && m) fn(); }, ms); tm.push(t); return t; };
    J.rnd = n => Math.floor(Math.random() * n);
    function modal(h, bts, fixo) {
        const box = $$('jgModalBox'); box.innerHTML = h + bts.map((b, i) => `<button type="button" class="${b.sec ? 'btn-sec' : 'btn-modo'}" data-i="${i}" style="margin:8px 0 0">${b.t}</button>`).join('');
        $$('jgModal').dataset.fixo = fixo ? '1' : ''; $$('jgModal').classList.remove('escondido');
        box.querySelectorAll('button[data-i]').forEach(b => { b.onclick = () => { const x = bts[+b.dataset.i]; if (!x.keep) fechar(); if (x.fn) x.fn(b); }; });
    }
    function fechar() { $$('jgModal').classList.add('escondido'); }
    // fim de mão/partida: fecha SOMENTE no clique do botão (sem tempo automático e sem fechar tocando fora)
    J.fim = (titulo, h, bts) => modal(`<h2>${titulo}</h2>${h}`, bts, true);
    function placar() {
        if (!M) return;
        modal(`<h2>${M.icone} Placar · ${M.nome}</h2>${M.placar()}`, [
            { t: '📖 Regras', sec: 1, keep: 1, fn: () => modal(`<h2>${M.icone} Regras · ${M.nome}</h2><div class="regras">${M.regras}</div>`, [{ t: '⬅ Voltar', fn: placar }]) },
            { t: '🚪 Sair do jogo', sec: 1, keep: 1, fn: b => confirmarToque(b, () => sairParaMenu('telaModo')) },
            { t: 'Fechar' }]);
    }
    function iniciar(id) {
        if (!MODS[id]) return;
        parar(); bloquearOrientacaoRetrato && bloquearOrientacaoRetrato();
        M = MODS[id](J); M.id = id;
        mostrarTela('telaJogos'); $$('jgTitulo').textContent = `${M.icone} ${M.nome}`; J.msg(''); J.info(''); fechar();
        M.start();
    }
    function parar() { tm.forEach(clearTimeout); tm = []; if (M && M.parar) M.parar(); M = null; const m = $$('jgModal'); if (m) m.classList.add('escondido'); }
    function clique(ev) {
        const e = ev.target.closest('[data-a]');
        if (!M || !e || e.disabled) return;
        M.click(e.dataset.a, e.dataset, e);
    }
    $$('jgMesa').addEventListener('click', clique); $$('jgControles').addEventListener('click', clique);
    $$('btnJgPlacar').onclick = placar;
    $$('jgModal').addEventListener('click', e => { if (e.target === $$('jgModal') && !$$('jgModal').dataset.fixo) fechar(); });
    const reg = (id, f) => { MODS[id] = f; };
    const info = { truco: ['♦', 'Truco', 'Truco paulista 1×1: manilhas, truco, seis, nove e doze'], maumau: ['♣', 'Mau-mau', 'Livre-se de todas as cartas antes das máquinas'], pife: ['♥', 'Pife', 'Forme trincas e sequências com as 9 cartas e bata'], buraco: ['♠', 'Buraco', 'Baixe jogos, faça canastras e bata'], bridge: ['♠', 'Bridge', 'Leilão e jogo em dupla com o parceiro'], paciencia: ['♦', 'Paciência', 'Klondike: monte as 4 fundações do Ás ao Rei'] };
    document.querySelectorAll('[data-jogo]').forEach(b => { b.onclick = () => { JOGO = b.dataset.jogo; aplicarJogoNaTelaModo(); mostrarTela('telaModo'); }; });
    return { reg, iniciar, parar, info, J };
})();

// ---------------- TRUCO (paulista, 1×1, até 12 pontos) ----------------
Jogos.reg('truco', J => {
    const ORD = [2, 3, 4, 5, 10, 9, 11, 12, 0, 1], NS = { 2: 0, 0: 1, 1: 2, 3: 3 }, NM = { 3: 'Truco', 6: 'Seis', 9: 'Nove', 12: 'Doze' };
    const prox = v => v === 1 ? 3 : v === 3 ? 6 : v === 6 ? 9 : 12;
    const rk = c => ORD.indexOf(c.valor);
    let S = null, pts = [0, 0], mao = 0, nomes = [];
    const F = c => c.valor === S.man ? 100 + NS[c.naipe] : rk(c);
    const q = cs => cs.length ? cs.reduce((a, c) => a + (F(c) >= 100 ? 1 : rk(c) / 11), 0) / cs.length : 0;
    function start() { pts = [0, 0]; mao = 0; nomes = [J.eu(), J.bots(1)[0]]; novaMao(); }
    function novaMao() {
        mao++;
        const b = J.sh(J.baralho().filter(c => ORD.includes(c.valor)));
        S = { m: [b.splice(0, 3), b.splice(0, 3)], vira: b.pop(), mesa: [null, null], vaz: [], valor: 1, tr: -1, fase: 'jogo', turno: mao % 2 ? 0 : 1, pend: 0, txt: '' };
        S.man = ORD[(rk(S.vira) + 1) % 10]; S.start = S.lider = S.turno;
        S.txt = S.turno === 0 ? 'Você abre a mão.' : `${nomes[1].nome} abre a mão.`;
        render(); vez();
    }
    function vez() { if (S && S.fase === 'jogo' && S.turno === 1) J.espera(bot, 1000); }
    function bot() {
        if (!S || S.fase !== 'jogo' || S.turno !== 1) return;
        const m = S.m[1], f = q(m);
        if (S.valor < 12 && S.tr !== 1 && f > 0.62 && Math.random() < 0.3) { S.pend = prox(S.valor); S.tr = 1; S.fase = 'resp'; S.txt = `${nomes[1].nome}: ${NM[S.pend]}!`; render(); return; }
        const o = m.slice().sort((a, b) => F(a) - F(b));
        const c = S.mesa[0] ? (o.find(x => F(x) > F(S.mesa[0])) || o[0]) : (S.vaz.length === 0 ? o[Math.floor(o.length / 2)] : o[o.length - 1]);
        jogar(1, c);
    }
    function jogar(i, c) {
        S.m[i] = S.m[i].filter(x => x !== c); S.mesa[i] = c; S.txt = '';
        if (S.mesa[0] && S.mesa[1]) { S.turno = -1; render(); J.espera(resolver, 1200); }
        else { S.turno = 1 - i; render(); vez(); }
    }
    function decidir() {
        const v = S.vaz, w = x => v.filter(y => y === x).length;
        if (w(0) >= 2) return 0; if (w(1) >= 2) return 1;
        if (v.length === 2) { if (v[0] !== -1 && v[1] === -1) return v[0]; if (v[0] === -1 && v[1] !== -1) return v[1]; }
        if (v.length === 3) return v[2] !== -1 ? v[2] : v[0] !== -1 ? v[0] : S.start;
        return null;
    }
    function resolver() {
        const a = F(S.mesa[0]), b = F(S.mesa[1]), w = a > b ? 0 : b > a ? 1 : -1;
        S.vaz.push(w); S.mesa = [null, null];
        const r = decidir();
        if (r !== null) return fimMao(r, '');
        S.turno = w >= 0 ? w : S.lider; S.lider = S.turno;
        S.txt = w === -1 ? 'Empatou (embucharam)!' : w === 0 ? 'Você levou a vaza.' : `${nomes[1].nome} levou a vaza.`;
        render(); vez();
    }
    function fimMao(w, motivo) {
        S.fase = 'fim'; const v = S.valor; pts[w] += v; render();
        const fim = pts[w] >= 12;
        const t = `<p>${w === 0 ? '✅ Você' : '❌ ' + nomes[1].nome} ganhou a mão${motivo ? ' (' + motivo + ')' : ''}: <b>+${v} ponto${v > 1 ? 's' : ''}</b></p><p>Placar: <b>${pts[0]}</b> × <b>${pts[1]}</b> <small>(vence quem chegar a 12)</small></p>`;
        if (fim) J.fim(w === 0 ? '🏆 Você venceu a partida!' : '😤 Você perdeu a partida', t, [{ t: 'Nova partida', fn: start }, { t: 'Sair para o menu', sec: 1, fn: () => sairParaMenu('telaModo') }]);
        else J.fim(`Fim da mão ${mao}`, t, [{ t: 'Próxima mão', fn: novaMao }]);
    }
    function respBot() {
        const f = q(S.m[1]), thr = { 3: 0.42, 6: 0.55, 9: 0.65, 12: 0.75 }[S.pend], r = f + Math.random() * 0.25 - 0.05;
        if (r > thr + 0.25 && S.pend < 12 && Math.random() < 0.5) { S.valor = S.pend; S.pend = prox(S.valor); S.tr = 1; S.fase = 'resp'; S.txt = `${nomes[1].nome} aceitou e pediu ${NM[S.pend]}!`; render(); }
        else if (r > thr) { S.valor = S.pend; S.fase = 'jogo'; S.txt = `${nomes[1].nome} aceitou: vale ${S.valor}.`; render(); vez(); }
        else fimMao(0, `${nomes[1].nome} correu`);
    }
    function click(a, d) {
        if (!S) return;
        if (a === 'c' && S.fase === 'jogo' && S.turno === 0) jogar(0, S.m[0].find(c => c.id === d.id));
        else if (a === 'truco' && S.fase === 'jogo' && S.turno === 0 && S.valor < 12 && S.tr !== 0) { S.pend = prox(S.valor); S.tr = 0; S.fase = 'espera'; S.txt = `Você pediu ${NM[S.pend]}!`; render(); J.espera(respBot, 900); }
        else if (a === 'ac' && S.fase === 'resp') { S.valor = S.pend; S.fase = 'jogo'; S.txt = `Valendo ${S.valor}.`; render(); vez(); }
        else if (a === 'cor' && S.fase === 'resp') fimMao(1, 'você correu');
        else if (a === 'aum' && S.fase === 'resp' && S.pend < 12) { S.valor = S.pend; S.pend = prox(S.valor); S.tr = 0; S.fase = 'espera'; S.txt = `Você pediu ${NM[S.pend]}!`; render(); J.espera(respBot, 900); }
    }
    function render() {
        const eu = S.turno === 0 && S.fase === 'jogo', slot = (c, r) => c ? J.carta(c) : '<span class="jg-vazio"></span>';
        J.info(`Mão ${mao} · ${pts[0]} × ${pts[1]}`);
        J.mesa(`<div class="jg-lin">${J.nome(nomes[1])}<small>${pts[1]} pts</small>${J.costas(S.m[1].length)}</div>
            <div class="jg-centro">
              <div class="jg-casa"><i>Vira</i>${J.carta(S.vira)}<small>Manilha: ${FACES[S.man]}</small></div>
              <div class="jg-casa"><i>${nomes[1].nome}</i>${slot(S.mesa[1])}</div>
              <div class="jg-casa"><i>Você</i>${slot(S.mesa[0])}</div>
              <div class="jg-casa"><i>Vale</i><b class="jg-valor">${S.valor}</b><small>Vazas: ${S.vaz.map(x => x === 0 ? '🟢' : x === 1 ? '🔴' : '⚪').join('') || '—'}</small></div>
            </div>
            <div class="jg-lin jg-eu">${J.nome(nomes[0])}<small>${pts[0]} pts</small>${J.mao(S.m[0], c => ({ a: eu ? 'c' : '' }))}</div>`);
        J.msg(S.txt);
        J.ctrl(S.fase === 'resp' ? J.btn('ac', `Aceitar (${S.pend})`) + J.btn('cor', 'Correr', { s: 1 }) + (S.pend < 12 ? J.btn('aum', `Aumentar p/ ${prox(S.pend)}`, { s: 1 }) : '')
            : (S.fase === 'jogo' && S.turno === 0 && S.valor < 12 && S.tr !== 0 ? J.btn('truco', `${NM[prox(S.valor)]}!`) : ''));
    }
    return {
        nome: 'Truco', icone: '♦', start, click,
        placar: () => `<p><b>Mão ${mao}</b></p><p>Você: <b>${pts[0]}</b></p><p>${nomes[1] ? nomes[1].nome : ''}: <b>${pts[1]}</b></p><p class="sub">Vence quem chegar a 12 pontos.</p>`,
        regras: `<p><b>Truco paulista 1×1:</b> baralho de 40 cartas (sem 8, 9 e 10), 3 cartas para cada um. A <b>vira</b> define a manilha: a carta seguinte na ordem.</p>
        <p><b>Ordem (menor → maior):</b> 4, 5, 6, 7, Dama, Valete, Rei, Ás, 2, 3. As <b>manilhas</b> vencem tudo; entre elas: ♦ &lt; ♠ &lt; ♥ &lt; ♣.</p>
        <p><b>Mão:</b> melhor de 3 vazas. Empate na 1ª: quem ganhar a 2ª leva. 1ª ganha e 2ª empatada: leva quem ganhou a 1ª. Tudo empatado: leva quem abriu a mão.</p>
        <p><b>Valor:</b> a mão vale 1 ponto. Qualquer um pode pedir <b>Truco</b> (3), <b>Seis</b>, <b>Nove</b> e <b>Doze</b>. Quem recebe o pedido aceita, corre (o outro leva o valor anterior) ou aumenta.</p>
        <p><b>Fim:</b> vence quem chegar a 12 pontos.</p>`
    };
});

// ---------------- MAU-MAU ----------------
Jogos.reg('maumau', J => {
    let S = null, vit = [0, 0, 0], js = [];
    const A7 = 5, AS = 12, VAL = 9;
    const topo = () => S.desc[S.desc.length - 1], naipe = () => S.nai !== null ? S.nai : topo().naipe;
    const pode = c => S.pen > 0 ? c.valor === A7 : (c.valor === VAL || c.naipe === naipe() || c.valor === topo().valor);
    function start() {
        js = [J.eu(), ...J.bots(2)];
        const b = J.sh(J.baralho());
        S = { m: [0, 1, 2].map(() => b.splice(0, 7)), monte: b, desc: [], turno: 0, pen: 0, nai: null, mm: false, comprou: false, fase: 'jogo', txt: 'Sua vez. Jogue naipe ou valor igual.' };
        do { S.desc.push(S.monte.pop()); } while ([A7, AS, VAL].includes(topo().valor) && S.monte.length);
        J.ord(S.m[0]); render(); vez();
    }
    function compra(i, k) {
        for (let n = 0; n < k; n++) {
            if (!S.monte.length) { const t = S.desc.pop(); S.monte = J.sh(S.desc); S.desc = [t]; }
            if (S.monte.length) S.m[i].push(S.monte.pop());
        }
        if (i === 0) J.ord(S.m[0]);
    }
    function vez() {
        const i = S.turno;
        if (S.pen > 0 && !S.m[i].some(c => c.valor === A7)) { J.espera(() => { compra(i, S.pen); S.txt = `${js[i].nome} comprou ${S.pen} cartas.`; S.pen = 0; passa(); }, i === 0 ? 1200 : 900); render(); return; }
        S.comprou = false; render();
        if (i !== 0) J.espera(() => bot(i), 1000);
    }
    function passa() { const salto = S.pula ? 2 : 1; S.pula = false; S.turno = (S.turno + salto) % 3; render(); vez(); }
    function bot(i) {
        const m = S.m[i], ok = m.filter(pode);
        if (!ok.length) { compra(i, 1); const c = m[m.length - 1]; if (pode(c)) return jogar(i, c); S.txt = `${js[i].nome} comprou e passou.`; return passa(); }
        const cnt = n => m.filter(c => c.naipe === n).length;
        ok.sort((a, b) => (a.valor === VAL) - (b.valor === VAL) || cnt(b.naipe) - cnt(a.naipe));
        jogar(i, ok[0]);
    }
    function jogar(i, c) {
        S.m[i] = S.m[i].filter(x => x !== c); S.desc.push(c); S.nai = null; S.txt = `${js[i].nome} jogou ${nomeCarta(c)}.`;
        if (c.valor === A7) S.pen += 2;
        if (c.valor === AS) S.pula = true;
        if (!S.m[i].length) return fim(i);
        if (i === 0 && S.m[0].length === 1 && !S.mm) { compra(0, 2); S.txt = 'Esqueceu de falar Mau-mau! Comprou 2 cartas.'; }
        S.mm = false;
        if (c.valor === VAL) {
            if (i === 0) { S.fase = 'naipe'; render(); return; }
            const cn = [0, 1, 2, 3].map(n => S.m[i].filter(x => x.naipe === n).length); S.nai = cn.indexOf(Math.max(...cn)); S.txt += ` Escolheu ${NAIPES[S.nai].s}.`;
        }
        passa();
    }
    function fim(i) {
        S.fase = 'fim'; vit[i]++; render();
        J.fim(i === 0 ? '🏆 Você bateu!' : `😤 ${js[i].nome} bateu`, `<p>Vitórias: ${js.map((p, k) => `${k === 0 ? 'Você' : p.nome} <b>${vit[k]}</b>`).join(' · ')}</p>`, [{ t: 'Nova partida', fn: start }, { t: 'Sair para o menu', sec: 1, fn: () => sairParaMenu('telaModo') }]);
    }
    function click(a, d) {
        if (!S) return;
        if (S.fase === 'naipe' && a === 'nai') { S.nai = +d.v; S.fase = 'jogo'; S.txt = `Você escolheu ${NAIPES[S.nai].s}.`; return passa(); }
        if (S.turno !== 0 || S.fase !== 'jogo' || (S.pen > 0 && !S.m[0].some(c => c.valor === A7))) return;
        if (a === 'c') { const c = S.m[0].find(x => x.id === d.id); if (c && pode(c)) jogar(0, c); else { S.txt = 'Essa carta não pode ser jogada agora.'; render(); } }
        else if (a === 'comprar' && !S.comprou && S.pen === 0) { compra(0, 1); S.comprou = true; S.txt = 'Você comprou. Jogue se der, ou passe.'; render(); }
        else if (a === 'compraPen' && S.pen > 0) { const k = S.pen; compra(0, k); S.pen = 0; S.txt = `Você comprou ${k} cartas.`; passa(); }
        else if (a === 'passar' && S.comprou) { S.txt = 'Você passou.'; passa(); }
        else if (a === 'mm') { S.mm = !S.mm; render(); }
    }
    function render() {
        const eu = S.turno === 0 && S.fase === 'jogo';
        J.info(`Monte ${S.monte.length}`);
        J.mesa(`<div class="jg-bots">${[1, 2].map(i => `<div class="jg-lin ${S.turno === i ? 'vez' : ''}">${J.nome(js[i])}<small>${S.m[i].length} cartas</small>${J.costas(Math.min(S.m[i].length, 9))}</div>`).join('')}</div>
            <div class="jg-centro"><div class="jg-casa"><i>Monte</i>${J.verso()}<small>${S.monte.length}</small></div>
            <div class="jg-casa"><i>Descarte</i>${J.carta(topo())}<small>Naipe: ${NAIPES[naipe()].s}${S.pen ? ' · +' + S.pen : ''}</small></div></div>
            <div class="jg-lin jg-eu ${eu ? 'vez' : ''}">${J.nome(js[0])}<small>${S.m[0].length} cartas</small>${J.mao(S.m[0], c => ({ a: eu ? 'c' : '', off: eu && !pode(c) }))}</div>`);
        J.msg(S.fase === 'naipe' ? 'Valete: escolha o naipe.' : S.txt);
        J.ctrl(S.fase === 'naipe' ? [0, 1, 2, 3].map(n => J.btn('nai', NAIPES[n].s + ' ' + NAIPES[n].nome, { v: n })).join('')
            : eu && !(S.pen > 0 && !S.m[0].some(c => c.valor === A7)) ? (S.pen === 0 ? J.btn('comprar', 'Comprar', { d: S.comprou }) + (S.comprou ? J.btn('passar', 'Passar', { s: 1 }) : '') : J.btn('compraPen', 'Comprar ' + S.pen, { s: 1 })) + (S.m[0].length <= 2 ? J.btn('mm', S.mm ? '✔ Mau-mau!' : 'Mau-mau!', { s: !S.mm }) : '') : '');
    }
    return {
        nome: 'Mau-mau', icone: '♣', start, click,
        placar: () => `<p>${js.map((p, k) => `${k === 0 ? 'Você' : p.nome}: <b>${vit[k]}</b> vitória${vit[k] === 1 ? '' : 's'}`).join('</p><p>')}</p>`,
        regras: `<p><b>Objetivo:</b> ser o primeiro a ficar sem cartas. Cada um começa com 7.</p>
        <p><b>Jogar:</b> baixe uma carta do <b>mesmo naipe</b> ou do <b>mesmo valor</b> da que está no descarte. Sem carta para jogar, compre uma (e jogue se der, ou passe).</p>
        <p><b>Cartas especiais:</b> <b>7</b> = o próximo compra 2 (acumula com outro 7) · <b>Ás</b> = o próximo perde a vez · <b>Valete</b> = vale em qualquer carta e você escolhe o naipe.</p>
        <p><b>Mau-mau!:</b> com 2 cartas na mão, aperte <b>Mau-mau!</b> antes de baixar a penúltima. Se esquecer, compra 2.</p>`
    };
});

// ---------------- PIFE (9 cartas, 2 baralhos, trincas e sequências) ----------------
Jogos.reg('pife', J => {
    const valido = g => {
        if (g.length < 3) return false;
        if (g.every(c => c.valor === g[0].valor)) return new Set(g.map(c => c.naipe)).size === g.length;
        if (!g.every(c => c.naipe === g[0].naipe)) return false;
        const seq = v => v.every((x, i) => i === 0 || x === v[i - 1] + 1);
        let v = g.map(c => c.valor).sort((a, b) => a - b);
        if (seq(v)) return true;
        if (v.includes(12)) { v = v.map(x => x === 12 ? -1 : x).sort((a, b) => a - b); return seq(v); }
        return false;
    };
    const cov = cs => {
        if (cs.length < 3) return 0;
        const [c, ...r] = cs; let b = cov(r);
        for (let k = 1; k < (1 << r.length); k++) {
            const g = [c], rest = [];
            r.forEach((x, i) => (k >> i) & 1 ? g.push(x) : rest.push(x));
            if (g.length >= 3 && valido(g)) b = Math.max(b, g.length + cov(rest));
        }
        return b;
    };
    const completo = cs => cov(cs) === cs.length;
    let S = null, js = [], vit = [0, 0, 0];
    function start() {
        js = [J.eu(), ...J.bots(2)];
        const b = J.sh(J.baralho(2));
        S = { m: [0, 1, 2].map(() => b.splice(0, 9)), monte: b, desc: [], turno: 0, fase: 'comprar', sel: null, txt: 'Sua vez: compre do Monte ou pegue o Descarte.' };
        S.desc.push(S.monte.pop()); J.ord(S.m[0]); render();
    }
    const bate = () => S.m[0].find(c => completo(S.m[0].filter(x => x !== c)));
    function comprar(i, deLixo) {
        if (deLixo) S.m[i].push(S.desc.pop());
        else { if (!S.monte.length) { const t = S.desc.pop(); S.monte = J.sh(S.desc); S.desc = [t]; } S.m[i].push(S.monte.pop()); }
    }
    function descartar(i, c) {
        S.m[i] = S.m[i].filter(x => x !== c); S.desc.push(c);
        if (completo(S.m[i])) return fim(i);
        S.turno = (i + 1) % 3; S.fase = 'comprar'; S.sel = null;
        if (S.turno === 0) { S.txt = `${js[i].nome} descartou ${nomeCarta(c)}. Sua vez.`; render(); }
        else { S.txt = `${js[i].nome} descartou ${nomeCarta(c)}.`; render(); J.espera(bot, 1100); }
    }
    function bot() {
        const i = S.turno, base = cov(S.m[i]), top = S.desc[S.desc.length - 1], h = S.m[i].concat(top);
        const melhorLixo = Math.max(...h.map((x, k) => cov(h.filter((_, j) => j !== k))));
        const lixo = melhorLixo > base; comprar(i, lixo);
        const m = S.m[i]; let best = null, bv = -1;
        m.forEach((c, k) => { const v = cov(m.filter((_, j) => j !== k)) * 100 - (c.valor === 12 ? 0 : 0) + (c.valor >= 9 ? 1 : 0); if (v > bv) { bv = v; best = c; } });
        descartar(i, best);
    }
    function fim(i) {
        S.fase = 'fim'; vit[i]++; render();
        J.fim(i === 0 ? '🏆 Você bateu!' : `😤 ${js[i].nome} bateu`, `<p>Vitórias: ${js.map((p, k) => `${k === 0 ? 'Você' : p.nome} <b>${vit[k]}</b>`).join(' · ')}</p>`, [{ t: 'Nova partida', fn: start }, { t: 'Sair para o menu', sec: 1, fn: () => sairParaMenu('telaModo') }]);
    }
    function click(a, d) {
        if (!S || S.turno !== 0) return;
        if (a === 'monte' && S.fase === 'comprar') { comprar(0, false); J.ord(S.m[0]); S.fase = 'descartar'; const b = bate(); S.txt = b ? `Dá para bater! Descarte ${nomeCarta(b)}.` : 'Escolha uma carta para descartar.'; render(); }
        else if (a === 'lixo' && S.fase === 'comprar' && S.desc.length) { comprar(0, true); J.ord(S.m[0]); S.fase = 'descartar'; const b = bate(); S.txt = b ? `Dá para bater! Descarte ${nomeCarta(b)}.` : 'Escolha uma carta para descartar.'; render(); }
        else if (a === 'c' && S.fase === 'descartar') { S.sel = S.sel === d.id ? null : d.id; render(); }
        else if (a === 'desc' && S.fase === 'descartar' && S.sel) descartar(0, S.m[0].find(c => c.id === S.sel));
        else if (a === 'bater' && S.fase === 'descartar') { const b = bate(); if (b) descartar(0, b); }
        else if (a === 'ord') { J.ord(S.m[0]); render(); }
    }
    function render() {
        const d = S.turno === 0 && S.fase === 'descartar', top = S.desc[S.desc.length - 1];
        J.info(`Monte ${S.monte.length}`);
        J.mesa(`<div class="jg-bots">${[1, 2].map(i => `<div class="jg-lin ${S.turno === i ? 'vez' : ''}">${J.nome(js[i])}<small>${S.m[i].length} cartas</small>${J.costas(S.m[i].length)}</div>`).join('')}</div>
            <div class="jg-centro"><div class="jg-casa"><i>Monte</i>${J.verso(S.turno === 0 && S.fase === 'comprar' ? 'monte' : '')}<small>${S.monte.length}</small></div>
            <div class="jg-casa"><i>Descarte</i>${top ? J.carta(top, { a: S.turno === 0 && S.fase === 'comprar' ? 'lixo' : '' }) : '<span class="jg-vazio"></span>'}</div></div>
            <div class="jg-lin jg-eu ${S.turno === 0 ? 'vez' : ''}">${J.nome(js[0])}<small>${S.m[0].length} cartas</small>${J.mao(S.m[0], c => ({ a: d ? 'c' : '', sel: S.sel === c.id }))}</div>`);
        J.msg(S.txt);
        J.ctrl(J.btn('ord', 'Ordenar', { s: 1 }) + (d ? J.btn('desc', 'Descartar', { d: !S.sel }) + (bate() ? J.btn('bater', 'Bater!') : '') : ''));
    }
    return {
        nome: 'Pife', icone: '♥', start, click,
        placar: () => `<p>${js.map((p, k) => `${k === 0 ? 'Você' : p.nome}: <b>${vit[k]}</b> vitória${vit[k] === 1 ? '' : 's'}`).join('</p><p>')}</p>`,
        regras: `<p><b>Objetivo:</b> ser o primeiro a organizar as <b>9 cartas</b> da mão em jogos e bater. 2 baralhos, sem coringas.</p>
        <p><b>Jogos:</b> <b>trinca/quadra</b> (mesmo valor, naipes diferentes) ou <b>sequência</b> (3 ou mais cartas seguidas do mesmo naipe; o Ás vale antes do 2 ou depois do Rei).</p>
        <p><b>Vez:</b> compre uma carta do <b>Monte</b> ou pegue a do topo do <b>Descarte</b> e depois descarte uma carta (ficando com 9).</p>
        <p><b>Bater:</b> quando as 9 cartas restantes formam jogos completos (ex.: 3+3+3 ou 4+5). O jogo avisa quando dá para bater.</p>`
    };
});
