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

// ================= PERSONAGENS E INÍCIO =================
// total = pontos acumulados na partida (eliminação >= 60)
// pontosRank = pontuação acumulada do Ranking Geral (1º=1, 2º=2, 3º=3, 4º=4 por rodada)
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
    const b = embaralhar(criarBaralho());
    G.maos = [0, 1, 2, 3].map(i => b.slice(i * 13, i * 13 + 13));
    G.mesa = []; G.lider = null; G.quebrada = false; G.vazas = 0;
    G.pts = [0, 0, 0, 0]; G.pegas = [[], [], [], []]; G.renunciou = [false, false, false, false]; G.ocupado = false; G.aviso = '';
    G.turno = G.maos.findIndex(m => m.some(c => c.naipe === PAU && c.valor === 0)); // quem tem o 2♣ começa
    G.distribuindo = true; G.rodadaEncerrada = false; G.cartasReveladas = 0;
    G.ordemDistribuicao = [];
    // Distribuição visual: primeiro todas as cartas aparecem com o verso; depois são reveladas uma a uma.
    for (let rodada = 0; rodada < 13; rodada++) for (let jogador = 0; jogador < 4; jogador++)
        G.ordemDistribuicao.push({ jogador, carta: G.maos[jogador][rodada] });
    for (let i = 0; i < 4; i++) $(`carta-${i}`).innerHTML = '';
    $('modal').classList.add('escondido');
    $('modalRanking').classList.add('escondido');
    render();
    G.timer = setTimeout(revelarProximaCarta, 180);
}

// Revela as cartas depois que as 52 já foram distribuídas visualmente com o verso para cima.
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

    // RENÚNCIA: ENCERRA A RODADA IMEDIATAMENTE
    if (renuncia) {
        G.ocupado = true;
        G.aviso = `${G.nomes[i]} RENUNCIOU! Recebeu os 26 pontos da rodada.`;

        clearTimeout(G.timer);
        render();

        // Não permite que os outros jogadores continuem a vaza.
        // Fecha a rodada e atribui exatamente 26 pontos ao renunciante.
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
        if (j.carta.naipe === G.lider && (!venc || j.carta.valor > venc.carta.valor)) venc = j;   // maior carta do naipe puxado
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

    // Guarda os 4 jogadores que participaram desta rodada antes de qualquer substituição
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

    // Ordena os 4 jogadores da mesa (menor total na partida = melhor colocação)
    // Define os pontos do Ranking Geral: 1º = +1, 2º = +2, 3º = +3, 4º = +4
    const classificacaoMesa = [...jogadoresMesaRodada].sort((a, b) =>
        a.totalPartida - b.totalPartida || a.ganhoRodada - b.ganhoRodada
    );

    classificacaoMesa.forEach((item, idx) => {
        // Em caso de empate exato nos pontos, mantém a mesma colocação/pontuação
        let posEfetiva = idx;
        while (
            posEfetiva > 0 &&
            classificacaoMesa[posEfetiva - 1].totalPartida === item.totalPartida &&
            classificacaoMesa[posEfetiva - 1].ganhoRodada === item.ganhoRodada
        ) {
            posEfetiva--;
        }
        const ptsRankGanho = posEfetiva + 1; // 1º=1, 2º=2, 3º=3, 4º=4
        item.ptsRankGanho = ptsRankGanho;
        item.personagem.pontosRank += ptsRankGanho;
    });

    // A eliminação e a reposição acontecem somente depois de fechar a rodada.
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

    // Tabela da rodada mostrando APENAS os 4 jogadores da mesa e os pontos ganhos no Rank Geral
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
        // No fim definitivo do jogo, exibe também o Ranking Geral Final completo
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

// ================= MODAL DO RANKING GERAL (DURANTE A PARTIDA) =================
function abrirRankingGeral() {
    if (!G) return;
    // Ordena por menor pontuação no Ranking Geral (1º=1, 2º=2, 3º=3, 4º=4), desempate pelos pontos de mesa
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
        if (G.vazas === 0 && G.mesa.length === 0)                // o 2♣ sai sozinho
            G.timer = setTimeout(() => jogar(0, G.maos[0].find(c => c.naipe === PAU && c.valor === 0)), 900);
    } else {
        G.timer = setTimeout(() => { const c = escolherBot(G.turno); jogar(G.turno, c); }, 900);
    }
}

function tentarJogar(c) {
    if (G.distribuindo || G.turno !== 0 || G.ocupado || G.mesa.length === 4) return;
    const erro = validar(0, c);
    // Jogar fora do naipe tendo cartas do naipe solicitado é permitido,
    // mas caracteriza RENÚNCIA e aplica a penalidade de 26 pontos.
    const renuncia = G.mesa.length > 0 && c.naipe !== G.lider &&
        G.maos[0].some(x => x.naipe === G.lider);
    if (erro && !renuncia) { G.aviso = '⚠ ' + erro; render(true); return; }
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

function criarVersoCarta() {
    const d = document.createElement('div');
    d.className = 'carta verso';
    d.setAttribute('aria-label', 'Carta virada para baixo');
    return d;
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
        const indice = G.ordemDistribuicao ? G.ordemDistribuicao.findIndex(x => x.jogador === 0 && x.carta.id === c.id) : -1;
        const revelada = !G.distribuindo || indice < G.cartasReveladas;
        // Não destacar/sugerir cartas válidas ou inválidas na mão do jogador.
        const el = revelada ? criarElementoCarta(c) : criarVersoCarta();
        if (revelada && !G.distribuindo) {
            el.tabIndex = 0; el.setAttribute('role', 'button');
            el.onclick = () => tentarJogar(c);
            el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tentarJogar(c); } };
        }
        div.appendChild(el);
    });
    if (G.rodadaEncerrada) {
        div.innerHTML = '';
        G.pegas[0].forEach(c => div.appendChild(criarElementoCarta(c, 'carta-ponto-final')));
        div.classList.add('mao-pontos-finais');
    } else div.classList.remove('mao-pontos-finais');
    // Jogadores
    for (let i = 0; i < 4; i++) {
        const cops = G.pegas[i].filter(c => c.naipe === COP).length, q = G.pegas[i].some(ehDama);
        const box = $(`j${i}`);
        box.classList.toggle('turno-ativo', i === G.turno && !G.ocupado);
        const ranking = [...PERSONAGENS].sort((a, b) => a.pontosRank - b.pontosRank || a.total - b.total).findIndex(p => p.id === G.personagens[i].id) + 1;
        box.innerHTML = `<img class="avatar-jogador" src="${G.personagens[i].foto}" alt="${G.nomes[i]}" onerror="this.src='fotos/${G.personagens[i].id}.png'; this.onerror=null">
            <span class="nome">${G.nomes[i]} <small class="ranking">${ranking}º</small></span>
            <span class="tot">Total: ${G.totais[i]}</span><span class="rod">Rodada: ${G.pts[i]}</span>`;
        if (G.rodadaEncerrada && i !== 0) {
            const faixa = document.createElement('div'); faixa.className = 'pontos-mao-final';
            G.pegas[i].forEach(c => faixa.appendChild(criarElementoCarta(c, 'carta-ponto-final')));
            box.appendChild(faixa);
        }
    }
    // Posiciona o painel do jogador humano imediatamente antes da primeira carta da mão.
    requestAnimationFrame(() => {
        const primeiraCarta = $('maoJogador').querySelector('.carta');
        const inicioMao = primeiraCarta ? primeiraCarta.getBoundingClientRect().left : $('maoJogador').getBoundingClientRect().left;
        $('j0').style.left = Math.max(8, inicioMao - 122) + 'px';
    });
    // Status
    const st = $('status');
    st.classList.toggle('aviso', G.aviso.startsWith('⚠'));
    if (G.distribuindo) st.textContent = 'Distribuindo as cartas…';
    else if (G.aviso) st.textContent = G.aviso;
    else if (G.vazas === 0 && G.mesa.length === 0) st.textContent = `Rodada ${G.rodada}: ${G.nomes[G.turno]} tem o 2♣ e começa.`;
    else if (minha) st.textContent = G.mesa.length ? `Sua vez — deve seguir ${NAIPES[G.lider].nome} ${NAIPES[G.lider].s}; jogar outro naipe tendo esse é renúncia.` : 'Sua vez — você abre a mesa.';
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


// Camuflagem discreta: Ctrl + botão direito alterna uma tela preta, sem tocar no jogo ou no áudio.
const camuflagem = document.createElement('div');
camuflagem.id = 'camuflagem';
document.body.appendChild(camuflagem);
let camuflado = false;
document.addEventListener('contextmenu', e => {
    if (e.ctrlKey) { e.preventDefault(); camuflado = !camuflado; camuflagem.classList.toggle('ativa', camuflado); }
});