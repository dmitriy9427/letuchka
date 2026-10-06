-- «Летучка»: схема базы для Supabase.
-- Как применить: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Подробный разбор — docs/05-supabase.md.

-- ─── Таблицы ────────────────────────────────────────────────────────────────

create table if not exists public.rooms (
  id text primary key check (id ~ '^[a-z0-9]{8}$'),
  title text not null check (char_length(title) between 1 and 80),
  -- auth.uid() — id пользователя из токена запроса. Подставляется сервером,
  -- подделать его из браузера нельзя.
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  phase text not null default 'write' check (phase in ('write', 'vote', 'discuss')),
  timer_end timestamptz,
  focus_card_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms on delete cascade,
  "column" text not null check ("column" in ('good', 'bad', 'ideas')),
  text text not null check (char_length(text) between 1 and 280),
  author_id uuid not null default auth.uid() references auth.users on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  card_id uuid not null references public.cards on delete cascade,
  room_id text not null references public.rooms on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  primary key (card_id, user_id)
);

create index if not exists cards_room_idx on public.cards (room_id);
create index if not exists votes_room_idx on public.votes (room_id);

-- ─── Права доступа: Row Level Security ──────────────────────────────────────
-- Публичный ключ есть у каждого, кто открыл сайт. Защищают данные не ключи,
-- а эти правила: база проверяет каждую строку каждого запроса.

alter table public.rooms enable row level security;
alter table public.cards enable row level security;
alter table public.votes enable row level security;

-- Вспомогательная функция: этап комнаты. security definer — выполняется с
-- правами владельца функции, поэтому её можно звать внутри правил.
create or replace function public.room_phase(rid text) returns text
language sql stable security definer set search_path = public as $$
  select phase from public.rooms where id = rid
$$;

-- Комнаты: читать может любой вошедший (знает ссылку — знает id),
-- создать — только от своего имени, менять — только ведущий.
drop policy if exists "rooms read" on public.rooms;
create policy "rooms read" on public.rooms for select to authenticated using (true);
drop policy if exists "rooms create" on public.rooms;
create policy "rooms create" on public.rooms for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "rooms update by owner" on public.rooms;
create policy "rooms update by owner" on public.rooms for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Карточки: писать и править — только свои и только на этапе «пишем»;
-- удалять — автор или ведущий.
drop policy if exists "cards read" on public.cards;
create policy "cards read" on public.cards for select to authenticated using (true);
drop policy if exists "cards create" on public.cards;
create policy "cards create" on public.cards for insert to authenticated
  with check (author_id = auth.uid() and public.room_phase(room_id) = 'write');
drop policy if exists "cards update own" on public.cards;
create policy "cards update own" on public.cards for update to authenticated
  using (author_id = auth.uid() and public.room_phase(room_id) = 'write')
  with check (author_id = auth.uid());
drop policy if exists "cards delete" on public.cards;
create policy "cards delete" on public.cards for delete to authenticated
  using (
    author_id = auth.uid()
    or exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
  );

-- Голоса: только свои, только на этапе «голосуем» и не больше трёх в комнате.
-- Лимит проверяет база — обойти его, отправив запрос в обход интерфейса, нельзя.
drop policy if exists "votes read" on public.votes;
create policy "votes read" on public.votes for select to authenticated using (true);
drop policy if exists "votes create" on public.votes;
create policy "votes create" on public.votes for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.room_phase(room_id) = 'vote'
    -- карточка действительно из этой комнаты (иначе счётчик голосов можно обмануть)
    and exists (select 1 from public.cards c where c.id = card_id and c.room_id = votes.room_id)
    and (select count(*) from public.votes v where v.room_id = votes.room_id and v.user_id = auth.uid()) < 3
  );
drop policy if exists "votes delete own" on public.votes;
create policy "votes delete own" on public.votes for delete to authenticated
  using (user_id = auth.uid() and public.room_phase(room_id) = 'vote');
