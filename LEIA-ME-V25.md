# Miquilino V25

## O que subir no GitHub (raiz do site)
index.html, script.js, style.css, config.js (+ os arquivos de imagem/áudio que você já tem).
**NÃO suba a pasta `privado/`** (tem as senhas em texto). A pasta `sql/` é só para você rodar no Supabase.

## SQL (SQL Editor do Supabase, uma consulta nova para cada)
- **Novo na V25:** rode `sql/supabase-v24.sql` (entrar nas salas sem senha).
- Os demais (`supabase.sql`, `supabase-ranking.sql`, `supabase-v22.sql`, `privado/usuarios-seed.sql`) você já rodou.

## Como funciona
- Iniciar → Login (usuário e senha) → escolher o modo. Você sempre joga com o personagem do seu usuário.
- "Manter conectado" lembra o login no aparelho. "Trocar de usuário" fica na tela de modos.
- **Sozinho**: você + 3 máquinas.
- **Misto**: sala aberta (piscando em vermelho) por 2 min. Entrou ninguém → joga com 3 máquinas; 1 entrou → 2 jogadores + 2 máquinas; 2 entraram → 3 jogadores + 1 máquina; entraram 4 → começa na hora, sem máquinas, e a sala vira "Sala" (ganha nome e senha 🔑).
- **Sala**: sem máquinas. Fica na espera até entrarem 4 jogadores; então começa sozinha. Se alguém sair no meio, todos voltam à espera do bar até completar 4.
- Salas **sem senha**: basta tocar no bar na lista.
- Quem está na vez fica com uma **luz roxa piscando**.
- Voz no PC: **segurar o clique esquerdo por 2 s** (ou esquerdo + direito juntos). Celular: tocar e segurar 2 s.
- **Sair do bar**: no 🏆, botão "🚪 Sair do bar" (vale para qualquer modo) → volta ao início.
- Ranking geral compartilhado no servidor (tabela `ranking_geral`, jogo `copas`). **Só contam partidas com 4 jogadores (modo Sala, ou Misto que encheu).** Partidas com máquinas (Sozinho, Misto incompleto) não pontuam.

## Quando alguém sai no meio da partida (modo Sala) — V25
- A partida **para** e espera a pessoa voltar (aviso roxo "Aguardando fulano voltar…").
- Quem voltar (entrando de novo no mesmo bar, pela lista) reassume o lugar e a partida segue de onde parou.
- O **primeiro jogador presente** vê o botão "🤖 Adicionar máquina": coloca uma máquina no lugar do ausente (continua com a pontuação dele). Pode adicionar até 3 máquinas. A partida com máquina **não conta mais para o ranking geral**.
- Se quem sai é o primeiro (o anfitrião), o segundo assume o comando e o botão passa a aparecer para ele. Se saírem os dois primeiros, passa para o terceiro, e assim por diante.
- Se não sobrar nenhum jogador, a partida acaba e o bar some sozinho.
- Para isso funcionar, a cópia do estado do jogo (inclusive as cartas de todos) viaja no canal da sala para os jogadores.
