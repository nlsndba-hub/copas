-- =====================================================================
--  MIQUILINO V21 — RANKING GERAL NO SERVIDOR (rode UMA vez no SQL Editor)
--  Uma só tabela serve para todos os jogos: a coluna "jogo" separa
--  o ranking de cada um ('copas' hoje; 'sueca' quando você criar).
-- =====================================================================

create table if not exists public.ranking_geral (
  jogo          text not null check (jogo ~ '^[a-z0-9_]{2,20}$'),
  personagem    int  not null check (personagem between 1 and 99),
  pontos        int  not null default 0,      -- no Copas: menos pontos = melhor posição
  partidas      int  not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (jogo, personagem)
);

-- Ninguém mexe na tabela direto: só pelas funções abaixo.
alter table public.ranking_geral enable row level security;
revoke all on table public.ranking_geral from anon, authenticated;

-- Lê o ranking de um jogo.
create or replace function public.ranking_listar(p_jogo text)
returns table (personagem int, pontos int, partidas int)
language sql security definer set search_path = public as $$
  select r.personagem, r.pontos, r.partidas
  from public.ranking_geral r where r.jogo = p_jogo;
$$;

-- Soma os pontos de UMA partida. p_personagens e p_deltas têm o mesmo tamanho:
-- o personagem i recebe p_deltas[i] (ex.: Copas: 1º -1, 2º +1, 3º +1, 4º +2).
create or replace function public.ranking_registrar(p_jogo text, p_personagens int[], p_deltas int[])
returns void language plpgsql security definer set search_path = public as $$
declare i int;
begin
  if p_jogo !~ '^[a-z0-9_]{2,20}$' then raise exception 'jogo invalido'; end if;
  if p_personagens is null or p_deltas is null
     or array_length(p_personagens, 1) is distinct from array_length(p_deltas, 1)
     or array_length(p_personagens, 1) not between 1 and 8 then
    raise exception 'dados invalidos';
  end if;
  for i in 1 .. array_length(p_personagens, 1) loop
    if p_deltas[i] not between -20 and 20 then raise exception 'delta invalido'; end if;
    insert into public.ranking_geral as r (jogo, personagem, pontos, partidas)
    values (p_jogo, p_personagens[i], p_deltas[i], 1)
    on conflict (jogo, personagem) do update
      set pontos = r.pontos + excluded.pontos,
          partidas = r.partidas + 1,
          atualizado_em = now();
  end loop;
end $$;

grant execute on function public.ranking_listar(text), public.ranking_registrar(text, int[], int[])
to anon, authenticated;

-- Para zerar o ranking do Copas (se um dia quiser):
--   delete from public.ranking_geral where jogo = 'copas';
