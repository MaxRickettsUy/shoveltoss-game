create or replace function public.prevent_match_score_overwrite()
returns trigger
language plpgsql
as $$
begin
  if old.challenger_score is not null
    and new.challenger_score is distinct from old.challenger_score then
    raise exception 'challenger_score cannot be overwritten';
  end if;

  if old.recipient_score is not null
    and new.recipient_score is distinct from old.recipient_score then
    raise exception 'recipient_score cannot be overwritten';
  end if;

  if old.challenger_finished_at is not null
    and new.challenger_finished_at is distinct from old.challenger_finished_at then
    raise exception 'challenger_finished_at cannot be overwritten';
  end if;

  if old.recipient_finished_at is not null
    and new.recipient_finished_at is distinct from old.recipient_finished_at then
    raise exception 'recipient_finished_at cannot be overwritten';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_match_score_overwrite on public.matches;
create trigger prevent_match_score_overwrite
  before update on public.matches
  for each row
  execute function public.prevent_match_score_overwrite();

drop policy if exists "Anyone can update unfilled match fields" on public.matches;
create policy "Anyone can update unfilled match fields"
  on public.matches for update
  using (status in ('pending', 'playing'))
  with check (
    status in ('playing', 'complete', 'expired')
    and (challenger_score is null or challenger_score between -18 and 54)
    and (recipient_score is null or recipient_score between -18 and 54)
  );
