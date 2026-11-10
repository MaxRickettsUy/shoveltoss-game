-- Lock identity/lifecycle columns on matches and let the database decide when a
-- match is complete (avoids the client read-then-write race on status).
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

  if new.challenger_name is distinct from old.challenger_name then
    raise exception 'challenger_name cannot be changed';
  end if;

  if old.recipient_name is not null
    and new.recipient_name is distinct from old.recipient_name then
    raise exception 'recipient_name cannot be overwritten';
  end if;

  if new.invite_code is distinct from old.invite_code
    or new.created_at is distinct from old.created_at then
    raise exception 'invite_code and created_at cannot be changed';
  end if;

  if new.expires_at > old.expires_at then
    raise exception 'expires_at cannot be extended';
  end if;

  if new.challenger_score is not null and new.recipient_score is not null then
    new.status := 'complete';
  elsif new.status = 'complete' then
    raise exception 'match cannot be complete until both scores are in';
  elsif new.status = 'expired' and old.expires_at > now() then
    raise exception 'match has not expired yet';
  end if;

  return new;
end;
$$;

-- Repair matches left in 'playing' by the old client race.
update public.matches
set status = 'complete'
where challenger_score is not null
  and recipient_score is not null
  and status <> 'complete';
