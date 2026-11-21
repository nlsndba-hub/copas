// ================= SUECA (em dupla) =================
// Reaproveita o layout, as salas, a voz, as frases/GIFs e a mesa do Jogo de Copas.
// Regras: 40 cartas (sem 8, 9 e 10). Duplas: você + o parceiro da frente (assentos 0 e 2) contra 1 e 3.
// Força: Ás > 7 > Rei > Valete > Dama > 6 > 5 > 4 > 3 > 2.  Pontos: Ás 11 · 7 = 10 · Rei 4 · Valete 3 · Dama 2 (120 por mão).
// O último naipe distribuído (carta do carteador) é o trunfo. É obrigatório assistir ao naipe (sem trunfar à força).
// 61+ pontos ganham a mão: 61–90 = 1 jogo · 91–119 = 2 jogos · 120 = 4 jogos (bandeira) · 60×60 = empate (próxima mão vale dobro).
// A partida vai até 4 jogos.
const Sueca = (() => {
    const FORCA = { 12: 9, 5: 8, 11: 7, 9: 6, 10: 5, 4: 4, 3: 3, 2: 2, 1: 1, 0: 0 };
    const PTS = { 12: 11, 5: 10, 11: 4, 9: 3, 10: 2 };
    const VALORES = [0, 1, 2, 3, 4, 5, 9, 10, 11, 12];
    const META = 4;
    const forca = c => FORCA[c.valor];
    const pontos = c => PTS[c.valor] || 0;
    const baralho = () => { const b = []; for (let n = 0; n < 4; n++) VALORES.forEach(v => b.push({ naipe: n, valor: v, id: `${n}-${v}` })); return b; };
    const ehSueca = () => !!(G && G.jogo === 'sueca');

    // ---------- início ----------
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
            jogo: 'sueca', nomes: part.map(p => p.nome), personagens: part, totais: [0, 0, 0, 0], pts: [0, 0, 0, 0],
            gid: MP.gid || null, vago: [false, false, false, false],
            humanos: lugares.map((l, k) => k === 0 || !!l.pid), donos: lugares.map(l => l.pid || null),
            hostPid: hum[0].pid, rodada: 0, fila: [], participantes: new Set(part), luaConquistada: false, renunciaConquistada: false,
            nivel: typeof nivelIA !== 'undefined' ? nivelIA : 1, venc: null, carteador: Math.floor(Math.random() * 4),
            distribuindo: false, distMsg: '', recebidas: [10, 10, 10, 10], rodadaEncerrada: false, pegas: [[], [], [], []], quebrada: false,
            aviso: '', avisoAte: 0, jogos: [0, 0], ptsEq: [0, 0], dobro: false, eu: 0, maos: [[], [], [], []], mesa: [], vazas: 0,
            estampasJogadores: (() => { const e = Array(4).fill(''); const s = estampaSelecionada(); e[0] = s !== 'padrao' ? String(s) : ''; MP.membros.forEach(m => { const k = lugares.findIndex(l => l.pid === m.pid); if (k >= 0) e[k] = m.estampa || ''; }); return e; })()
        };
        novaMao();
        reforcarEscala();
    }
    function iniciarMP(humanos) { iniciar(humanos); }

    function novaMao() {
        clearTimeout(G.timer);
        G.rodada++; G.mesa = []; G.lider = null; G.venc = null; G.vazas = 0; G.ocupado = false; G.aviso = '';
        G.ptsEq = [0, 0]; G.pts = [0, 0, 0, 0]; G.jogadas = new Set();
        G.carteador = (G.carteador + 1) % 4;
        const b = embaralhar(baralho());
        G.maos = [[], [], [], []];
        for (let k = 0; k < 40; k++) G.maos[(G.carteador + 1 + k) % 4].push(b[k]);
        G.cartaTrunfo = b[39]; G.trunfo = b[39].naipe;     // a última carta dada (ao carteador) define o trunfo
        G.turno = (G.carteador + 1) % 4;
        $('modal').classList.add('escondido');
        for (let i = 0; i < 4; i++) $(`carta-${i}`).innerHTML = '';
        frasesUsadas = 0; atualizarBtnFrases();
        avisoTemp(`Trunfo: ${NAIPES[G.trunfo].s} ${NAIPES[G.trunfo].nome}${G.dobro ? ' · esta mão vale DOBRO' : ''}`, 2600);
        agendar();
    }
    function novaPartida() {
        if (!ehSueca() || (MP.ativo && MP.papel !== 'host')) return;
        G.jogos = [0, 0]; G.dobro = false; G.totais = [0, 0, 0, 0];
        novaMao();
    }

    // ---------- regras ----------
    function erro(i, c) {
        if (G.mesa.length && c.naipe !== G.lider && G.maos[i].some(x => x.naipe === G.lider)) return `Siga o naipe ${NAIPES[G.lider].s}`;
        return null;
    }
    function vencedor(mesa) {
        let v = null;
        mesa.forEach(j => {
            if (!v) { v = j; return; }
            const c = j.carta, w = v.carta, tc = c.naipe === G.trunfo, tw = w.naipe === G.trunfo;
            if (tc && !tw) v = j;
            else if (c.naipe === w.naipe && forca(c) > forca(w)) v = j;
        });
        return v.jogador;
    }

    // ---------- fluxo da mão ----------
    function agendar() {
        clearTimeout(G.timer);
        render();
        if (G.mesa.length === 4 || G.ocupado) return;
        if (G.vago && G.vago[G.turno]) return;
        if (!G.humanos[G.turno]) {
            const s = G.turno;
            G.timer = setTimeout(() => { if (G && G.jogo === 'sueca' && G.turno === s && !G.ocupado && G.mesa.length < 4) jogar(s, escolherBot(s)); }, 800 + Math.random() * 500);
        }
    }
    function tentarJogar(c) {
        if (G.turno !== 0 || G.ocupado || G.mesa.length === 4) return;
        const e = erro(0, c);
        if (e) { G.aviso = '⚠ ' + e; G.avisoAte = Date.now() + 2500; render(true); return; }
        if (MP.papel === 'cliente') { cartaSelecionadaId = null; enviar('jogar', { pid: MP.pid, c: c.id }); return; }
        jogar(0, c);
    }
    function aoJogar({ pid, c }) {
        if (MP.papel !== 'host' || !ehSueca()) return;
        const s = G.donos.indexOf(pid);
        if (s < 1 || !G.humanos[s]) return;
        if (G.turno !== s || G.ocupado || G.mesa.length === 4) return;
        const carta = G.maos[s].find(x => x.id === c);
        if (!carta || erro(s, carta)) return;
        clearTimeout(G.timer);
        jogar(s, carta);
    }
    function jogar(i, c) {
        const origemEl = i === 0 ? document.querySelector(`#maoJogador .carta[data-id="${c.id}"]`) : null;
        const origemRect = origemEl ? origemEl.getBoundingClientRect() : null;
        if (i === 0) cartaSelecionadaId = null;
        G.maos[i] = G.maos[i].filter(x => x.id !== c.id);
        G.mesa.push({ jogador: i, carta: c });
        G.jogadas.add(c.id);
        if (G.mesa.length === 1) G.lider = c.naipe;
        const el = criarElementoCarta(c, 'jogada' + (G.mesa.length === 1 ? ' carta-lider' : ''));
        el.dataset.id = c.id;
        $(`carta-${i}`).appendChild(el);
        animarEntrada(el, i, origemRect);
        SFX.jogar();
        G.aviso = '';
        G.turno = (G.turno + 1) % 4;
        if (G.mesa.length === 4) { G.ocupado = true; render(); G.timer = setTimeout(resolver, 1300); }
        else agendar();
    }
    function resolver() {
        const w = vencedor(G.mesa);
        const p = G.mesa.reduce((s, j) => s + pontos(j.carta), 0);
        G.ptsEq[w % 2] += p;
        G.pts = [G.ptsEq[0], G.ptsEq[1], G.ptsEq[0], G.ptsEq[1]];
        const el = $(`carta-${w}`).firstChild; if (el) el.classList.add('carta-vencedora');
        G.venc = w; G.vazas++;
        G.aviso = `Vaza de ${G.nomes[w]} (+${p})`;
        render();
        G.timer = setTimeout(() => {
            varrerVaza(w);
            G.timer = setTimeout(() => {
                G.mesa = []; G.venc = null; G.lider = null; G.ocupado = false; G.aviso = '';
                for (let i = 0; i < 4; i++) $(`carta-${i}`).innerHTML = '';
                G.turno = w;
                if (G.vazas === 10) fimMao(); else agendar();
            }, reduzMovimento() ? 0 : 360);
        }, 760);
    }
    function fimMao() {
        const [a, b] = G.ptsEq;
        let eq = -1, ganho = 0;
        if (a > 60) eq = 0; else if (b > 60) eq = 1;
        if (eq >= 0) {
            const p = G.ptsEq[eq];
            ganho = (p === 120 ? 4 : p >= 91 ? 2 : 1) * (G.dobro ? 2 : 1);
            G.jogos[eq] += ganho; G.dobro = false;
        } else G.dobro = true;
        G.totais = [G.jogos[0], G.jogos[1], G.jogos[0], G.jogos[1]];
        const fim = G.jogos[0] >= META || G.jogos[1] >= META;
        const d = { mao: G.rodada, pts: [a, b], eq, ganho, jg: [...G.jogos], fim, dobro: G.dobro, nomes: [[G.nomes[0], G.nomes[2]], [G.nomes[1], G.nomes[3]]], eu: 0 };
        G.ocupado = true; G.aviso = '';
        render();
        MP.ultimoD = d;
        if (MP.ativo && MP.papel === 'host') enviar('evt', { su: 1, t: 'modal', d });
        mostrarModal(d);
        if (!fim) G.timer = setTimeout(() => { if (G && G.jogo === 'sueca') novaMao(); }, 5200);
    }
    function mostrarModal(d) {
        const eu = G.eu || 0, meu = eu % 2, outro = 1 - meu;
        const nomesEq = e => d.nomes[e].join(' e ');
        let h = d.fim ? '<h2>🏁 Fim da partida!</h2>' : `<h2>Fim da mão ${d.mao}</h2>`;
        h += `<p><b>Sua dupla</b> (${nomesEq(meu)}): <b>${d.pts[meu]}</b> pontos<br><b>Adversários</b> (${nomesEq(outro)}): <b>${d.pts[outro]}</b> pontos</p>`;
        if (d.eq < 0) h += '<p>🤝 Empate 60 × 60: ninguém marca. A próxima mão vale <b>dobro</b>.</p>';
        else {
            const nome = d.ganho === 4 || d.pts[d.eq] === 120 ? 'BANDEIRA! ' : (d.pts[d.eq] >= 91 ? 'Capote! ' : '');
            h += `<p>${d.eq === meu ? '✅ Sua dupla' : '❌ A dupla adversária'} ganhou a mão. ${nome}<b>+${d.ganho} jogo${d.ganho > 1 ? 's' : ''}</b></p>`;
        }
        h += `<p class="sueca-jogos">Jogos: <b>${d.jg[meu]}</b> × <b>${d.jg[outro]}</b> <small>(vence quem chegar a ${META})</small></p>`;
        if (d.fim) {
            h += `<h3>${d.jg[meu] >= META ? '🏆 Sua dupla venceu!' : '😤 A dupla adversária venceu'}</h3>`;
            const host = !MP.ativo || MP.papel === 'host';
            h += host ? '<button type="button" class="btn-modo" id="btnSuecaNova">Nova partida</button>' : '<p class="sub">Aguardando o anfitrião iniciar outra partida…</p>';
            h += '<button type="button" class="btn-sec" id="btnSuecaSair">Sair para o menu</button>';
        } else h += '<p class="sub">A próxima mão começa já…</p>';
        $('modalBox').innerHTML = h;
        $('modal').classList.remove('escondido');
        const n = $('btnSuecaNova'); if (n) n.onclick = () => { $('modal').classList.add('escondido'); novaPartida(); };
        const s = $('btnSuecaSair'); if (s) s.onclick = () => sairParaMenu('telaModo');
    }
    function abrirPlacar() {
        $('modalRankingBox').innerHTML = `<h2>♣ Placar da Sueca</h2>
            <p><b>Trunfo:</b> ${NAIPES[G.trunfo].s} ${NAIPES[G.trunfo].nome}${G.dobro ? ' · mão valendo dobro' : ''}</p>
            <p><b>Sua dupla</b> (${[G.nomes[0], G.nomes[2]].join(' e ')})<br>Jogos: <b>${G.jogos[0]}</b> · Pontos na mão: <b>${G.ptsEq[0]}</b></p>
            <p><b>Adversários</b> (${[G.nomes[1], G.nomes[3]].join(' e ')})<br>Jogos: <b>${G.jogos[1]}</b> · Pontos na mão: <b>${G.ptsEq[1]}</b></p>
            <p class="sub">Vence quem fizer ${META} jogos. 61–90 pts = 1 jogo · 91–119 = 2 · 120 = 4.</p>
            ${!MP.ativo ? '<button type="button" class="btn-modo" id="btnRodarMesaSueca" style="margin:0 0 8px">🔄 Rodar mesa</button>' : ''}
            <button type="button" class="btn-sec" id="btnSairSueca" style="margin:0 0 8px">🚪 Sair do jogo</button>
            <button type="button" class="btn-modo" id="btnFecharPlacarSueca">Fechar</button>`;
        $('modalRanking').classList.remove('escondido');
        $('btnFecharPlacarSueca').onclick = () => $('modalRanking').classList.add('escondido');
        const r = $('btnRodarMesaSueca');
        if (r) r.onclick = () => { $('modalRanking').classList.add('escondido'); $('modal').classList.add('escondido'); clearTimeout(G.timer); pararAudiosEntrada(); iniciar(); };   // nova mesa, novos adversários
        $('btnSairSueca').onclick = () => { if (confirm('Sair do jogo e voltar à escolha do modo?')) sairParaMenu('telaModo'); };
    }

    // ---------- máquina ----------
    function escolherBot(i) {
        const mao = G.maos[i], legais = mao.filter(c => !erro(i, c));
        const tr = G.trunfo, mesa = G.mesa;
        const menor = l => l.slice().sort((a, b) => (pontos(a) - pontos(b)) || (forca(a) - forca(b)))[0];
        const maiorPts = l => l.slice().sort((a, b) => (pontos(b) - pontos(a)) || (forca(b) - forca(a)))[0];
        const jogada = c => G.jogadas.has(c.id) || mesa.some(j => j.carta.id === c.id);
        if (!mesa.length) {                                            // abrindo a vaza
            const nao = legais.filter(c => c.naipe !== tr);
            const asSeguro = nao.filter(c => c.valor === 12 || (c.valor === 5 && jogada({ id: `${c.naipe}-12` })));
            if (asSeguro.length) return asSeguro[0];
            const baixas = nao.filter(c => pontos(c) === 0);
            if (baixas.length) return baixas.sort((a, b) => forca(a) - forca(b))[0];
            if (nao.length) return menor(nao);
            return legais.slice().sort((a, b) => forca(a) - forca(b))[0];
        }
        const atual = vencedor(mesa), parceiroGanha = atual % 2 === i % 2, ultimo = mesa.length === 3;
        const cw = mesa.find(j => j.jogador === atual).carta;
        const bate = c => (c.naipe === tr && cw.naipe !== tr) || (c.naipe === cw.naipe && forca(c) > forca(cw));
        const vencedoras = legais.filter(bate);
        const ptsMesa = mesa.reduce((s, j) => s + pontos(j.carta), 0);
        if (parceiroGanha) {
            const seguro = ultimo || forca(cw) >= 8 || (cw.naipe === tr && forca(cw) >= 6);
            if (seguro) { const nt = legais.filter(c => c.naipe !== tr); return maiorPts(nt.length ? nt : legais); }
            return menor(legais);
        }
        if (vencedoras.length) {
            const nT = vencedoras.filter(c => c.naipe !== tr);
            const pool = nT.length ? nT : vencedoras;
            const barata = pool.slice().sort((a, b) => forca(a) - forca(b))[0];
            if (ptsMesa === 0 && pontos(barata) >= 10 && !ultimo) return menor(legais);   // não gastar Ás/7 à toa
            if (barata.naipe === tr && ptsMesa < 4 && legais.some(c => c.naipe !== tr)) return menor(legais.filter(c => c.naipe !== tr));
            return barata;
        }
        const nt = legais.filter(c => c.naipe !== tr);
        return menor(nt.length ? nt : legais);
    }

    // ---------- multijogador ----------
    function difundir() {
        if (!G || !MP.ch || !MP.emJogo || !ehSueca()) return;
        const s = {
            g: G.gid, r: G.rodada, t: G.turno, oc: G.ocupado, me: G.mesa.map(j => [j.jogador, j.carta.id]), li: G.lider,
            tr: G.trunfo, ct: G.cartaTrunfo.id, vc: G.venc == null ? null : G.venc, vz: G.vazas, pe: G.personagens.map(p => p.id), no: G.nomes,
            ho: G.humanos, do: G.donos, pt: G.ptsEq, jg: G.jogos, ca: G.carteador, db: G.dobro, av: G.aviso && /^⚠/.test(G.aviso) ? '' : (G.aviso || '')
        };
        const maos = {};
        G.donos.forEach((pid, i) => { if (pid && pid !== MP.pid) maos[pid] = G.maos[i].map(c => c.id); });
        const payload = { su: 1, s, maos };
        const txt = JSON.stringify(payload);
        if (txt === MP.ultimo) return;
        MP.ultimo = txt;
        enviar('snap', payload);
    }
    function aoSnap(payload) {
        const { s, maos } = payload;
        if (MP.papel === 'host' || !MP.ch || MP.espectador) return;
        if (s.g && s.g === MP.gidMorto) return;
        const eu = s.do.indexOf(MP.pid);
        if (eu < 0) return;
        MP.eu = eu; MP.ultimoSnap = payload;
        const rot = a => [0, 1, 2, 3].map(v => a[(v + eu) % 4]), v = i => (i - eu + 4) % 4;
        const eq = a => eu % 2 ? [a[1], a[0]] : [a[0], a[1]];
        const pt = eq(s.pt), jg = eq(s.jg), ant = MP.emJogo ? G : null;
        const g = {
            jogo: 'sueca', eu, nomes: rot(s.no), personagens: rot(s.pe).map(id => PERSONAGENS.find(p => p.id === id)),
            totais: [jg[0], jg[1], jg[0], jg[1]], pts: [pt[0], pt[1], pt[0], pt[1]], jogos: jg, ptsEq: pt, dobro: !!s.db,
            turno: v(s.t), ocupado: s.oc, distribuindo: false, distMsg: '', recebidas: [10, 10, 10, 10], rodadaEncerrada: false,
            mesa: s.me.map(([j, c]) => ({ jogador: v(j), carta: cartaDeId(c) })), lider: s.li, trunfo: s.tr, cartaTrunfo: cartaDeId(s.ct),
            quebrada: false, vazas: s.vz, maos: [(maos[MP.pid] || []).map(cartaDeId), [], [], []], pegas: [[], [], [], []],
            aviso: s.av || '', carteador: v(s.ca), rodada: s.r, venc: s.vc == null ? null : v(s.vc), humanos: rot(s.ho), donos: rot(s.do),
            hostPid: s.do[0], virarMao: false, gid: s.g || null, avisoAte: 0, vago: [false, false, false, false], fila: [],
            estampasJogadores: ant && ant.estampasJogadores ? ant.estampasJogadores : ['', '', '', '']
        };
        g.personagens.forEach((p, i) => { p.total = g.totais[i]; });
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
        sincronizarMesaCliente();
    }
    function aoEvento(p) {
        if (p.t === 'modal' && MP.papel === 'cliente' && ehSueca()) { MP.ultimoD = p.d; mostrarModal(p.d); }
    }
    function verificarSaidas() {
        if (!MP.emJogo || !ehSueca()) return;
        const vivos = new Set(MP.membros.map(m => m.pid));
        if (MP.papel === 'host') {
            const ausente = G.donos.some((pid, i) => G.humanos[i] && pid && pid !== MP.pid && !vivos.has(pid));
            if (ausente && !MP.tSaida) MP.tSaida = setTimeout(() => {      // 3 s de tolerância para oscilar a conexão
                MP.tSaida = null;
                if (!G || !ehSueca() || MP.papel !== 'host') return;
                const v2 = new Set(MP.membros.map(m => m.pid));
                G.donos.forEach((pid, i) => {
                    if (pid && pid !== MP.pid && G.humanos[i] && !v2.has(pid)) {
                        G.humanos[i] = false;                                  // a máquina assume o lugar de quem saiu
                        if (G.turno === i && !G.ocupado && G.mesa.length < 4) agendar();
                    }
                });
                render();
            }, 3000);
        } else if (G.hostPid && !vivos.has(G.hostPid)) {
            if (!MP.tSaida) MP.tSaida = setTimeout(() => {
                MP.tSaida = null;
                if (!G || !ehSueca() || MP.papel !== 'cliente') return;
                if (!new Set(MP.membros.map(m => m.pid)).has(G.hostPid)) voltarParaEspera('O anfitrião saiu da partida de Sueca.');
            }, 3000);
        }
    }
    // texto do topo: trunfo + placar das duplas
    function atualizarInfo() {
        const el = $('suecaInfo'); if (!el) return;
        if (!ehSueca()) { el.classList.add('escondido'); return; }
        const tr = NAIPES[G.trunfo];
        el.innerHTML = `<span class="su-trunfo ${tr.cor}" title="Trunfo">Trunfo ${tr.s}</span><span class="su-jogos" title="Jogos (vence quem chegar a ${META})">${G.jogos[0]} × ${G.jogos[1]}</span><span class="su-pts" title="Pontos da mão">Mão ${G.ptsEq[0]}–${G.ptsEq[1]}</span>`;
        el.style.top = (($('topbar') ? $('topbar').getBoundingClientRect().bottom : 118) + 6) + 'px';
        el.classList.remove('escondido');
    }
    return { iniciar, iniciarMP, novaPartida, tentarJogar, aoJogar, agendar, difundir, aoSnap, aoEvento, verificarSaidas, abrirPlacar, atualizarInfo, forca, pontos, erro, vencedor, escolherBot };
})();
