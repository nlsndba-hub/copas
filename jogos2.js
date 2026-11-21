// ================= JOGOS EXTRAS (parte 2): Paciência, Buraco e Bridge =================
// Usa o núcleo de jogos.js (Jogos.reg). Fim de mão/partida só fecha no clique do botão.

// ---------------- PACIÊNCIA (Klondike, compra 1 carta) ----------------
Jogos.reg('paciencia', J => {
    const R = c => c.valor === 12 ? 0 : c.valor + 1, COR = c => (c.naipe === 1 || c.naipe === 2) ? 1 : 0;
    let S = null, conf = false;
    function start() {
        conf = false; const b = J.sh(J.baralho());
        S = { col: [], stock: [], waste: [], fund: [[], [], [], []], sel: null, mov: 0, hist: [], txt: 'Toque numa carta e depois no destino. Toque 2× para mandar à fundação.' };
        for (let i = 0; i < 7; i++) S.col.push(b.splice(0, i + 1).map((c, k, a) => ({ c, up: k === a.length - 1 })));
        S.stock = b; render();
    }
    const snap = () => { S.hist.push(JSON.stringify({ col: S.col, stock: S.stock, waste: S.waste, fund: S.fund, mov: S.mov })); if (S.hist.length > 300) S.hist.shift(); };
    const topo = i => { const k = S.col[i]; return k.length ? k[k.length - 1] : null; };
    const podeCol = (c, i) => { const t = topo(i); return t ? (t.up && COR(t.c) !== COR(c) && R(t.c) === R(c) + 1) : R(c) === 12; };
    const podeFund = c => S.fund[c.naipe].length === R(c);
    function pega() { const s = S.sel; if (!s) return null; if (s.f === 'w') return S.waste.length ? [S.waste[S.waste.length - 1]] : null; return S.col[s.i].slice(s.k).map(x => x.c); }
    function tira() { const s = S.sel; if (s.f === 'w') S.waste.pop(); else { S.col[s.i].splice(s.k); const t = topo(s.i); if (t) t.up = true; } }
    function moverCol(i) {
        const cs = pega(); if (!cs || !podeCol(cs[0], i)) return false;
        snap(); tira(); S.col[i].push(...cs.map(c => ({ c, up: true }))); S.mov++; S.sel = null; S.txt = ''; render(); return true;
    }
    function moverFund(n) {
        const cs = pega(); if (!cs || cs.length !== 1 || cs[0].naipe !== n || !podeFund(cs[0])) { S.txt = 'Movimento inválido.'; S.sel = null; render(); return false; }
        snap(); tira(); S.fund[n].push(cs[0]); S.mov++; S.sel = null; S.txt = ''; render();
        if (S.fund.every(f => f.length === 13)) J.fim('🏆 Paciência concluída!', `<p>Você terminou em <b>${S.mov}</b> movimentos.</p>`, [{ t: 'Nova partida', fn: start }, { t: 'Sair para o menu', sec: 1, fn: () => sairParaMenu('telaModo') }]);
        return true;
    }
    function click(a, d) {
        if (!S) return;
        if (a === 'stock') { snap(); if (S.stock.length) S.waste.push(S.stock.pop()); else { S.stock = S.waste.reverse(); S.waste = []; } S.sel = null; S.txt = ''; render(); }
        else if (a === 'cw') {
            if (!S.waste.length) return; const c = S.waste[S.waste.length - 1];
            if (S.sel && S.sel.f === 'w') moverFund(c.naipe); else { S.sel = { f: 'w' }; render(); }
        } else if (a === 'cc') {
            const i = +d.i, k = +d.k, col = S.col[i], top = k === col.length - 1;
            if (!col[k].up) return;
            const mesma = S.sel && S.sel.f === 'c' && S.sel.i === i && S.sel.k === k;
            if (mesma) { if (top) moverFund(col[k].c.naipe); else { S.sel = null; render(); } }
            else if (S.sel && top && !(S.sel.f === 'c' && S.sel.i === i)) { if (!moverCol(i)) { S.sel = { f: 'c', i, k }; S.txt = ''; render(); } }
            else { S.sel = { f: 'c', i, k }; S.txt = ''; render(); }
        } else if (a === 'col') { if (S.sel && !moverCol(+d.i)) { S.txt = 'Só o Rei vai numa coluna vazia.'; S.sel = null; render(); } }
        else if (a === 'fun') { if (S.sel) moverFund(+d.v); }
        else if (a === 'undo') { if (S.hist.length) { Object.assign(S, JSON.parse(S.hist.pop()), { sel: null }); render(); } }
        else if (a === 'novo') { if (conf) start(); else { conf = true; render(); } }
    }
    function render() {
        const sw = S.sel && S.sel.f === 'w', top = S.waste[S.waste.length - 1];
        const fund = [0, 1, 2, 3].map(n => { const t = S.fund[n][S.fund[n].length - 1]; return `<span class="jg-slot" data-a="fun" data-v="${n}">${t ? criarElementoCarta(t).outerHTML : `<b class="jg-naipe ${NAIPES[n].cor}">${NAIPES[n].s}</b>`}</span>`; }).join('');
        const cols = S.col.map((col, i) => {
            let off = 0, h = '';
            col.forEach((e, k) => {
                const s = S.sel && S.sel.f === 'c' && S.sel.i === i && k >= S.sel.k;
                h += `<span class="jg-c${s ? ' sel' : ''}" ${e.up ? `data-a="cc" data-i="${i}" data-k="${k}"` : ''} style="top:calc(var(--cw)*${off.toFixed(2)})">${e.up ? criarElementoCarta(e.c).outerHTML : '<div class="carta verso"></div>'}</span>`;
                off += e.up ? 0.4 : 0.16;
            });
            return `<div class="jg-col" ${col.length ? '' : `data-a="col" data-i="${i}"`} style="min-height:calc(var(--cw)*${(off + 1.45 - (col.length ? (col[col.length - 1].up ? 0.4 : 0.16) : 0)).toFixed(2)})">${h}</div>`;
        }).join('');
        J.info(`Movimentos ${S.mov}`);
        J.mesa(`<div class="jg-pac"><div class="jg-topo">
            ${S.stock.length ? J.verso('stock') : '<span class="jg-slot" data-a="stock"><b class="jg-naipe">↻</b></span>'}
            <span class="jg-slot">${top ? J.carta(top, { a: 'cw', sel: sw }) : ''}</span><span class="jg-esp"></span>${fund}</div>
            <div class="jg-cols">${cols}</div></div>`);
        J.msg(S.txt);
        J.ctrl(J.btn('undo', '↩ Desfazer', { d: !S.hist.length, s: 1 }) + J.btn('novo', conf ? '⚠️ Toque de novo para confirmar' : 'Nova partida', { s: 1 }));
        conf = false;
    }
    return {
        nome: 'Paciência', icone: '♦', start, click,
        placar: () => `<p><b>Movimentos:</b> ${S ? S.mov : 0}</p><p><b>Fundações:</b> ${S ? S.fund.reduce((a, f) => a + f.length, 0) : 0} / 52 cartas</p>`,
        regras: `<p><b>Objetivo:</b> levar todas as cartas para as 4 <b>fundações</b> (uma por naipe), do Ás ao Rei.</p>
        <p><b>Colunas:</b> monte sequências em ordem <b>decrescente</b> alternando as cores (ex.: 6♥ sobre 7♠). Pode mover uma sequência inteira. Só o <b>Rei</b> (ou sequência iniciada por Rei) vai numa coluna vazia.</p>
        <p><b>Monte:</b> toque no monte para virar uma carta; quando acabar, toque de novo para reciclar o descarte.</p>
        <p><b>Como jogar:</b> toque na carta (ela fica destacada) e depois na coluna ou fundação de destino. Toque duas vezes na mesma carta para mandá-la à fundação. Há botão de desfazer.</p>`
    };
});

// ---------------- BURACO (você × 1 máquina, 2 baralhos, 2 = coringa) ----------------
Jogos.reg('buraco', J => {
    const W = c => c.valor === 0, PT = c => c.valor === 12 ? 15 : c.valor === 0 ? 20 : c.valor >= 6 ? 10 : 5;
    const pos = (c, alto) => c.valor === 12 ? (alto ? 14 : 1) : c.valor + 2;
    function validar(cs) {
        if (cs.length < 3) return null;
        const w = cs.filter(W), n = cs.filter(c => !W(c));
        if (w.length > 1 || n.length < 2) return null;
        if (n.every(c => c.valor === n[0].valor)) return { t: 's' };
        if (!n.every(c => c.naipe === n[0].naipe)) return null;
        for (const alto of [false, true]) {
            const p = n.map(c => pos(c, alto)).sort((a, b) => a - b);
            if (new Set(p).size !== p.length) continue;
            const s = Math.max(1, p[p.length - 1] - cs.length + 1);
            if (s <= p[0] && s + cs.length - 1 <= 14) return { t: 'q' };
        }
        return null;
    }
    const canast = g => g.length >= 7 && (validar(g) || {}).t === 'q';
    const temCan = i => B.melds[i].some(canast);
    let B = null, js = [], total = [0, 0], mao = 0;
    function start() { js = [J.eu(), J.bots(1)[0]]; total = [0, 0]; mao = 0; nova(); }
    function nova() {
        mao++; const b = J.sh(J.baralho(2));
        B = { m: [b.splice(0, 11), b.splice(0, 11)], monte: b, desc: [b.pop()], melds: [[], []], turno: 0, fase: 'comprar', sel: new Set(), txt: 'Sua vez: compre do Monte ou pegue o Descarte.' };
        J.ord(B.m[0]); render();
    }
    function comprar(i, lixo) {
        if (lixo) B.m[i].push(...B.desc.splice(0));
        else { if (!B.monte.length) { fim(-1); return false; } B.m[i].push(B.monte.pop()); }
        if (i === 0) J.ord(B.m[0]); return true;
    }
    const selCartas = () => B.m[0].filter(c => B.sel.has(c.id));
    const ordMeld = g => g.sort((a, b) => W(a) - W(b) || a.valor - b.valor);
    function aplica(cs, destino) {
        const novo = destino ? destino.concat(cs) : cs, v = validar(novo);
        if (!v) { B.txt = 'Esse jogo não é válido (sequência do mesmo naipe ou trinca do mesmo valor; no máx. 1 coringa).'; render(); return; }
        const resta = B.m[0].length - cs.length, can = canast(novo) || temCan(0);
        if (resta === 0 && !can) { B.txt = 'Guarde uma carta: para bater é preciso ter uma canastra.'; render(); return; }
        B.m[0] = B.m[0].filter(c => !B.sel.has(c.id)); B.sel.clear();
        if (destino) { destino.push(...cs); ordMeld(destino); } else B.melds[0].push(ordMeld(cs));
        B.txt = '';
        if (!B.m[0].length) return fim(0);
        render();
    }
    function click(a, d) {
        if (!B || B.turno !== 0) return;
        if (a === 'monte' && B.fase === 'comprar') { if (comprar(0, false)) { B.fase = 'jogar'; B.txt = 'Baixe jogos e descarte uma carta.'; render(); } }
        else if (a === 'lixo' && B.fase === 'comprar' && B.desc.length) { comprar(0, true); B.fase = 'jogar'; B.txt = 'Você pegou o lixo. Baixe jogos e descarte.'; render(); }
        else if (a === 'c' && B.fase === 'jogar') { B.sel.has(d.id) ? B.sel.delete(d.id) : B.sel.add(d.id); render(); }
        else if (a === 'baixar' && B.fase === 'jogar') { const cs = selCartas(); if (cs.length) aplica(cs, null); }
        else if (a === 'meld' && B.fase === 'jogar') { const cs = selCartas(); if (cs.length) aplica(cs, B.melds[0][+d.i]); else { B.txt = 'Selecione cartas e toque no jogo para completar.'; render(); } }
        else if (a === 'desc' && B.fase === 'jogar') {
            const cs = selCartas(); if (cs.length !== 1) return;
            if (B.m[0].length === 1 && !temCan(0)) { B.txt = 'Sem canastra você não pode bater: baixe mais jogos.'; render(); return; }
            B.m[0] = B.m[0].filter(c => c !== cs[0]); B.desc.push(cs[0]); B.sel.clear();
            if (!B.m[0].length) return fim(0);
            B.turno = 1; B.txt = `Você descartou ${nomeCarta(cs[0])}.`; render(); J.espera(bot, 1200);
        } else if (a === 'ord') { J.ord(B.m[0]); render(); }
    }
    function achar(m) {
        const n = m.filter(c => !W(c)), por = {};
        n.forEach(c => (por[c.valor] = por[c.valor] || []).push(c));
        for (const v in por) if (por[v].length >= 3) return por[v];
        for (let s = 0; s < 4; s++) {
            const mp = {}; n.filter(c => c.naipe === s).forEach(c => { [pos(c, false), pos(c, true)].forEach(p => { if (c.valor === 12 || p === pos(c, false)) mp[p] = mp[p] || c; }); });
            let run = [];
            for (let p = 1; p <= 15; p++) {
                if (mp[p]) run.push(mp[p]);
                else { const u = [...new Set(run)]; if (u.length >= 3 && validar(u)) return u; run = []; }
            }
        }
        return null;
    }
    function bot() {
        if (!B) return;
        const m = B.m[1], top = B.desc[B.desc.length - 1], g0 = top && acharJogo(m.concat(top));
        const uso = top && (B.melds[1].some(g => validar(g.concat(top))) || (g0 && g0.includes(top)));
        if (!comprar(1, !!uso)) return;
        let mudou = true, fez = [];
        while (mudou) {
            mudou = false; const g = achar(m);
            if (g && (m.length - g.length >= 2 || temCan(1))) { B.melds[1].push(ordMeld(g)); g.forEach(c => m.splice(m.indexOf(c), 1)); mudou = true; fez.push('jogo'); continue; }
            for (const c of m.slice()) {
                if (W(c)) continue;
                const al = B.melds[1].find(x => validar(x.concat(c)));
                if (al && (m.length - 1 >= 2 || temCan(1))) { al.push(c); ordMeld(al); m.splice(m.indexOf(c), 1); mudou = true; break; }
            }
        }
        if (!m.length) return fim(1);
        const cand = m.filter(c => !W(c)).length ? m.filter(c => !W(c)) : m;
        const viz = c => m.filter(x => x !== c && (x.valor === c.valor || (x.naipe === c.naipe && Math.abs(pos(x, false) - pos(c, false)) <= 2))).length;
        cand.sort((a, b) => viz(a) - viz(b) || PT(b) - PT(a));
        const d = cand[0]; m.splice(m.indexOf(d), 1); B.desc.push(d);
        B.txt = `${js[1].nome}${uso ? ' pegou o lixo,' : ''}${fez.length ? ' baixou jogos e' : ''} descartou ${nomeCarta(d)}.`;
        if (!m.length) return fim(1);
        B.turno = 0; B.fase = 'comprar'; render();
    }
    const acharJogo = acharFn => achar(acharFn);
    function fim(q) {
        B.fase = 'fim';
        const lin = [0, 1].map(i => {
            const mp = B.melds[i].reduce((a, g) => a + g.reduce((s, c) => s + PT(c), 0), 0);
            const bn = B.melds[i].reduce((a, g) => a + (canast(g) ? (g.some(W) ? 100 : 200) : 0), 0);
            const bt = i === q ? 100 : 0, mp2 = B.m[i].reduce((a, c) => a + PT(c), 0), s = mp + bn + bt - mp2;
            total[i] += s;
            return `<p><b>${i === 0 ? 'Você' : js[1].nome}</b>: jogos ${mp} + canastras ${bn}${bt ? ' + bater 100' : ''} − mão ${mp2} = <b>${s}</b> <small>(total ${total[i]})</small></p>`;
        }).join('');
        const acabou = Math.max(...total) >= 1500;
        const t = (q === 0 ? '🏆 Você bateu!' : q === 1 ? `😤 ${js[1].nome} bateu` : 'Acabou o monte') + (acabou ? ' · fim da partida' : ` · mão ${mao}`);
        render();
        J.fim(t, lin + (acabou ? `<h3>${total[0] >= total[1] ? '🏆 Você venceu!' : '😤 ' + js[1].nome + ' venceu'}</h3>` : '<p class="sub">Vence quem chegar a 1500 pontos.</p>'),
            acabou ? [{ t: 'Nova partida', fn: start }, { t: 'Sair para o menu', sec: 1, fn: () => sairParaMenu('telaModo') }] : [{ t: 'Próxima mão', fn: nova }]);
    }
    const meldsHTML = (i, clic) => `<div class="jg-melds">${B.melds[i].map((g, k) => `<div class="jg-meld ${canast(g) ? 'can' : ''}" ${clic ? `data-a="meld" data-i="${k}"` : ''}><div class="jg-mao jg-sm">${g.map(c => J.carta(c)).join('')}</div></div>`).join('') || '<small>Sem jogos baixados</small>'}</div>`;
    function render() {
        const j = B.turno === 0 && B.fase === 'jogar', cs = j ? selCartas() : [];
        J.info(`Mão ${mao} · ${total[0]} × ${total[1]}`);
        J.mesa(`<div class="jg-lin ${B.turno === 1 ? 'vez' : ''}">${J.nome(js[1])}<small>${B.m[1].length} cartas</small>${J.costas(Math.min(B.m[1].length, 12))}${meldsHTML(1, false)}</div>
            <div class="jg-centro"><div class="jg-casa"><i>Monte</i>${J.verso(B.turno === 0 && B.fase === 'comprar' ? 'monte' : '')}<small>${B.monte.length}</small></div>
            <div class="jg-casa"><i>Descarte</i>${B.desc.length ? J.carta(B.desc[B.desc.length - 1], { a: B.turno === 0 && B.fase === 'comprar' ? 'lixo' : '' }) : '<span class="jg-vazio"></span>'}<small>${B.desc.length} cartas</small></div></div>
            <div class="jg-lin jg-eu ${B.turno === 0 ? 'vez' : ''}">${J.nome(js[0])}<small>${B.m[0].length} cartas</small>${meldsHTML(0, j)}${J.mao(B.m[0], c => ({ a: j ? 'c' : '', sel: B.sel.has(c.id) }))}</div>`);
        J.msg(B.txt);
        J.ctrl(J.btn('ord', 'Ordenar', { s: 1 }) + (j ? J.btn('baixar', 'Baixar jogo', { d: cs.length < 3 }) + J.btn('desc', 'Descartar', { d: cs.length !== 1 }) : ''));
    }
    return {
        nome: 'Buraco', icone: '♠', start, click,
        placar: () => `<p>Você: <b>${total[0]}</b></p><p>${js[1] ? js[1].nome : ''}: <b>${total[1]}</b></p><p class="sub">Vence quem chegar a 1500. Mão ${mao}.</p>`,
        regras: `<p><b>Versão simplificada, 1×1:</b> 2 baralhos (104 cartas), 11 cartas cada. O <b>2</b> é coringa (no máx. 1 por jogo). Sem "morto" e sem coringas de baralho.</p>
        <p><b>Vez:</b> compre do Monte ou pegue <b>todo o descarte</b> (lixo); baixe jogos; descarte 1 carta.</p>
        <p><b>Jogos:</b> <b>sequência</b> (3+ cartas seguidas do mesmo naipe; Ás vale antes do 2 ou depois do Rei) ou <b>trinca</b> (3+ do mesmo valor). Selecione as cartas e toque em <b>Baixar jogo</b>; para completar um jogo seu, selecione e toque nele.</p>
        <p><b>Canastra:</b> sequência com 7+ cartas. <b>Limpa</b> (sem coringa) = 200 · <b>suja</b> = 100.</p>
        <p><b>Bater:</b> só com ao menos 1 canastra, ficando sem cartas: +100. A mão também acaba se o monte esvaziar.</p>
        <p><b>Pontos das cartas:</b> Ás 15 · 2 = 20 · Rei a 8 = 10 · 7 a 3 = 5. Cartas baixadas somam; cartas que sobram na mão subtraem.</p>`
    };
});

// ---------------- BRIDGE (você + Norte contra Oeste e Leste; 4 mãos) ----------------
Jogos.reg('bridge', J => {
    const DEN = ['♣', '♦', '♥', '♠', 'SA'], TR = [3, 2, 1, 0, null], ASS = ['Sul', 'Oeste', 'Norte', 'Leste'], MAOS = 4;
    let B = null, nomes = [], tot = [0, 0], mao = 0;
    const hcp = h => h.reduce((a, c) => a + Math.max(0, c.valor - 8), 0);
    const val = b => b.n * 5 + b.d, fmt = b => b ? b.n + DEN[b.d] : 'Passo';
    const alto = () => { for (let i = B.lances.length - 1; i >= 0; i--) if (B.lances[i].b) return B.lances[i]; return null; };
    const tr = () => B.c ? TR[B.c.d] : null;
    function start() { nomes = [J.eu().nome, ...J.bots(3).map(b => b.nome)]; tot = [0, 0]; mao = 0; nova(); }
    function nova() {
        mao++; const b = J.sh(J.baralho());
        B = { m: [0, 1, 2, 3].map(() => J.ord(b.splice(0, 13))), fase: 'leilao', dealer: (mao - 1) % 4, vez: (mao - 1) % 4, lances: [], nv: 1, trick: [null, null, null, null], ls: null, tricks: [0, 0], nj: 0, vis: false, txt: '' };
        B.txt = `Mão ${mao}: leilão começa por ${ASS[B.vez]}.`; render(); proxLance();
    }
    function proxLance() { if (B.vez !== 0) J.espera(() => lance(B.vez, botLance(B.vez)), 1000); }
    function botLance(s) {
        const h = B.m[s], p = hcp(h), cur = alto(), cnt = [0, 1, 2, 3].map(n => h.filter(c => c.naipe === n).length);
        if (B.lances.filter(x => x.s === s && x.b).length >= 2) return null;
        const longo = [0, 1, 2, 3].sort((a, b) => cnt[b] - cnt[a] || [0, 1, 2, 3].indexOf(a) - [0, 1, 2, 3].indexOf(b))[0], dn = n => TR.indexOf(n);
        const bal = cnt.every(x => x >= 2) && cnt.filter(x => x === 2).length <= 1;
        const menor = (d, min) => { for (let n = Math.max(1, min); n <= 7; n++) if (!cur || val({ n, d }) > val(cur.b)) return { n, d }; return null; };
        if (!cur) { if (p < 12) return null; if (bal && p >= 15 && p <= 17) return { n: 1, d: 4 }; const mj = [0, 1].filter(n => cnt[n] >= 5).sort((a, b) => cnt[b] - cnt[a])[0]; return { n: 1, d: dn(mj !== undefined ? mj : longo) }; }
        const parc = cur.s % 2 === s % 2;
        if (parc) {
            const sup = cur.b.d < 4 ? cnt[TR[cur.b.d]] : 0, pts = p + (sup >= 4 ? 2 : 0);
            if (cur.b.d === 4) return pts >= 10 ? menor(4, 3) : null;
            if (sup >= 3 && p >= 6) { const jogo = cur.b.d >= 2 ? 4 : 5; if (cur.b.n >= jogo) return null; return menor(cur.b.d, pts >= 13 ? jogo : pts >= 10 ? 3 : 2); }
            if (cnt[longo] >= 6 && p >= 10) { const b = menor(dn(longo), 1); return b && b.n <= 3 ? b : null; }
            return null;
        }
        if (p >= 12 && cnt[longo] >= 5) { const b = menor(dn(longo), 1); return b && b.n <= 2 ? b : null; }
        return null;
    }
    function lance(s, b) {
        B.lances.push({ s, b }); B.txt = `${ASS[s]}: ${fmt(b)}`; B.vez = (s + 1) % 4;
        const L = B.lances, algum = L.some(x => x.b);
        if (!algum && L.length === 4) { render(); return J.fim('Todos passaram', '<p>Nenhum contrato nesta mão.</p>', [{ t: 'Nova mão', fn: nova }]); }
        if (algum && L.length >= 4 && L.slice(-3).every(x => !x.b)) return contrato();
        render(); proxLance();
    }
    function contrato() {
        const a = alto(), c = a.b; B.c = c;
        B.decl = B.lances.find(x => x.b && x.b.d === c.d && x.s % 2 === a.s % 2).s; B.dummy = (B.decl + 2) % 4;
        B.fase = 'jogo'; B.vez = (B.decl + 1) % 4; B.txt = `Contrato ${fmt(c)} de ${ASS[B.decl]}. ${ASS[B.vez]} faz a saída.`; render(); proxJogada();
    }
    const ctrl = s => s === B.dummy ? B.decl : s;
    const legal = s => { const h = B.m[s]; if (B.ls === null) return h; const f = h.filter(c => c.naipe === B.ls); return f.length ? f : h; };
    function proxJogada() { if (B.fase === 'jogo' && B.vez >= 0 && ctrl(B.vez) !== 0) J.espera(() => joga(B.vez, escolher(B.vez)), 1000); }
    function escolher(s) {
        const leg = legal(s), t = tr();
        if (B.ls === null) {
            const nt = leg.filter(c => c.naipe !== t), pool = nt.length ? nt : leg, cnt = n => pool.filter(c => c.naipe === n).length;
            const suit = [0, 1, 2, 3].sort((a, b) => cnt(b) - cnt(a))[0], cs = pool.filter(c => c.naipe === suit).sort((a, b) => b.valor - a.valor);
            return cs[0].valor >= 11 ? cs[0] : cs[cs.length - 1];
        }
        const f = c => (t !== null && c.naipe === t) ? 100 + c.valor : (c.naipe === B.ls ? c.valor : -1);
        let wS = -1, wF = -9; B.trick.forEach((c, k) => { if (c && f(c) > wF) { wF = f(c); wS = k; } });
        const o = leg.slice().sort((a, b) => f(a) - f(b) || a.valor - b.valor);
        if (wS % 2 === s % 2) return o[0];
        return o.find(c => f(c) > wF) || o[0];
    }
    function joga(s, c) {
        B.m[s] = B.m[s].filter(x => x !== c); B.trick[s] = c; if (B.ls === null) B.ls = c.naipe; B.vis = true;
        if (B.trick.every(x => x)) { B.vez = -1; render(); return J.espera(fimVaza, 1400); }
        B.vez = (s + 1) % 4; B.txt = ''; render(); proxJogada();
    }
    function fimVaza() {
        const t = tr(), f = c => (t !== null && c.naipe === t) ? 100 + c.valor : (c.naipe === B.ls ? c.valor : -1);
        let w = 0; B.trick.forEach((c, k) => { if (f(c) > f(B.trick[w])) w = k; });
        B.tricks[w % 2]++; B.nj++; B.trick = [null, null, null, null]; B.ls = null; B.vez = w; B.txt = `${ASS[w]} levou a vaza.`;
        if (B.nj === 13) return fim();
        render(); proxJogada();
    }
    function fim() {
        B.fase = 'fim'; const c = B.c, lado = B.decl % 2, feitas = B.tricks[lado], need = 6 + c.n;
        const por = c.d < 2 ? 20 : c.d === 4 ? 30 : 30; let h = '';
        if (feitas >= need) {
            const base = c.n * por + (c.d === 4 ? 10 : 0), over = (feitas - need) * por, bon = base >= 100 ? 300 : 50, sl = c.n === 6 ? 500 : c.n === 7 ? 1000 : 0, s = base + over + bon + sl;
            tot[lado] += s; h = `<p>✅ ${lado === 0 ? 'Sua dupla' : 'Adversários'} cumpriu ${fmt(c)} (${feitas} vazas): <b>+${s}</b> <small>(contrato ${base}, extras ${over}, bônus ${bon + sl})</small></p>`;
        } else { const s = (need - feitas) * 50; tot[1 - lado] += s; h = `<p>❌ ${lado === 0 ? 'Sua dupla' : 'Adversários'} caiu em ${fmt(c)} (${feitas} de ${need} vazas): <b>+${s}</b> para ${lado === 0 ? 'os adversários' : 'sua dupla'}</p>`; }
        h += `<p>Total: <b>Vocês ${tot[0]}</b> × <b>Eles ${tot[1]}</b></p>`; render();
        const acabou = mao >= MAOS;
        J.fim(acabou ? '🏁 Fim da partida' : `Fim da mão ${mao}`, h + (acabou ? `<h3>${tot[0] > tot[1] ? '🏆 Sua dupla venceu!' : tot[0] === tot[1] ? '🤝 Empate' : '😤 Os adversários venceram'}</h3>` : ''),
            acabou ? [{ t: 'Nova partida', fn: start }, { t: 'Sair para o menu', sec: 1, fn: () => sairParaMenu('telaModo') }] : [{ t: 'Próxima mão', fn: nova }]);
    }
    function click(a, d) {
        if (!B) return;
        if (B.fase === 'leilao' && B.vez === 0) {
            const cur = alto();
            if (a === 'nv') { B.nv = +d.v; render(); }
            else if (a === 'den') { const b = { n: B.nv, d: +d.v }; if (!cur || val(b) > val(cur.b)) lance(0, b); }
            else if (a === 'passo') lance(0, null);
        } else if (B.fase === 'jogo' && a === 'c') {
            const s = B.m.findIndex(h => h.some(c => c.id === d.id));
            if (s !== B.vez || ctrl(s) !== 0) return;
            const c = B.m[s].find(x => x.id === d.id);
            if (legal(s).includes(c)) joga(s, c); else { B.txt = `Siga o naipe ${B.ls !== null ? NAIPES[B.ls].s : ''}.`; render(); }
        }
    }
    function render() {
        const jog = B.fase === 'jogo', ver = s => s === 0 || B.fase === 'fim' || (B.vis && s === B.dummy);
        const linha = s => {
            const meu = jog && B.vez === s && ctrl(s) === 0, leg = meu ? legal(s) : [];
            const tag = (B.c && s === B.decl ? ' · 🎯 Jogador' : '') + (B.c && s === B.dummy ? ' · Morto' : '');
            return `<div class="jg-lin ${B.vez === s ? 'vez' : ''}"><div class="jg-nome"><b>${ASS[s]}</b><small>${s === 0 ? 'você' : nomes[s]}${tag}</small></div>${ver(s) ? J.mao(B.m[s], c => ({ a: meu ? 'c' : '', off: meu && !leg.includes(c) })) : J.costas(B.m[s].length)}</div>`;
        };
        const slot = s => `<div class="jg-casa"><i>${ASS[s]}</i>${B.trick[s] ? J.carta(B.trick[s]) : '<span class="jg-vazio"></span>'}</div>`;
        const ct = B.c ? `${fmt(B.c)} · ${ASS[B.decl]}` : 'Leilão';
        J.info(`${ct} · Vazas ${B.tricks[0]}×${B.tricks[1]}`);
        J.mesa(`${linha(2)}<div class="jg-we">${linha(1)}${linha(3)}</div>
            <div class="jg-cruz"><div class="n">${slot(2)}</div><div class="w">${slot(1)}</div><div class="c"><small>Naipe de trunfo</small><b>${B.c ? (B.c.d === 4 ? 'Sem trunfo' : DEN[B.c.d]) : '—'}</b></div><div class="e">${slot(3)}</div><div class="s">${slot(0)}</div></div>
            ${linha(0)}`);
        J.msg(B.fase === 'leilao' ? (B.lances.map(x => `${ASS[x.s]} ${fmt(x.b)}`).join(' · ') || B.txt) : B.txt);
        if (B.fase === 'leilao' && B.vez === 0) {
            const cur = alto(), ok = (n, d) => !cur || val({ n, d }) > val(cur.b);
            J.ctrl(`<div class="jg-niv">${[1, 2, 3, 4, 5, 6, 7].map(n => J.btn('nv', n, { v: n, s: B.nv !== n, d: ![0, 1, 2, 3, 4].some(d => ok(n, d)) })).join('')}</div>` +
                [0, 1, 2, 3, 4].map(d => J.btn('den', `${B.nv}${DEN[d]}`, { v: d, d: !ok(B.nv, d) })).join('') + J.btn('passo', 'Passo', { s: 1 }));
        } else J.ctrl('');
    }
    return {
        nome: 'Bridge', icone: '♠', start, click,
        placar: () => `<p>Mão ${mao} de ${MAOS}</p><p>Sua dupla (Sul + Norte): <b>${tot[0]}</b></p><p>Adversários (Oeste + Leste): <b>${tot[1]}</b></p>`,
        regras: `<p><b>Jogo:</b> 4 jogadores em duplas: <b>você (Sul) + Norte</b> contra Oeste e Leste. 13 cartas cada. A partida tem ${MAOS} mãos.</p>
        <p><b>Leilão:</b> cada um passa ou faz um lance maior que o anterior (nível 1–7 + naipe ♣ &lt; ♦ &lt; ♥ &lt; ♠ &lt; SA). Lance de <b>N</b> promete <b>6+N vazas</b>. Acaba com 3 passos seguidos. O naipe do lance vira <b>trunfo</b> (SA = sem trunfo). Contra e recontra não existem nesta versão.</p>
        <p><b>Jogo:</b> quem primeiro citou o naipe do contrato é o <b>jogador</b>; seu parceiro é o <b>morto</b> (mãos abertas após a saída; o jogador comanda as duas). A saída é do jogador à esquerda. É obrigatório seguir o naipe; vence o maior trunfo ou o maior do naipe da saída.</p>
        <p><b>Pontos (sem vulnerabilidade):</b> contrato cumprido: ♣♦ 20 por vaza · ♥♠ 30 · SA 40 na 1ª e 30 nas demais; vazas extras valem o mesmo. Bônus: 50 (parcial) ou 300 (contrato ≥ 100); small slam (6) 500; grand slam (7) 1000. Contrato caído: 50 por vaza que faltou para os adversários.</p>
        <p><b>Força da mão (para o leilão):</b> Ás 4 · Rei 3 · Dama 2 · Valete 1.</p>`
    };
});
