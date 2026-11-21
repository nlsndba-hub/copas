// ================= BLACKJACK (você + 2 máquinas contra a banca, com fichas) =================
// Tela própria (#telaBlackjack). Banca compra até 17. Blackjack paga 3:2. Dobrar nas duas primeiras cartas.
const Blackjack = (() => {
    const FICHAS = 1000, MIN = 10, FICHAS_APOSTA = [10, 25, 50, 100], T = 750;
    let B = null;
    const valor = c => c.valor === 12 ? 11 : c.valor >= 8 ? 10 : c.valor + 2;
    function total(mao) {
        let t = mao.reduce((s, c) => s + valor(c), 0), as = mao.filter(c => c.valor === 12).length;
        while (t > 21 && as > 0) { t -= 10; as--; }
        return t;
    }
    const ehBJ = m => m.length === 2 && total(m) === 21;
    const eu = () => B.js[B.js.length - 1];
    const agendar = (fn, ms) => { clearTimeout(B.timer); B.timer = setTimeout(() => { if (B) fn(); }, ms || T); };

    function iniciar() {
        const h = jogadorHumano;
        const bots = embaralhar(PERSONAGENS.filter(p => !h || p.id !== h.id).slice()).slice(0, 2);
        const mk = (p, bot) => ({ nome: p.nome, foto: p.foto, bot, fichas: FICHAS, aposta: 0, mao: [], estado: '', res: '', fora: false });
        B = { rodada: 0, js: [...bots.map(p => mk(p, true)), mk(h || { nome: 'Você', foto: '' }, false)], banca: [], oculta: true, fase: 'aposta', vez: -1, msg: '', apostaTmp: 0, baralho: [], timer: null };
        mostrarTela('telaBlackjack');
        novaRodada();
    }
    function parar() {
        if (B && B.timer) clearTimeout(B.timer);
        B = null;
        const m = $('bjModal'); if (m) m.classList.add('escondido');
    }
    function novaRodada() {
        B.rodada++; B.banca = []; B.oculta = true; B.fase = 'aposta'; B.vez = -1; B.apostaTmp = 0; B.msg = 'Faça sua aposta.';
        B.js.forEach(j => {
            j.mao = []; j.estado = ''; j.res = ''; j.aposta = 0;
            if (j.fichas < MIN) j.fora = true;
            if (j.bot && !j.fora) { j.aposta = Math.min(j.fichas, [10, 25, 50][Math.floor(Math.random() * 3)]); j.fichas -= j.aposta; }
        });
        render();
    }
    function apostar() {
        const e = eu();
        if (B.apostaTmp < MIN || B.apostaTmp > e.fichas) return;
        e.aposta = B.apostaTmp; e.fichas -= e.aposta;
        B.baralho = embaralhar(criarBaralho());
        const ativos = B.js.filter(j => !j.fora);
        for (let k = 0; k < 2; k++) { ativos.forEach(j => j.mao.push(B.baralho.pop())); B.banca.push(B.baralho.pop()); }
        B.fase = 'jogando'; B.msg = '';
        if (ehBJ(B.banca)) { B.oculta = false; resolver(); return; }
        ativos.forEach(j => { if (ehBJ(j.mao)) j.estado = 'blackjack'; });
        B.vez = -1; proxima();
    }
    const pendente = j => !j.fora && !j.estado;
    function proxima() {
        let i = B.vez + 1;
        while (i < B.js.length && !pendente(B.js[i])) i++;
        B.vez = i;
        if (i >= B.js.length) { agendar(vezBanca, 500); render(); return; }
        render();
        if (B.js[i].bot) agendar(() => botPasso(i)); else B.msg = 'Sua vez.', render();
    }
    function botPasso(i) {
        const j = B.js[i];
        if (total(j.mao) < 17) { j.mao.push(B.baralho.pop()); if (total(j.mao) > 21) j.estado = 'estourou'; render(); if (j.estado) agendar(proxima); else agendar(() => botPasso(i)); }
        else { j.estado = 'parou'; proxima(); }
    }
    function acao(a) {
        if (!B || B.fase !== 'jogando' || B.vez !== B.js.length - 1) return;
        const e = eu();
        if (a === 'pedir') { e.mao.push(B.baralho.pop()); const t = total(e.mao); if (t > 21) e.estado = 'estourou'; else if (t === 21) e.estado = 'parou'; }
        else if (a === 'parar') e.estado = 'parou';
        else if (a === 'dobrar' && e.mao.length === 2 && e.fichas >= e.aposta) { e.fichas -= e.aposta; e.aposta *= 2; e.mao.push(B.baralho.pop()); e.estado = total(e.mao) > 21 ? 'estourou' : 'parou'; }
        else return;
        B.msg = '';
        if (e.estado) { render(); agendar(proxima, 500); } else render();
    }
    function vezBanca() {
        B.oculta = false; B.fase = 'banca'; B.vez = -1; B.msg = 'Vez da banca...'; render();
        const vivos = B.js.some(j => !j.fora && j.estado !== 'estourou');
        if (vivos) agendar(compraBanca); else agendar(resolver);
    }
    function compraBanca() {
        if (total(B.banca) < 17) { B.banca.push(B.baralho.pop()); render(); agendar(compraBanca); }
        else resolver();
    }
    function resolver() {
        const tb = total(B.banca), bb = ehBJ(B.banca);
        B.js.forEach(j => {
            if (j.fora || !j.aposta) return;
            const t = total(j.mao), bjj = ehBJ(j.mao);
            let ganho = 0, res;
            if (t > 21) res = 'perdeu';
            else if (bjj && !bb) { ganho = j.aposta + Math.floor(j.aposta * 1.5); res = 'blackjack'; }
            else if (bb && !bjj) res = 'perdeu';
            else if (tb > 21 || t > tb) { ganho = j.aposta * 2; res = 'ganhou'; }
            else if (t === tb) { ganho = j.aposta; res = 'empate'; }
            else res = 'perdeu';
            j.fichas += ganho; j.res = res; j.delta = ganho - j.aposta;
        });
        B.fase = 'fim'; B.vez = -1; B.oculta = false;
        const e = eu();
        const tx = { blackjack: 'Blackjack! ', ganhou: 'Você ganhou ', empate: 'Empate. ', perdeu: 'Você perdeu ' }[e.res] || '';
        B.msg = tx + (e.res === 'empate' ? '' : (e.res === 'perdeu' ? e.aposta : e.delta) + ' fichas.');
        render();
    }
    const cartaHTML = c => { const d = criarElementoCarta(c); d.setAttribute('aria-label', nomeCarta(c)); return d.outerHTML; };
    function assento(j, i) {
        const ehEu = i === B.js.length - 1;
        const cartas = j.mao.map(cartaHTML).join('');
        const t = j.mao.length ? total(j.mao) : '';
        const tag = j.res ? `<span class="bj-tag ${j.res === 'perdeu' ? 'ruim' : j.res === 'empate' ? '' : j.res === 'blackjack' ? 'bj' : 'ok'}">${{ blackjack: 'Blackjack ' + (j.delta >= 0 ? '+' : '') + j.delta, ganhou: 'Ganhou +' + j.delta, empate: 'Empate', perdeu: 'Perdeu −' + j.aposta }[j.res]}</span>`
            : j.estado ? `<span class="bj-tag ${j.estado === 'estourou' ? 'ruim' : j.estado === 'blackjack' ? 'bj' : ''}">${{ estourou: 'Estourou', parou: 'Parou', blackjack: 'Blackjack!' }[j.estado]}</span>` : '';
        return `<div class="bj-assento ${ehEu ? 'bj-eu' : ''} ${B.vez === i ? 'vez' : ''} ${j.fora ? 'fora' : ''}">
            <div class="bj-nome">${j.foto ? `<img src="${j.foto}" alt="">` : ''}<b>${ehEu ? 'Você' : j.nome}</b><small>💰 ${j.fichas}${j.aposta ? ' · aposta ' + j.aposta : ''}</small></div>
            <div class="bj-mao">${j.fora ? '' : cartas}</div>
            <div class="bj-info">${j.fora ? 'Sem fichas' : (t !== '' ? '<b>' + t + '</b> ' : '') + tag}</div></div>`;
    }
    function render() {
        if (!B) return;
        const e = eu();
        const mb = B.banca.length ? (B.oculta ? valor(B.banca[0]) + ' + ?' : total(B.banca)) : '';
        const cb = B.banca.map((c, k) => (B.oculta && k === 1) ? '<div class="carta verso"></div>' : cartaHTML(c)).join('');
        $('bjMesa').innerHTML = `<div class="bj-banca"><div class="bj-nome"><b>🎩 Banca</b><small>${mb ? 'Total: ' + mb : ''}</small></div><div class="bj-mao">${cb}</div></div>
            <div class="bj-assentos">${B.js.map(assento).join('')}</div>`;
        $('bjFichas').textContent = `💰 ${e.fichas}`;
        $('bjMsg').textContent = B.msg;
        let c = '';
        if (B.fase === 'aposta') {
            c = `<div class="bj-aposta">Aposta: <b>${B.apostaTmp}</b></div>` +
                FICHAS_APOSTA.map(v => `<button type="button" data-a="ficha" data-v="${v}" ${B.apostaTmp + v > e.fichas ? 'disabled' : ''}>+${v}</button>`).join('') +
                `<button type="button" class="sec" data-a="tudo" ${e.fichas < MIN ? 'disabled' : ''}>All-in</button><button type="button" class="sec" data-a="limpar">Limpar</button>
                <button type="button" data-a="apostar" ${B.apostaTmp < MIN ? 'disabled' : ''}>Apostar</button>`;
        } else if (B.fase === 'jogando' && B.vez === B.js.length - 1 && !e.estado) {
            c = `<button type="button" data-a="pedir">Pedir</button><button type="button" data-a="parar">Parar</button>
                <button type="button" class="sec" data-a="dobrar" ${e.mao.length === 2 && e.fichas >= e.aposta ? '' : 'disabled'}>Dobrar</button>`;
        } else if (B.fase === 'fim') {
            c = e.fichas < MIN
                ? `<button type="button" data-a="nova">Suas fichas acabaram · Nova partida</button>`
                : `<button type="button" data-a="proxima">Próxima rodada</button>`;
        }
        $('bjControles').innerHTML = c;
    }
    function clique(ev) {
        const b = ev.target.closest('button[data-a]');
        if (!B || !b || b.disabled) return;
        const a = b.dataset.a, e = eu();
        if (a === 'ficha') { B.apostaTmp = Math.min(e.fichas, B.apostaTmp + (+b.dataset.v)); render(); }
        else if (a === 'tudo') { B.apostaTmp = e.fichas; render(); }
        else if (a === 'limpar') { B.apostaTmp = 0; render(); }
        else if (a === 'apostar') apostar();
        else if (a === 'proxima') novaRodada();
        else if (a === 'nova') iniciar();
        else acao(a);
    }
    function abrirPlacar() {
        if (!B) return;
        const ordem = B.js.map((j, i) => ({ j, i })).sort((a, b) => b.j.fichas - a.j.fichas);
        $('bjModalBox').innerHTML = `<h2>♦ Placar do Blackjack</h2>
            <p><b>Rodada ${B.rodada}</b> · aposta mínima ${MIN}</p>
            ${ordem.map((o, k) => `<p>${k + 1}º <b>${o.i === B.js.length - 1 ? 'Você' : o.j.nome}</b>: ${o.j.fichas} fichas${o.j.fora ? ' · sem fichas' : ''}</p>`).join('')}
            <button type="button" class="btn-sec" id="btnRegrasBj" style="margin:0 0 8px">📖 Regras</button>
            <button type="button" class="btn-sec" id="btnSairBj" style="margin:0 0 8px">🚪 Sair do jogo</button>
            <button type="button" class="btn-modo" id="btnFecharBj">Fechar</button>`;
        $('bjModal').classList.remove('escondido');
        $('btnFecharBj').onclick = () => $('bjModal').classList.add('escondido');
        $('btnRegrasBj').onclick = () => abrirRegras('blackjack', abrirPlacar);
        $('btnSairBj').onclick = () => confirmarToque($('btnSairBj'), () => sairParaMenu('telaModo'));
    }
    $('bjControles').addEventListener('click', clique);
    $('btnBjPlacar').onclick = abrirPlacar;
    $('bjModal').addEventListener('click', e => { if (e.target === $('bjModal')) $('bjModal').classList.add('escondido'); });
    return { iniciar, parar, abrirPlacar };
})();
