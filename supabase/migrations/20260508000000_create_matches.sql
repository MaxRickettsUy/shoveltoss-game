create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  challenger_name text not null check (char_length(challenger_name) between 1 and 20),
  recipient_name text check (recipient_name is null or char_length(recipient_name) between 1 and 20),
  challenger_score integer check (challenger_score is null or challenger_score between -18 and 54),
  recipient_score integer check (recipient_score is null or recipient_score between -18 and 54),
  challenger_finished_at timestamptz,
  recipient_finished_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  status text not null default 'pending' check (status in ('pending', 'playing', 'complete', 'expired'))
);

create index if not exists matches_recipient_pending_idx
  on public.matches (recipient_name, status)
  where status in ('pending', 'playing');

create index if not exists matches_challenger_pending_idx
  on public.matches (challenger_name, status)
  where status in ('pending', 'playing');

create unique index if not exists matches_one_open_per_pair_idx
  on public.matches (challenger_name, recipient_name)
  where status = 'pending' and recipient_name is not null;

alter table public.matches enable row level security;

drop policy if exists "Anyone can read matches" on public.matches;
create policy "Anyone can read matches"
  on public.matches for select
  using (true);

drop policy if exists "Anyone can create matches" on public.matches;
create policy "Anyone can create matches"
  on public.matches for insert
  with check (
    challenger_score is null
    and recipient_score is null
    and challenger_finished_at is null
    and recipient_finished_at is null
    and status = 'pending'
    and expires_at <= (now() + interval '14 days')
  );

drop policy if exists "Anyone can update unfilled match fields" on public.matches;
create policy "Anyone can update unfilled match fields"
  on public.matches for update
  using (status in ('pending', 'playing'))
  with check (
    (challenger_score is null or challenger_score = (select challenger_score from public.matches m where m.id = matches.id))
    and (recipient_score is null or recipient_score = (select recipient_score from public.matches m where m.id = matches.id))
    and status in ('playing', 'complete', 'expired')
  );
