# Miquilino V21 — Sozinho / Misto / Sala + voz

## Instalar (uma vez só)
1. (Já feito) Projeto criado no Supabase e os SQLs `supabase.sql` e `supabase-ranking.sql` rodados no SQL Editor.
2. (Já feito) Mesmo assim, se precisar recriar tudo, os dois arquivos estão no zip.
3. O `config.js` já vem preenchido com a URL e a chave publishable do seu projeto.
4. Suba todos os arquivos (os de sempre + `config.js`) no GitHub Pages (precisa de HTTPS para o microfone).

## Como funciona
- **Sozinho**: igual ao que já existia.
- **Misto**: a sala fica piscando em vermelho por 5 min. Quem entrar nesse tempo joga junto; as máquinas completam a mesa.
- **Sala**: gera um bar com nome engraçado e senha. Amigos escolhem o bar na lista e digitam a senha. O anfitrião (👑) toca em "Começar partida". Ícone da chave 🔑 na barra do topo mostra a senha. Salas sem ninguém somem em até 2 min.
- **Voz** (Misto e Sala): PC = segurar botão esquerdo + direito do mouse; celular = tocar e segurar 2 s. O áudio vai direto entre os jogadores (WebRTC), não é gravado nem passa pelo banco. Quem fala fica com o personagem pulsando em azul neon.

## Limites
- O anfitrião roda a partida: se ele sair, a partida acaba para todos. Se outro jogador sair, uma máquina assume o lugar.
- O ranking geral continua salvo em cada aparelho (localStorage).
- Voz usa só servidores STUN gratuitos; em redes muito restritivas (alguns 4G/empresas) pode não conectar.
- As mãos viajam no canal da sala: não é à prova de trapaça para quem abrir as ferramentas do navegador.

## Ranking geral no servidor (V21)
- Tabela `ranking_geral` (colunas: `jogo`, `personagem`, `pontos`, `partidas`). A coluna `jogo` separa os rankings: hoje `'copas'`; para a Sueca use outro valor (ex.: `'sueca'`) e as mesmas funções `ranking_registrar` / `ranking_listar`.
- Ao fim de cada partida (60 pontos), quem comanda a partida (você sozinho, ou o anfitrião da sala) grava no servidor: 1º lugar -1, 2º e 3º +1, último +2. Todos veem o mesmo ranking ao tocar no 🏆.
- O botão do troféu agora só reinicia o jogo; **não apaga** o ranking do servidor. Para zerar: `delete from public.ranking_geral where jogo = 'copas';`
- Sem Supabase configurado, o ranking continua salvo só no aparelho. Os pontos antigos do aparelho não são enviados ao servidor.
