-- Estrutura da base de dados da Lista de Compras (projeto hqriuqulxvqqwtapiqed).
-- Aplicada a 09/10/2026. Só estrutura, sem dados: as cópias dos dados estão no
-- repositório privado Olga-Jordao/copias-supabase.

-- Cada registo da aplicação (secção, produto, lista, artigo, compra, definições) é
-- guardado aqui como JSON. A aplicação trabalha localmente e sincroniza esta tabela.
create table public.registos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  tabela text not null,
  dados jsonb not null,
  atualizado_em bigint not null,
  apagado boolean not null default false,
  servidor_em timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create index registos_user_servidor_em on public.registos (user_id, servidor_em);

alter table public.registos enable row level security;

create policy "ler os meus registos" on public.registos
  for select to authenticated using (user_id = (select auth.uid()));
create policy "criar os meus registos" on public.registos
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "alterar os meus registos" on public.registos
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A versão mais recente ganha: uma alteração mais antiga (vinda de um aparelho que
-- esteve offline) não apaga uma mais nova. servidor_em marca a ordem de chegada.
create function public.registos_antes_de_gravar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.atualizado_em < old.atualizado_em then
    return old;
  end if;
  new.servidor_em := clock_timestamp();
  return new;
end;
$$;

create trigger registos_antes_de_gravar
  before insert or update on public.registos
  for each row execute function public.registos_antes_de_gravar();
