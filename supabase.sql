-- =====================================================================
--  MIQUILINO V20 — banco Supabase (rode UMA vez em: SQL Editor > New query)
--  Guarda só a lista de salas. Partida e voz NÃO passam pelo banco.
-- =====================================================================

create table if not exists public.salas (
  id            uuid primary key default gen_random_uuid(),
  canal         uuid not null default gen_random_uuid(),   -- nome secreto do canal (só quem acerta a senha recebe)
  tipo          text not null default 'sala' check (tipo in ('sala','misto')),
  nome          text not null,
  senha         text,
  status        text not null default 'espera' check (status in ('espera','jogando')),
  contagem      int  not null default 1,
  inicio_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Ninguém acessa a tabela direto (nem a senha): tudo passa pelas funções abaixo.
alter table public.salas enable row level security;
revoke all on table public.salas from anon, authenticated;

-- Salas sem sinal de vida há 2 minutos são apagadas (sala vazia = ninguém dá "ping").
create or replace function public.limpar_salas() returns void
language sql security definer set search_path = public as $$
  delete from public.salas where atualizado_em < now() - interval '120 seconds';
$$;
revoke execute on function public.limpar_salas() from public, anon, authenticated;

create or replace function public.listar_salas()
returns table (id uuid, nome text, contagem int, status text)
language plpgsql security definer set search_path = public as $$
begin
  perform public.limpar_salas();
  return query
    select s.id, s.nome, s.contagem, s.status
    from public.salas s where s.tipo = 'sala' order by s.nome;
end $$;

create or replace function public.criar_sala(p_nome text, p_senha text)
returns json language plpgsql security definer set search_path = public as $$
declare r public.salas;
begin
  perform public.limpar_salas();
  insert into public.salas (tipo, nome, senha)
  values ('sala', left(trim(p_nome), 60), upper(left(trim(p_senha), 20)))
  returning * into r;
  return json_build_object('id', r.id, 'canal', r.canal, 'agora', now());
end $$;

create or replace function public.entrar_sala(p_id uuid, p_senha text)
returns json language plpgsql security definer set search_path = public as $$
declare r public.salas;
begin
  select * into r from public.salas where id = p_id and tipo = 'sala';
  if not found then return json_build_object('erro', 'inexistente'); end if;
  if r.senha is distinct from upper(trim(p_senha)) then return json_build_object('erro', 'senha'); end if;
  return json_build_object('canal', r.canal, 'nome', r.nome, 'status', r.status, 'agora', now());
end $$;

-- Modo MISTO: entra na sala aberta há menos de 5 min (se houver vaga) ou cria uma nova.
create or replace function public.entrar_misto()
returns json language plpgsql security definer set search_path = public as $$
declare r public.salas;
begin
  perform public.limpar_salas();
  select * into r from public.salas
   where tipo = 'misto' and status = 'espera'
     and inicio_em > now() - interval '5 minutes' and contagem < 4
   order by inicio_em limit 1 for update;
  if found then
    update public.salas set contagem = contagem + 1, atualizado_em = now()
     where id = r.id returning * into r;
  else
    insert into public.salas (tipo, nome, inicio_em, contagem)
    values ('misto', 'Misto', now(), 1) returning * into r;
  end if;
  return json_build_object('id', r.id, 'canal', r.canal, 'inicio_em', r.inicio_em, 'agora', now());
end $$;

-- "Estou vivo": renova a sala. Com p_n = 0 a sala é apagada na hora.
create or replace function public.ping_sala(p_canal uuid, p_n int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_n <= 0 then
    delete from public.salas where canal = p_canal;
  else
    update public.salas
       set atualizado_em = now(),
           contagem = case when tipo = 'misto' then greatest(contagem, p_n) else p_n end
     where canal = p_canal;
  end if;
end $$;

create or replace function public.marcar_jogando(p_canal uuid)
returns void language sql security definer set search_path = public as $$
  update public.salas set status = 'jogando', atualizado_em = now() where canal = p_canal;
$$;

grant execute on function
  public.listar_salas(), public.criar_sala(text, text), public.entrar_sala(uuid, text),
  public.entrar_misto(), public.ping_sala(uuid, int), public.marcar_jogando(uuid)
to anon, authenticated;
