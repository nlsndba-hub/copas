// ================= POKER (Texas Hold'em) =================
// Reaproveita o layout, as salas, a voz, as frases/GIFs e a mesa do Jogo de Copas (mesmo encaixe da Sueca).
// Regras: 4 lugares (você + 3 máquinas, ou jogadores humanos nas salas). Cada um começa com 1000 fichas.
// Cada jogador recebe 2 cartas; 5 cartas comunitárias (flop 3, turn 1, river 1). Rodadas de apostas: desistir, passar/pagar,
// apostar/aumentar e all-in, com potes paralelos (side pots). Blinds começam em 10/20 e dobram a cada 6 mãos.
// A partida acaba quando só um jogador tem fichas (ou quando nenhum humano tem fichas).
const Poker = (() => {
    const FICHAS = 1000, SB0 = 10, MAOS_POR_NIVEL = 6, TEMPO_HUMANO = 45000;
    const NOME_MAO = ['Carta alta', 'Par', 'Dois pares', 'Trinca', 'Sequência', 'Flush', 'Full house', 'Quadra', 'Straight flush'];
    const FACE = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Valete', 'Dama', 'Rei', 'Ás'];
    const PLURAL = ['Dois', 'Três', 'Quatros', 'Cincos', 'Seis', 'Setes', 'Oitos', 'Noves', 'Dez', 'Valetes', 'Damas', 'Reis', 'Ases'];
    const ehPoker = () => !!(G && G.jogo === 'poker');
    const F = (n = 4) => Array(n).fill(false);

    // ---------- avaliação das mãos ----------
    const COMB = {};
    function combos(n) {
        if (COMB[n]) return COMB[n];
        const out = [];
        (function f(s, a) { if (a.length === 5) { out.push(a.slice()); return; } for (let i = s; i < n; i++) { a.push(i); f(i + 1, a); a.pop(); } })(0, []);
        return (COMB[n] = out);
    }
    function aval5(c) {
        const r = c.map(x => x.valor).sort((a, b) => b - a);
        const flush = c.every(x => x.naipe === c[0].naipe);
        let seq = -1;
        if (new Set(r).size === 5) { if (r[0] - r[4] === 4) seq = r[0]; else if (r[0] === 12 && r[1] === 3) seq = 3; }   // A-2-3-4-5
        const cnt = {}; r.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; });
        const g = Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a] || b - a), cs = g.map(v => cnt[v]);
        if (seq >= 0 && flush) return [8, seq];
        if (cs[0] === 4) return [7, g[0], g[1]];
        if (cs[0] === 3 && cs[1] === 2) return [6, g[0], g[1]];
        if (flush) return [5, ...r];
        if (seq >= 0) return [4, seq];
        if (cs[0] === 3) return [3, g[0], g[1], g[2]];
        if (cs[0] === 2 && cs[1] === 2) return [2, g[0], g[1], g[2]];
        if (cs[0] === 2) return [1, g[0], g[1], g[2], g[3]];
        return [0, ...r];
    }
    const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
    function melhor(cartas) {
        let b = null;
        combos(cartas.length).forEach(ix => { const s = aval5(ix.map(k => cartas[k])); if (!b || cmp(s, b) > 0) b = s; });
        return b;
    }
    function descrever(s) {
        const c = s[0];
        if (c === 1) return `Par de ${PLURAL[s[1]]}`;
        if (c === 2) return `Dois pares (${PLURAL[s[1]]} e ${PLURAL[s[2]]})`;
        if (c === 3) return `Trinca de ${PLURAL[s[1]]}`;
        if (c === 4) return `Sequência até ${FACE[s[1]]}`;
        if (c === 6) return `Full house (${PLURAL[s[1]]} e ${PLURAL[s[2]]})`;
        if (c === 7) return `Quadra de ${PLURAL[s[1]]}`;
        if (c === 8) return s[1] === 12 ? 'Royal flush' : 'Straight flush';
        if (c === 0) return `Carta alta ${FACE[s[1]]}`;
        return NOME_MAO[c];
    }

    // ---------- estado ----------
    const podeAgir = i => !G.dobrou[i] && !G.allin[i] && !G.fora[i];
    const vivos = () => [0, 1, 2, 3].filter(i => !G.dobrou[i]);
    const proximo = (de, ok) => { for (let k = 1; k <= 4; k++) { const s = (de + k) % 4; if (ok(s)) return s; } return de; };
    function sync() {
        G.totais = G.fichas.slice(); G.pts = G.apostas.slice();
        G.personagens.forEach((p, i) => { p.total = -G.fichas[i]; });
        G.pote = G.investido.reduce((a, b) => a + b, 0);
    }

    function iniciar(hum) {
        if (!jogadorHumano) return;
        bloquearOrientacaoRetrato();
        hum = hum || [{ pid: null, p: jogadorHumano }];
        ultimoCliqueCarta = { id: null, tempo: 0 }; cartaSelecionadaId = null;
        frasesUsadas = 0; atualizarBtnFrases();
        const ids = new Set(hum.map(h => h.p.id));
        const disp = embaralhar(PERSONAGENS.filter(p => !ids.has(p.id) && !p.somenteBot));
        const bots = disp.splice(0, 4 - hum.length);
        const resto = embaralhar([...hum.slice(1), ...bots.map(b => ({ pid: null, p: b }))]);
        const lugares = [hum[0], ...resto];
        const part = lugares.map(l => l.p);
        nomeJogador = jogadorHumano.nome;
        mostrarTela('jogo');
        $('btnChave').classList.add('escondido');
        pararIntro(); ajustarEscala(); selecionarRadioInicial();
        G = {
            jogo: 'poker', nomes: part.map(p => p.nome), personagens: part, totais: Array(4).fill(FICHAS), pts: [0, 0, 0, 0],
            gid: MP.gid || null, vago: F(),
            humanos: lugares.map((l, k) => k === 0 || !!l.pid), donos: lugares.map(l => l.pid || null),
            hostPid: hum[0].pid, rodada: 0, fila: [], participantes: new Set(part), luaConquistada: false, renunciaConquistada: false,
            nivel: typeof nivelIA !== 'undefined' ? nivelIA : 1, venc: null, carteador: 0,
            distribuindo: false, distMsg: '', recebidas: [2, 2, 2, 2], rodadaEncerrada: false, pegas: [[], [], [], []], quebrada: false,
            aviso: '', avisoAte: 0, eu: 0, maos: [[], [], [], []], mesa: [], vazas: 0, turno: 0, ocupado: true, lider: null,
            estampasJogadores: (() => { const e = Array(4).fill(''); const s = estampaSelecionada(); e[0] = s !== 'padrao' ? String(s) : ''; MP.membros.forEach(m => { const k = lugares.findIndex(l => l.pid === m.pid); if (k >= 0) e[k] = m.estampa || ''; }); return e; })(),
            fichas: Array(4).fill(FICHAS), apostas: [0, 0, 0, 0], investido: [0, 0, 0, 0], dobrou: F(), allin: F(), fora: F(), agiu: F(),
            apostaAtual: 0, minAumento: SB0 * 2, sb: SB0, bb: SB0 * 2, botao: Math.floor(Math.random() * 4), sbSeat: -1, bbSeat: -1,
            fase: 'pre', comun: [], comunTodas: [], pote: 0
        };
        sync();
        novaMao();
        reforcarEscala();
    }
    function iniciarMP(humanos) { iniciar(humanos); }

    function novaPartida() {
        if (!ehPoker() || (MP.ativo && MP.papel !== 'host')) return;
        clearTimeout(G.timer);
        G.fichas = Array(4).fill(FICHAS); G.rodada = 0; G.fora = F(); sync();
        novaMao();
    }

    function postar(i, n) {
        const p = Math.min(n, G.fichas[i]);
        G.fichas[i] -= p; G.apostas[i] += p; G.investido[i] += p;
        if (G.fichas[i] === 0) G.allin[i] = true;
    }

    function novaMao() {
        clearTimeout(G.timer);
        const ativos = [0, 1, 2, 3].filter(i => G.fichas[i] > 0);
        if (ativos.length < 2 || !ativos.some(i => G.humanos[i])) return fimMao(null);
        G.rodada++;
        const nvBlind = Math.floor((G.rodada - 1) / MAOS_POR_NIVEL);
        G.sb = SB0 * Math.pow(2, Math.min(nvBlind, 6)); G.bb = G.sb * 2;
        G.botao = proximo(G.botao, i => G.fichas[i] > 0);
        G.fora = [0, 1, 2, 3].map(i => G.fichas[i] <= 0);
        G.dobrou = G.fora.slice(); G.allin = F(); G.agiu = F();
        G.apostas = [0, 0, 0, 0]; G.investido = [0, 0, 0, 0];
        const b = embaralhar(criarBaralho());
        G.maos = [0, 1, 2, 3].map(i => G.fora[i] ? [] : [b.pop(), b.pop()]);
        G.comunTodas = [b.pop(), b.pop(), b.pop(), b.pop(), b.pop()]; G.comun = []; G.fase = 'pre';
        G.revelar = null; G.venc = null;
        const duelo = ativos.length === 2;
        G.sbSeat = duelo ? G.botao : proximo(G.botao, i => G.fichas[i] > 0);
        G.bbSeat = proximo(G.sbSeat, i => G.fichas[i] > 0);
        postar(G.sbSeat, G.sb); postar(G.bbSeat, G.bb);
        G.apostaAtual = Math.max(...G.apostas); G.minAumento = G.bb;
        G.ocupado = false; G.aviso = '';
        $('modal').classList.add('escondido');
        for (let i = 0; i < 4; i++) { const el = $(`carta-${i}`); if (el) el.innerHTML = ''; }
        frasesUsadas = 0; atualizarBtnFrases();
        sync();
        avisoTemp(`Mão ${G.rodada} · blinds ${G.sb}/${G.bb}`, 2200);
        G.turno = duelo ? G.sbSeat : proximo(G.bbSeat, podeAgir);
        if (![0, 1, 2, 3].some(podeAgir) || !podeAgir(G.turno)) return seguir(G.bbSeat);
        agendar();
    }

    // ---------- fluxo da mão ----------
    function agendar() {
        clearTimeout(G.timer);
        render();
        if (G.ocupado || G.fase === 'show') return;
        if (G.vago && G.vago[G.turno]) return;
        const s = G.turno;
        if (!G.humanos[s]) {
            G.timer = setTimeout(() => { if (G && G.jogo === 'poker' && G.turno === s && !G.ocupado) aplicar(s, decidirBot(s)); }, 900 + Math.random() * 800);
        } else if (MP.ativo) {   // humano ausente não trava a mesa: passa ou desiste sozinho
            G.timer = setTimeout(() => { if (G && G.jogo === 'poker' && G.turno === s && !G.ocupado) aplicar(s, G.apostaAtual - G.apostas[s] <= 0 ? 'c' : 'f'); }, TEMPO_HUMANO);
        }
    }
    function tentarJogar() { /* no Poker as cartas da mão não são jogadas */ }
    function acaoLocal(act) {
        if (!G || G.turno !== 0 || G.ocupado || G.fase === 'show') return;
        if (MP.papel === 'cliente') { enviar('jogar', { pid: MP.pid, c: act }); return; }
        clearTimeout(G.timer);
        aplicar(0, act);
    }
    function aoJogar({ pid, c }) {
        if (MP.papel !== 'host' || !ehPoker() || typeof c !== 'string') return;
        const s = G.donos.indexOf(pid);
        if (s < 1 || !G.humanos[s] || G.turno !== s || G.ocupado || G.fase === 'show') return;
        clearTimeout(G.timer);
        aplicar(s, c);
    }
    function aplicar(i, act) {
        const [t, v] = String(act).split(':');
        const falta = Math.max(0, G.apostaAtual - G.apostas[i]), antes = G.apostaAtual;
        let txt;
        if (t === 'f' && falta > 0) { G.dobrou[i] = true; txt = 'desistiu'; }
        else if (t === 'r') {
            const maxTo = G.apostas[i] + G.fichas[i];
            let R = Math.min(Math.floor(+v) || 0, maxTo);
            if (R <= G.apostaAtual) return aplicar(i, 'c');
            if (R < G.apostaAtual + G.minAumento && R < maxTo) R = Math.min(G.apostaAtual + G.minAumento, maxTo);
            postar(i, R - G.apostas[i]);
            const aumento = R - G.apostaAtual;
            if (aumento >= G.minAumento) { G.minAumento = aumento; G.agiu = F(); }   // aumento cheio reabre as apostas
            G.apostaAtual = R;
            txt = G.allin[i] ? `foi ALL-IN (${R})` : (antes === 0 ? `apostou ${R}` : `aumentou para ${R}`);
        } else {
            const pg = Math.min(falta, G.fichas[i]);
            postar(i, pg);
            txt = falta === 0 ? 'passou' : (G.allin[i] ? `pagou tudo (${pg})` : `pagou ${pg}`);
        }
        G.agiu[i] = true;
        sync(); SFX.jogar();
        avisoTemp(`${G.nomes[i]} ${txt}`, 1800);
        seguir(i);
    }
    function proximoAgir(de) {
        const pode = [0, 1, 2, 3].filter(podeAgir).length;
        for (let k = 1; k <= 4; k++) {
            const s = (de + k) % 4;
            if (!podeAgir(s)) continue;
            if (pode <= 1 && G.apostas[s] >= G.apostaAtual) continue;
            if (!G.agiu[s] || G.apostas[s] < G.apostaAtual) return s;
        }
        return -1;
    }
    function seguir(de) {
        const v = vivos();
        if (v.length === 1) return fimMao({ unico: v[0] });
        const p = proximoAgir(de);
        if (p >= 0) { G.turno = p; return agendar(); }
        proximaFase();
    }
    function proximaFase() {
        clearTimeout(G.timer);
        G.ocupado = true;
        G.apostas = [0, 0, 0, 0]; G.apostaAtual = 0; G.minAumento = G.bb; G.agiu = F();
        const fases = ['pre', 'flop', 'turn', 'river'], k = fases.indexOf(G.fase);
        if (k >= 3) return showdown();
        G.fase = fases[k + 1];
        G.comun = G.comunTodas.slice(0, G.fase === 'flop' ? 3 : G.fase === 'turn' ? 4 : 5);
        sync(); SFX.jogar(); render();
        if ([0, 1, 2, 3].filter(podeAgir).length < 2) { G.timer = setTimeout(proximaFase, 1300); return; }   // all-in: vai abrindo as cartas
        G.timer = setTimeout(() => {
            if (!G || G.jogo !== 'poker') return;
            G.ocupado = false; G.turno = proximo(G.botao, podeAgir); agendar();
        }, 700);
    }
    function showdown() {
        G.fase = 'show'; G.comun = G.comunTodas.slice();
        const sc = {}; vivos().forEach(i => { sc[i] = melhor(G.maos[i].concat(G.comunTodas)); });
        fimMao({ sc });
    }
    function distribuir(sc, ganhos) {
        const niveis = [...new Set(G.investido.filter(x => x > 0))].sort((a, b) => a - b);
        let ant = 0;
        niveis.forEach(n => {
            const contr = [0, 1, 2, 3].filter(i => G.investido[i] >= n), valor = (n - ant) * contr.length, el = contr.filter(i => !G.dobrou[i]);
            if (!el.length) { contr.forEach(i => { ganhos[i] += n - ant; }); ant = n; return; }   // sobra sem disputa volta a quem pôs
            ant = n;
            const b = el.reduce((m, i) => (m === null || cmp(sc[i], sc[m]) > 0 ? i : m), null);
            const gan = el.filter(i => cmp(sc[i], sc[b]) === 0).sort((a, c) => ((a - G.botao + 3) % 4) - ((c - G.botao + 3) % 4));
            const parte = Math.floor(valor / gan.length);
            gan.forEach(i => { ganhos[i] += parte; });
            ganhos[gan[0]] += valor - parte * gan.length;
        });
    }
    function fimMao(r) {
        clearTimeout(G.timer);
        G.ocupado = true; G.fase = G.fase === 'show' ? 'show' : G.fase;
        const ganhos = [0, 0, 0, 0], rv = {}, mh = {};
        if (r && r.unico !== undefined) ganhos[r.unico] = G.investido.reduce((a, b) => a + b, 0);
        else if (r && r.sc) {
            distribuir(r.sc, ganhos);
            vivos().forEach(i => { rv[i] = G.maos[i].map(c => c.id); mh[i] = descrever(r.sc[i]); });
        }
        if (r) { G.fichas = G.fichas.map((f, i) => f + ganhos[i]); }
        G.apostas = [0, 0, 0, 0]; G.investido = [0, 0, 0, 0]; G.apostaAtual = 0;
        sync(); G.pote = 0;
        const com = [0, 1, 2, 3].filter(i => G.fichas[i] > 0);
        const fim = !r || com.length < 2 || !com.some(i => G.humanos[i]);
        let venc = -1;
        if (fim) venc = [0, 1, 2, 3].reduce((m, i) => (G.fichas[i] > G.fichas[m] ? i : m), 0);
        const d = { r: G.rodada, no: G.nomes.slice(), gn: ganhos, rv, mh, fi: G.fichas.slice(), com: G.comun.map(c => c.id), fim, venc, eu: 0, sd: !!(r && r.sc) };
        G.venc = null;
        render();
        MP.ultimoD = d;
        if (MP.ativo && MP.papel === 'host') enviar('evt', { po: 1, t: 'modal', d });
        mostrarModal(d);
        if (!fim) G.timer = setTimeout(() => { if (G && G.jogo === 'poker') novaMao(); }, d.sd ? 6500 : 4200);
    }

    // ---------- janelas ----------
    function mostrarModal(d) {
        const eu = G.eu || 0;
        let h = d.fim ? '<h2>🏁 Fim da partida!</h2>' : `<h2>Fim da mão ${d.r}</h2>`;
        d.gn.forEach((g, i) => { if (g > 0) h += `<p>🏆 <b>${i === eu ? 'Você' : d.no[i]}</b> ficou com <b>${g}</b> fichas${d.mh[i] ? ` · ${d.mh[i]}` : ''}</p>`; });
        const reveladas = Object.keys(d.rv);
        if (reveladas.length) h += '<div class="pk-rev-lista">' + (d.com && d.com.length ? '<div class="pk-rev pk-mesa"><span>Mesa</span><span class="pk-rev-cartas" data-s="mesa"></span></div>' : '') + reveladas.map(i => `<div class="pk-rev"><span>${+i === eu ? 'Você' : d.no[i]}</span><span class="pk-rev-cartas" data-s="${i}"></span></div>`).join('') + '</div>';
        h += '<p class="sub">' + d.fi.map((f, i) => `${i === eu ? 'Você' : d.no[i]}: <b>${f}</b>`).join(' · ') + '</p>';
        if (d.fim) {
            h += `<h3>${d.venc === eu ? '🏆 Você ganhou todas as fichas!' : (d.fi[eu] <= 0 ? '😤 Você ficou sem fichas' : `🏆 ${d.no[d.venc]} venceu`)}</h3>`;
            const host = !MP.ativo || MP.papel === 'host';
            h += host ? '<button type="button" class="btn-modo" id="btnPokerNova">Nova partida</button>' : '<p class="sub">Aguardando o anfitrião iniciar outra partida…</p>';
            h += '<button type="button" class="btn-sec" id="btnPokerSair">Sair para o menu</button>';
        } else if (d.fi[eu] <= 0) h += '<p class="sub">Você ficou sem fichas e acompanha a mesa até o fim.</p>';
        else h += '<p class="sub">A próxima mão começa já…</p>';
        $('modalBox').innerHTML = h;
        const bm = $('modalBox').querySelector('.pk-rev-cartas[data-s="mesa"]');
        if (bm) d.com.forEach(id => { const e = criarElementoCarta(cartaDeId(id)); e.classList.add('poker-mini'); bm.appendChild(e); });
        reveladas.forEach(i => {
            const box = $('modalBox').querySelector(`.pk-rev-cartas[data-s="${i}"]`);
            d.rv[i].forEach(id => { const e = criarElementoCarta(cartaDeId(id)); e.classList.add('poker-mini'); box.appendChild(e); });
        });
        $('modal').classList.remove('escondido');
        const n = $('btnPokerNova'); if (n) n.onclick = () => { $('modal').classList.add('escondido'); novaPartida(); };
        const s = $('btnPokerSair'); if (s) s.onclick = () => sairParaMenu('telaModo');
    }
    function abrirPlacar() {
        const ordem = [0, 1, 2, 3].sort((a, b) => G.fichas[b] - G.fichas[a]);
        $('modalRankingBox').innerHTML = `<h2>♠ Placar do Poker</h2>
            <p><b>Mão ${G.rodada}</b> · blinds ${G.sb}/${G.bb} <small>(dobram a cada ${MAOS_POR_NIVEL} mãos)</small></p>
            ${ordem.map((i, k) => `<p>${k + 1}º <b>${i === 0 ? 'Você' : G.nomes[i]}</b>: ${G.fichas[i]} fichas${G.fora[i] ? ' · eliminado' : ''}</p>`).join('')}
            ${!MP.ativo ? '<button type="button" class="btn-modo" id="btnRodarMesaPoker" style="margin:0 0 8px">🔄 Rodar mesa</button>' : ''}
            <button type="button" class="btn-sec" id="btnSairPoker" style="margin:0 0 8px">🚪 Sair do jogo</button>
            <button type="button" class="btn-modo" id="btnFecharPlacarPoker">Fechar</button>`;
        $('modalRanking').classList.remove('escondido');
        $('btnFecharPlacarPoker').onclick = () => $('modalRanking').classList.add('escondido');
        const r = $('btnRodarMesaPoker');
        if (r) r.onclick = () => { $('modalRanking').classList.add('escondido'); $('modal').classList.add('escondido'); clearTimeout(G.timer); pararAudiosEntrada(); iniciar(); };   // nova mesa, novos adversários
        $('btnSairPoker').onclick = () => { if (confirm('Sair do jogo e voltar à escolha do modo?')) sairParaMenu('telaModo'); };
    }

    // ---------- máquina ----------
    function equidade(i, nOpp, n) {
        const meus = G.maos[i], com = G.comun, usados = new Set(meus.concat(com).map(c => c.id));
        const resto = criarBaralho().filter(c => !usados.has(c.id)), falta = 5 - com.length, need = falta + 2 * nOpp;
        let g = 0;
        for (let s = 0; s < n; s++) {
            for (let k = 0; k < need; k++) { const j = k + Math.floor(Math.random() * (resto.length - k)); const t = resto[k]; resto[k] = resto[j]; resto[j] = t; }
            const board = com.concat(resto.slice(0, falta)), eu = melhor(meus.concat(board));
            let perdeu = false, empate = false;
            for (let o = 0; o < nOpp && !perdeu; o++) {
                const h = resto.slice(falta + 2 * o, falta + 2 * o + 2), c = cmp(melhor(h.concat(board)), eu);
                if (c > 0) perdeu = true; else if (c === 0) empate = true;
            }
            g += perdeu ? 0 : (empate ? 0.5 : 1);
        }
        return g / n;
    }
    function decidirBot(i) {
        const falta = Math.max(0, G.apostaAtual - G.apostas[i]), fich = G.fichas[i], pote = G.pote;
        const opp = Math.max(1, vivos().length - 1);
        const eq = equidade(i, opp, 140) + (Math.random() - 0.5) * 0.08;
        const efetivo = Math.min(falta, fich), odds = efetivo / (pote + efetivo || 1);
        const maxTo = G.apostas[i] + fich, minTo = Math.min(G.apostaAtual + G.minAumento, maxTo), podeSubir = fich > falta;
        const tam = f => Math.min(Math.max(G.apostaAtual + Math.max(G.minAumento, Math.round((pote * f) / G.sb) * G.sb), minTo), maxTo);
        if (falta === 0) {
            if (podeSubir && eq > 0.68 && Math.random() < 0.75) return 'r:' + tam(0.4 + Math.random() * 0.5);
            if (podeSubir && eq > 0.52 && Math.random() < 0.3) return 'r:' + tam(0.35);
            if (podeSubir && Math.random() < 0.06) return 'r:' + tam(0.5);
            return 'c';
        }
        if (eq > 0.75 && podeSubir && Math.random() < 0.65) return 'r:' + tam(0.7);
        if (eq > odds + 0.05 && (eq > 0.35 || efetivo <= G.bb)) {
            if (podeSubir && eq > 0.62 && Math.random() < 0.25) return 'r:' + tam(0.5);
            return 'c';
        }
        if (efetivo <= G.bb && eq > 0.3 && Math.random() < 0.5) return 'c';
        if (Math.random() < 0.04) return 'c';
        return 'f';
    }

    // ---------- multijogador ----------
    function difundir() {
        if (!G || !MP.ch || !MP.emJogo || !ehPoker()) return;
        const s = {
            g: G.gid, r: G.rodada, t: G.turno, oc: G.ocupado, cm: G.comun.map(c => c.id), fa: G.fase, bo: G.botao, sbs: G.sbSeat, bbs: G.bbSeat,
            ap: G.apostas, aa: G.apostaAtual, ma: G.minAumento, fi: G.fichas, iv: G.investido, df: G.dobrou, al: G.allin, fr: G.fora, ag: G.agiu,
            sb: G.sb, bb: G.bb, pe: G.personagens.map(p => p.id), no: G.nomes, ho: G.humanos, dn: G.donos, av: G.aviso && /^⚠/.test(G.aviso) ? '' : (G.aviso || '')
        };
        const maos = {};
        G.donos.forEach((pid, i) => { if (pid && pid !== MP.pid) maos[pid] = G.maos[i].map(c => c.id); });
        const payload = { po: 1, s, maos };
        const txt = JSON.stringify(payload);
        if (txt === MP.ultimo) return;
        MP.ultimo = txt;
        enviar('snap', payload);
    }
    function aoSnap(payload) {
        const { s, maos } = payload;
        if (MP.papel === 'host' || !MP.ch || MP.espectador) return;
        if (s.g && s.g === MP.gidMorto) return;
        const eu = s.dn.indexOf(MP.pid);
        if (eu < 0) return;
        MP.eu = eu; MP.ultimoSnap = payload;
        const rot = a => [0, 1, 2, 3].map(v => a[(v + eu) % 4]), v = i => (i - eu + 4) % 4, ant = MP.emJogo ? G : null;
        const fichas = rot(s.fi), apostas = rot(s.ap), inv = rot(s.iv);
        const g = {
            jogo: 'poker', eu, nomes: rot(s.no), personagens: rot(s.pe).map(id => PERSONAGENS.find(p => p.id === id)),
            totais: fichas.slice(), pts: apostas.slice(), turno: v(s.t), ocupado: s.oc, distribuindo: false, distMsg: '', recebidas: [2, 2, 2, 2],
            rodadaEncerrada: false, mesa: [], lider: null, quebrada: false, vazas: 0, maos: [(maos[MP.pid] || []).map(cartaDeId), [], [], []], pegas: [[], [], [], []],
            aviso: s.av || '', carteador: 0, rodada: s.r, venc: null, humanos: rot(s.ho), donos: rot(s.dn), hostPid: s.dn[0], virarMao: false,
            gid: s.g || null, avisoAte: 0, vago: F(), fila: [],
            estampasJogadores: ant && ant.estampasJogadores ? ant.estampasJogadores : ['', '', '', ''],
            fichas, apostas, investido: inv, dobrou: rot(s.df), allin: rot(s.al), fora: rot(s.fr), agiu: rot(s.ag), apostaAtual: s.aa, minAumento: s.ma,
            sb: s.sb, bb: s.bb, botao: v(s.bo), sbSeat: s.sbs < 0 ? -1 : v(s.sbs), bbSeat: s.bbs < 0 ? -1 : v(s.bbs), fase: s.fa,
            comun: s.cm.map(cartaDeId), comunTodas: [], pote: inv.reduce((a, b) => a + b, 0)
        };
        g.personagens.forEach((p, i) => { p.total = -fichas[i]; });
        if (ant && ant.avisoAte > Date.now() && !g.aviso) { g.aviso = ant.aviso; g.avisoAte = ant.avisoAte; }
        if (!MP.emJogo) {
            MP.emJogo = true; MP.papel = 'cliente'; MP.naEspera = false; MP.avisoEspera = ''; MP.volta = false; MP.mesaMeta = '';
            if (g.personagens[0]) jogadorHumano = g.personagens[0];
            mostrarTela('jogo'); pararIntro();
            $('btnChave').classList.add('escondido');
            G = g; render(); ajustarEscala(); selecionarRadioInicial();
        }
        if (ant && ant.rodada !== g.rodada) { frasesUsadas = 0; atualizarBtnFrases(); $('modal').classList.add('escondido'); }
        G = g;
        render();
    }
    function aoEvento(p) {
        if (p.t === 'modal' && MP.papel === 'cliente' && ehPoker()) { MP.ultimoD = p.d; p.d.eu = G.eu; mostrarModal(p.d); }
    }
    function verificarSaidas() {
        if (!MP.emJogo || !ehPoker()) return;
        const vivosM = new Set(MP.membros.map(m => m.pid));
        if (MP.papel === 'host') {
            const ausente = G.donos.some((pid, i) => G.humanos[i] && pid && pid !== MP.pid && !vivosM.has(pid));
            if (ausente && !MP.tSaida) MP.tSaida = setTimeout(() => {      // 3 s de tolerância para oscilar a conexão
                MP.tSaida = null;
                if (!G || !ehPoker() || MP.papel !== 'host') return;
                const v2 = new Set(MP.membros.map(m => m.pid));
                G.donos.forEach((pid, i) => {
                    if (pid && pid !== MP.pid && G.humanos[i] && !v2.has(pid)) {
                        G.humanos[i] = false;                                  // a máquina assume o lugar de quem saiu
                        if (G.turno === i && !G.ocupado) agendar();
                    }
                });
                render();
            }, 3000);
        } else if (G.hostPid && !vivosM.has(G.hostPid)) {
            if (!MP.tSaida) MP.tSaida = setTimeout(() => {
                MP.tSaida = null;
                if (!G || !ehPoker() || MP.papel !== 'cliente') return;
                if (!new Set(MP.membros.map(m => m.pid)).has(G.hostPid)) voltarParaEspera('O anfitrião saiu da partida de Poker.');
            }, 3000);
        }
    }

    // ---------- tela: cartas comunitárias, pote e botões ----------
    let sel = 0, selChave = '', comChave = '';
    function garantirUI() {
        if (!$('pokerMesa')) {
            const m = document.createElement('div'); m.id = 'pokerMesa';
            m.innerHTML = '<div id="pokerPote"></div><div id="pokerCom"></div><div id="pokerMao"></div>';
            $('areaCentral').appendChild(m);
        }
        if (!$('pokerAcoes')) {
            const b = document.createElement('div'); b.id = 'pokerAcoes';
            b.innerHTML = '<button type="button" class="pk-fold">Desistir</button><button type="button" class="pk-call"></button>' +
                '<span class="pk-subir"><button type="button" class="pk-menos">−</button><span class="pk-val"></span><button type="button" class="pk-mais">+</button>' +
                '<button type="button" class="pk-meio">½ pote</button><button type="button" class="pk-pote">Pote</button><button type="button" class="pk-raise"></button></span>' +
                '<button type="button" class="pk-all">All-in</button>';
            $('jogo').appendChild(b);
            const q = c => b.querySelector(c), faixa = () => { const f = G.fichas[0], max = G.apostas[0] + f; return [Math.min(G.apostaAtual + G.minAumento, max), max]; };
            const mover = to => { const [mn, mx] = faixa(); sel = Math.max(mn, Math.min(mx, Math.round(to))); atualizarInfo(); };
            q('.pk-fold').onclick = () => acaoLocal('f');
            q('.pk-call').onclick = () => acaoLocal('c');
            q('.pk-raise').onclick = () => acaoLocal('r:' + sel);
            q('.pk-all').onclick = () => acaoLocal('r:' + (G.apostas[0] + G.fichas[0]));
            q('.pk-menos').onclick = () => mover(sel - G.bb);
            q('.pk-mais').onclick = () => mover(sel + G.bb);
            q('.pk-meio').onclick = () => mover(G.apostaAtual + (G.pote + (G.apostaAtual - G.apostas[0])) / 2);
            q('.pk-pote').onclick = () => mover(G.apostaAtual + G.pote + (G.apostaAtual - G.apostas[0]));
        }
    }
    function atualizarInfo() {
        garantirUI();
        const bar = $('pokerAcoes'), el = $('suecaInfo');
        if (!ehPoker()) { document.body.classList.remove('jogo-poker', 'poker-fora'); bar.classList.remove('on'); return; }
        document.body.classList.add('jogo-poker');
        document.body.classList.toggle('poker-fora', !!G.dobrou[0]);
        // pote e cartas comunitárias
        $('pokerPote').textContent = `Pote: ${G.pote}`;
        const chave = G.comun.map(c => c.id).join(',');
        if (chave !== comChave) {
            comChave = chave;
            const box = $('pokerCom'); box.innerHTML = '';
            for (let k = 0; k < 5; k++) {
                if (G.comun[k]) { const e = criarElementoCarta(G.comun[k], 'poker-com'); box.appendChild(e); }
                else { const s = document.createElement('div'); s.className = 'slot'; box.appendChild(s); }
            }
        }
        $('pokerMao').textContent = (G.comun.length >= 3 && G.maos[0].length && !G.dobrou[0]) ? `Sua mão: ${descrever(melhor(G.maos[0].concat(G.comun)))}` : '';
        // cabeçalho
        el.innerHTML = `<span class="su-trunfo">♠ Poker · mão ${G.rodada}</span><span class="su-jogos">Blinds ${G.sb}/${G.bb}</span>`;
        el.style.top = (($('topbar') ? $('topbar').getBoundingClientRect().bottom : 118) + 6) + 'px';
        el.classList.remove('escondido');
        // botões de ação
        const minha = G.turno === 0 && !G.ocupado && G.fase !== 'show' && !G.dobrou[0] && !G.allin[0] && !G.fora[0];
        bar.classList.toggle('on', minha);
        if (!minha) return;
        const falta = Math.max(0, G.apostaAtual - G.apostas[0]), f = G.fichas[0], max = G.apostas[0] + f, pode = f > falta;
        const min = Math.min(G.apostaAtual + G.minAumento, max), q = c => bar.querySelector(c);
        const k = `${G.rodada}|${G.fase}|${G.apostaAtual}`;
        if (k !== selChave) { selChave = k; sel = min; }
        sel = Math.max(min, Math.min(max, sel));
        q('.pk-fold').classList.toggle('escondido', falta === 0);
        q('.pk-call').textContent = falta === 0 ? 'Passar' : (falta >= f ? `Pagar tudo (${f})` : `Pagar ${falta}`);
        q('.pk-subir').classList.toggle('escondido', !pode);
        q('.pk-val').textContent = sel;
        q('.pk-raise').textContent = sel >= max ? `All-in ${max}` : (G.apostaAtual === 0 ? `Apostar ${sel}` : `Aumentar p/ ${sel}`);
        q('.pk-all').classList.toggle('escondido', !pode || sel >= max);
        const j = $('jogo').getBoundingClientRect(), j0 = $('j0').getBoundingClientRect();
        bar.style.bottom = Math.max(0, j.bottom - j0.top + 2) + 'px';
    }
    // texto de cada lugar (fichas + situação)
    function caixa(i) {
        const tag = (i === G.botao ? 'D ' : '') + (i === G.sbSeat ? 'SB ' : '') + (i === G.bbSeat ? 'BB ' : '');
        const st = G.fora[i] ? 'Eliminado' : G.dobrou[i] ? 'Desistiu' : G.allin[i] ? `ALL-IN ${G.apostas[i]}` : (G.apostas[i] > 0 ? `Aposta ${G.apostas[i]}` : '');
        return `<span class="tot">Fichas: ${G.fichas[i]}</span><span class="rod">${tag}${st}</span>`;
    }
    return { iniciar, iniciarMP, novaPartida, tentarJogar, aoJogar, agendar, difundir, aoSnap, aoEvento, verificarSaidas, abrirPlacar, atualizarInfo, caixa, melhor, descrever };
})();
