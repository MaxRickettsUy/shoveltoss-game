create extension if not exists pgcrypto;

create table if not exists public.high_scores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 20),
  character_name text not null default 'Unknown' check (char_length(character_name) between 1 and 20),
  score integer not null check (score > 0),
  created_at timestamptz not null default now()
);

alter table public.high_scores
  add column if not exists character_name text not null default 'Unknown';

alter table public.high_scores
  drop constraint if exists high_scores_character_name_check;

alter table public.high_scores
  add constraint high_scores_character_name_check
  check (char_length(character_name) between 1 and 20);

alter table public.high_scores enable row level security;

drop policy if exists "Anyone can read high scores" on public.high_scores;
create policy "Anyone can read high scores"
  on public.high_scores
  for select
  using (true);

drop policy if exists "Anyone can insert valid high scores" on public.high_scores;
create policy "Anyone can insert valid high scores"
  on public.high_scores
  for insert
  with check (
    char_length(name) between 1 and 20
    and char_length(character_name) between 1 and 20
    and score > 0
  );
