alter table public.matches
  add column if not exists level_id text
    check (level_id is null or char_length(level_id) between 1 and 32),
  add column if not exists challenger_character_id text
    check (challenger_character_id is null or char_length(challenger_character_id) between 1 and 32),
  add column if not exists recipient_character_id text
    check (recipient_character_id is null or char_length(recipient_character_id) between 1 and 32);

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

  if old.level_id is not null
    and new.level_id is distinct from old.level_id then
    raise exception 'level_id cannot be overwritten';
  end if;

  if old.challenger_character_id is not null
    and new.challenger_character_id is distinct from old.challenger_character_id then
    raise exception 'challenger_character_id cannot be overwritten';
  end if;

  if old.recipient_character_id is not null
    and new.recipient_character_id is distinct from old.recipient_character_id then
    raise exception 'recipient_character_id cannot be overwritten';
  end if;

  return new;
end;
$$;
