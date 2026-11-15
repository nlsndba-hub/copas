# Miquilino V22

## O que subir no GitHub (raiz do site)
index.html, script.js, style.css, config.js (+ os arquivos de imagem/áudio que você já tem).
**NÃO suba a pasta `privado/`** (tem as senhas em texto). A pasta `sql/` é só para você rodar no Supabase.

## SQL (SQL Editor do Supabase, uma consulta nova para cada)
1. `sql/supabase-v22.sql`  — cria os usuários/login e atualiza o Misto (2 min).
2. `privado/usuarios-seed.sql` — cria os 15 usuários com senha criptografada.
(`sql/supabase.sql` e `sql/supabase-ranking.sql` você já rodou.)

## Como funciona
- Iniciar → Login (usuário e senha) → escolher o modo. Você sempre joga com o personagem do seu usuário.
- "Manter conectado" lembra o login no aparelho. "Trocar de usuário" fica na tela de modos.
- **Sozinho**: você + 3 máquinas.
- **Misto**: sala aberta (piscando em vermelho) por 2 min. Entrou ninguém → joga com 3 máquinas; 1 entrou → 2 jogadores + 2 máquinas; 2 entraram → 3 jogadores + 1 máquina; entraram 4 → começa na hora, sem máquinas, e a sala vira "Sala" (ganha nome e senha 🔑).
- **Sala**: sem máquinas. Fica na espera até entrarem 4 jogadores; então começa sozinha. Se alguém sair no meio, todos voltam à espera do bar até completar 4.
- **Sair do bar**: no 🏆, botão "🚪 Sair do bar" (vale para qualquer modo) → volta ao início.
- Ranking geral compartilhado no servidor (tabela `ranking_geral`, jogo `copas`).
