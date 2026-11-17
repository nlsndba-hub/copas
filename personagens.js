// Personagens especiais de missão. Não possuem conta e não aparecem no login.
// Cada um só pode ser sorteado depois que sua missão for desbloqueada.
// V90: 15% de chance por partida de aparecer UM especial (o sorteio fica no script.js).
window.PERSONAGENS_MISSAO = [
    { id: 100, nome: 'Caneta Azul', foto: 'fotos/100.png', somenteBot: true, chanceSolo: 0.15, missaoId: 'missao_azul', audioEntrada: 'audio/100.mp3' },
    { id: 101, nome: 'Patixa Teló', foto: 'fotos/101.png', somenteBot: true, chanceSolo: 0.15, missaoId: 'missao_patixa', audioEntrada: 'audio/101.mp3' },
    { id: 102, nome: 'Robô Maicon', foto: 'fotos/102.png', somenteBot: true, chanceSolo: 0.15, missaoId: 'missao_102', audioEntrada: 'audio/102.mp3' }
];
