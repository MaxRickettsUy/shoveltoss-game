create extension if not exists pgcrypto;

create table if not exists public.high_scores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 20),
  character_name text not null default 'Unknown' check (char_length(character_name) between 1 and 20),
  score integer not null check (score between 1 and 10000),
  created_at timestamptz not null default now()
);

alter table public.high_scores
  add column if not exists character_name text not null default 'Unknown';

alter table public.high_scores
  drop constraint if exists high_scores_character_name_check;

alter table public.high_scores
  add constraint high_scores_character_name_check
  check (char_length(character_name) between 1 and 20);

alter table public.high_scores
  drop constraint if exists high_scores_score_check;

alter table public.high_scores
  add constraint high_scores_score_check
  check (score between 1 and 10000);

alter table public.high_scores
  drop constraint if exists high_scores_character_name_roster_check;

alter table public.high_scores
  add constraint high_scores_character_name_roster_check
  check (character_name in (
    'Alexsama','Anheuser','Assman','Buck','Billie','Chef','Chuggo','Cowgirl',
    'Gucci','Inspector','Luchador','Maria','Ore','Patriot','Seaman','Shrek',
    'Smokey','Wagie','WD40','Xena','Unknown'
  ));

alter table public.high_scores
  drop constraint if exists high_scores_name_no_control_check;

alter table public.high_scores
  add constraint high_scores_name_no_control_check
  check (name !~ U&'[\0001-\001F\007F\200B-\200F\202A-\202E\FEFF]');

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
    and name !~ U&'[\0001-\001F\007F\200B-\200F\202A-\202E\FEFF]'
    and char_length(character_name) between 1 and 20
    and character_name in (
      'Alexsama','Anheuser','Assman','Buck','Billie','Chef','Chuggo','Cowgirl',
      'Gucci','Inspector','Luchador','Maria','Ore','Patriot','Seaman','Shrek',
      'Smokey','Wagie','WD40','Xena','Unknown'
    )
    and score between 1 and 10000
  );
