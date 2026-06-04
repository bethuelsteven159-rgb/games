create extension if not exists "pgcrypto";
create extension if not exists "citext";

do $$
begin
  create type public.game_type as enum ('number_duel');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.challenge_status as enum (
    'pending',
    'accepted',
    'declined',
    'cancelled',
    'expired'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.game_status as enum (
    'setup',
    'active',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_type as enum (
    'challenge_received',
    'challenge_accepted',
    'challenge_declined',
    'your_turn',
    'game_completed',
    'comment_added'
  );
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique,
  display_name text,
  avatar_url text,
  bio text default '',
  website_url text,
  favorite_game_mode public.game_type default 'number_duel',
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (
    username ~ '^[a-zA-Z0-9_]{3,20}$'
  )
);

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  game_type public.game_type not null default 'number_duel',
  player_one_id uuid not null references public.profiles(id) on delete cascade,
  player_two_id uuid not null references public.profiles(id) on delete cascade,
  digit_length smallint not null default 4 check (digit_length between 4 and 6),
  allow_repeats boolean not null default false,
  status public.game_status not null default 'setup',
  current_turn_player_id uuid references public.profiles(id),
  winner_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint different_players check (player_one_id <> player_two_id),
  constraint current_turn_must_be_player check (
    current_turn_player_id is null
    or current_turn_player_id = player_one_id
    or current_turn_player_id = player_two_id
  ),
  constraint winner_must_be_player check (
    winner_id is null
    or winner_id = player_one_id
    or winner_id = player_two_id
  )
);

drop trigger if exists set_games_updated_at on public.games;

create trigger set_games_updated_at
before update on public.games
for each row
execute function public.set_updated_at();

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  challenged_id uuid not null references public.profiles(id) on delete cascade,
  game_type public.game_type not null default 'number_duel',
  digit_length smallint not null default 4 check (digit_length between 4 and 6),
  allow_repeats boolean not null default false,
  status public.challenge_status not null default 'pending',
  game_id uuid references public.games(id) on delete set null,
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz default now() + interval '7 days',
  updated_at timestamptz not null default now(),
  constraint cannot_challenge_self check (challenger_id <> challenged_id)
);

drop trigger if exists set_challenges_updated_at on public.challenges;

create trigger set_challenges_updated_at
before update on public.challenges
for each row
execute function public.set_updated_at();

create table if not exists public.game_secrets (
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  secret_number text not null,
  created_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

create table if not exists public.guesses (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  target_player_id uuid not null references public.profiles(id) on delete cascade,
  guess_value text not null,
  correct_count smallint not null check (correct_count >= 0),
  turn_number integer not null,
  created_at timestamptz not null default now(),
  unique (game_id, turn_number),
  unique (id, game_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  guess_id uuid,
  player_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  foreign key (guess_id, game_id)
    references public.guesses(id, game_id)
    on delete cascade
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type public.notification_type not null,
  message text not null,
  metadata jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx
on public.profiles(username);

create index if not exists challenges_challenged_status_idx
on public.challenges(challenged_id, status);

create index if not exists challenges_challenger_status_idx
on public.challenges(challenger_id, status);

create index if not exists games_player_one_idx
on public.games(player_one_id);

create index if not exists games_player_two_idx
on public.games(player_two_id);

create index if not exists games_status_idx
on public.games(status);

create index if not exists guesses_game_turn_idx
on public.guesses(game_id, turn_number);

create index if not exists comments_game_idx
on public.comments(game_id, created_at);

create index if not exists notifications_user_read_idx
on public.notifications(user_id, read_at, created_at);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_username text;
  new_display_name text;
begin
  new_username := lower(coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1)
  ));

  new_display_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new_username
  );

  insert into public.profiles (
    id,
    username,
    display_name
  )
  values (
    new.id,
    new_username,
    new_display_name
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.is_game_player(
  p_game_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.games g
    where g.id = p_game_id
      and p_user_id in (g.player_one_id, g.player_two_id)
  );
$$;

grant execute on function public.is_game_player(uuid, uuid) to authenticated;

create or replace function public.is_valid_digit_code(
  p_code text,
  p_digit_length integer,
  p_allow_repeats boolean
)
returns boolean
language plpgsql
immutable
as $$
declare
  distinct_count integer;
begin
  if p_code is null then
    return false;
  end if;

  if p_code !~ ('^[0-9]{' || p_digit_length || '}$') then
    return false;
  end if;

  if p_allow_repeats = false then
    select count(distinct digit)
    into distinct_count
    from regexp_split_to_table(p_code, '') as digit;

    if distinct_count <> p_digit_length then
      return false;
    end if;
  end if;

  return true;
end;
$$;

create or replace function public.count_matching_digits(
  p_secret text,
  p_guess text,
  p_allow_repeats boolean
)
returns integer
language sql
immutable
as $$
  with digits as (
    select generate_series(0, 9)::text as digit
  ),
  counts as (
    select
      digit,
      length(p_secret) - length(replace(p_secret, digit, '')) as secret_count,
      length(p_guess) - length(replace(p_guess, digit, '')) as guess_count
    from digits
  )
  select coalesce(sum(least(secret_count, guess_count)), 0)::integer
  from counts;
$$;

create or replace function public.accept_challenge(
  p_challenge_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge public.challenges%rowtype;
  v_game_id uuid;
begin
  select *
  into v_challenge
  from public.challenges
  where id = p_challenge_id
  for update;

  if not found then
    raise exception 'Challenge not found.';
  end if;

  if v_challenge.challenged_id <> auth.uid() then
    raise exception 'Only the challenged player can accept this challenge.';
  end if;

  if v_challenge.status <> 'pending' then
    raise exception 'Challenge is not pending.';
  end if;

  if v_challenge.expires_at is not null and v_challenge.expires_at < now() then
    update public.challenges
    set status = 'expired'
    where id = p_challenge_id;

    raise exception 'Challenge has expired.';
  end if;

  insert into public.games (
    game_type,
    player_one_id,
    player_two_id,
    digit_length,
    allow_repeats,
    status,
    current_turn_player_id
  )
  values (
    v_challenge.game_type,
    v_challenge.challenger_id,
    v_challenge.challenged_id,
    v_challenge.digit_length,
    v_challenge.allow_repeats,
    'setup',
    v_challenge.challenger_id
  )
  returning id into v_game_id;

  update public.challenges
  set
    status = 'accepted',
    responded_at = now(),
    game_id = v_game_id
  where id = p_challenge_id;

  insert into public.notifications (
    user_id,
    actor_id,
    type,
    message,
    metadata
  )
  values (
    v_challenge.challenger_id,
    v_challenge.challenged_id,
    'challenge_accepted',
    'Your challenge was accepted.',
    jsonb_build_object('game_id', v_game_id, 'challenge_id', p_challenge_id)
  );

  return v_game_id;
end;
$$;

grant execute on function public.accept_challenge(uuid) to authenticated;

create or replace function public.decline_challenge(
  p_challenge_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge public.challenges%rowtype;
begin
  select *
  into v_challenge
  from public.challenges
  where id = p_challenge_id
  for update;

  if not found then
    raise exception 'Challenge not found.';
  end if;

  if v_challenge.challenged_id <> auth.uid() then
    raise exception 'Only the challenged player can decline this challenge.';
  end if;

  if v_challenge.status <> 'pending' then
    raise exception 'Challenge is not pending.';
  end if;

  update public.challenges
  set
    status = 'declined',
    responded_at = now()
  where id = p_challenge_id;

  insert into public.notifications (
    user_id,
    actor_id,
    type,
    message,
    metadata
  )
  values (
    v_challenge.challenger_id,
    v_challenge.challenged_id,
    'challenge_declined',
    'Your challenge was declined.',
    jsonb_build_object('challenge_id', p_challenge_id)
  );
end;
$$;

grant execute on function public.decline_challenge(uuid) to authenticated;

create or replace function public.submit_secret(
  p_game_id uuid,
  p_secret_number text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games%rowtype;
  v_secret_count integer;
  v_player_id uuid;
  v_opponent_id uuid;
begin
  v_player_id := auth.uid();

  select *
  into v_game
  from public.games
  where id = p_game_id
  for update;

  if not found then
    raise exception 'Game not found.';
  end if;

  if v_player_id not in (v_game.player_one_id, v_game.player_two_id) then
    raise exception 'You are not a player in this game.';
  end if;

  if v_game.status <> 'setup' then
    raise exception 'Secret numbers can only be submitted before the game starts.';
  end if;

  if public.is_valid_digit_code(
    p_secret_number,
    v_game.digit_length,
    v_game.allow_repeats
  ) = false then
    raise exception 'Invalid secret number.';
  end if;

  insert into public.game_secrets (
    game_id,
    player_id,
    secret_number
  )
  values (
    p_game_id,
    v_player_id,
    p_secret_number
  )
  on conflict (game_id, player_id)
  do update set
    secret_number = excluded.secret_number,
    created_at = now();

  select count(*)
  into v_secret_count
  from public.game_secrets
  where game_id = p_game_id;

  if v_secret_count = 2 then
    update public.games
    set
      status = 'active',
      started_at = coalesce(started_at, now()),
      current_turn_player_id = coalesce(current_turn_player_id, player_one_id)
    where id = p_game_id;

    if v_game.player_one_id = v_player_id then
      v_opponent_id := v_game.player_two_id;
    else
      v_opponent_id := v_game.player_one_id;
    end if;

    insert into public.notifications (
      user_id,
      actor_id,
      type,
      message,
      metadata
    )
    values (
      v_game.player_one_id,
      null,
      'your_turn',
      'The game has started.',
      jsonb_build_object('game_id', p_game_id)
    ),
    (
      v_game.player_two_id,
      null,
      'your_turn',
      'The game has started.',
      jsonb_build_object('game_id', p_game_id)
    );
  end if;
end;
$$;

grant execute on function public.submit_secret(uuid, text) to authenticated;

create or replace function public.make_guess(
  p_game_id uuid,
  p_guess text
)
returns public.guesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games%rowtype;
  v_player_id uuid;
  v_target_player_id uuid;
  v_secret text;
  v_correct_count integer;
  v_turn_number integer;
  v_guess_row public.guesses%rowtype;
begin
  v_player_id := auth.uid();

  select *
  into v_game
  from public.games
  where id = p_game_id
  for update;

  if not found then
    raise exception 'Game not found.';
  end if;

  if v_game.status <> 'active' then
    raise exception 'Game is not active.';
  end if;

  if v_game.current_turn_player_id <> v_player_id then
    raise exception 'It is not your turn.';
  end if;

  if v_player_id = v_game.player_one_id then
    v_target_player_id := v_game.player_two_id;
  elsif v_player_id = v_game.player_two_id then
    v_target_player_id := v_game.player_one_id;
  else
    raise exception 'You are not a player in this game.';
  end if;

  if public.is_valid_digit_code(
    p_guess,
    v_game.digit_length,
    v_game.allow_repeats
  ) = false then
    raise exception 'Invalid guess.';
  end if;

  select secret_number
  into v_secret
  from public.game_secrets
  where game_id = p_game_id
    and player_id = v_target_player_id;

  if not found then
    raise exception 'Opponent has not submitted a secret number.';
  end if;

  v_correct_count := public.count_matching_digits(
    v_secret,
    p_guess,
    v_game.allow_repeats
  );

  select coalesce(max(turn_number), 0) + 1
  into v_turn_number
  from public.guesses
  where game_id = p_game_id;

  insert into public.guesses (
    game_id,
    player_id,
    target_player_id,
    guess_value,
    correct_count,
    turn_number
  )
  values (
    p_game_id,
    v_player_id,
    v_target_player_id,
    p_guess,
    v_correct_count,
    v_turn_number
  )
  returning * into v_guess_row;

  if v_correct_count = v_game.digit_length then
    update public.games
    set
      status = 'completed',
      winner_id = v_player_id,
      completed_at = now(),
      current_turn_player_id = null
    where id = p_game_id;

    insert into public.notifications (
      user_id,
      actor_id,
      type,
      message,
      metadata
    )
    values
    (
      v_player_id,
      v_target_player_id,
      'game_completed',
      'You won the game.',
      jsonb_build_object('game_id', p_game_id)
    ),
    (
      v_target_player_id,
      v_player_id,
      'game_completed',
      'You lost the game.',
      jsonb_build_object('game_id', p_game_id)
    );
  else
    update public.games
    set current_turn_player_id = v_target_player_id
    where id = p_game_id;

    insert into public.notifications (
      user_id,
      actor_id,
      type,
      message,
      metadata
    )
    values (
      v_target_player_id,
      v_player_id,
      'your_turn',
      'It is your turn.',
      jsonb_build_object('game_id', p_game_id)
    );
  end if;

  return v_guess_row;
end;
$$;

grant execute on function public.make_guess(uuid, text) to authenticated;

create or replace function public.update_profile_stats_on_game_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed'
     and new.winner_id is not null then

    update public.profiles
    set wins = wins + 1
    where id = new.winner_id;

    update public.profiles
    set losses = losses + 1
    where id in (new.player_one_id, new.player_two_id)
      and id <> new.winner_id;
  end if;

  return new;
end;
$$;

drop trigger if exists update_stats_after_game_completed on public.games;

create trigger update_stats_after_game_completed
after update on public.games
for each row
execute function public.update_profile_stats_on_game_completed();

create or replace function public.get_head_to_head(
  p_other_player_id uuid
)
returns table (
  games_played bigint,
  my_wins bigint,
  opponent_wins bigint,
  my_win_rate numeric,
  last_game_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid;
begin
  v_me := auth.uid();

  return query
  select
    count(*) as games_played,
    count(*) filter (
      where winner_id = v_me
    ) as my_wins,
    count(*) filter (
      where winner_id = p_other_player_id
    ) as opponent_wins,
    coalesce(
      round(
        100.0 * count(*) filter (where winner_id = v_me)
        / nullif(count(*), 0),
        2
      ),
      0
    ) as my_win_rate,
    max(completed_at) as last_game_at
  from public.games
  where status = 'completed'
    and winner_id is not null
    and (
      player_one_id = v_me and player_two_id = p_other_player_id
      or
      player_one_id = p_other_player_id and player_two_id = v_me
    );
end;
$$;

grant execute on function public.get_head_to_head(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.challenges enable row level security;
alter table public.game_secrets enable row level security;
alter table public.guesses enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
on public.profiles
for select
using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Players can view their games" on public.games;
create policy "Players can view their games"
on public.games
for select
to authenticated
using (
  auth.uid() = player_one_id
  or auth.uid() = player_two_id
);

drop policy if exists "Players can view their challenges" on public.challenges;
create policy "Players can view their challenges"
on public.challenges
for select
to authenticated
using (
  auth.uid() = challenger_id
  or auth.uid() = challenged_id
);

drop policy if exists "Users can send challenges" on public.challenges;
create policy "Users can send challenges"
on public.challenges
for insert
to authenticated
with check (
  challenger_id = auth.uid()
  and challenged_id <> auth.uid()
);

drop policy if exists "Challenger can cancel pending challenge" on public.challenges;
create policy "Challenger can cancel pending challenge"
on public.challenges
for update
to authenticated
using (
  challenger_id = auth.uid()
  and status = 'pending'
)
with check (
  challenger_id = auth.uid()
  and status = 'cancelled'
);

drop policy if exists "Receiver can decline pending challenge" on public.challenges;
create policy "Receiver can decline pending challenge"
on public.challenges
for update
to authenticated
using (
  challenged_id = auth.uid()
  and status = 'pending'
)
with check (
  challenged_id = auth.uid()
  and status = 'declined'
);

drop policy if exists "Players can view allowed secrets" on public.game_secrets;
create policy "Players can view allowed secrets"
on public.game_secrets
for select
to authenticated
using (
  player_id = auth.uid()
  or exists (
    select 1
    from public.games g
    where g.id = game_id
      and g.status = 'completed'
      and auth.uid() in (g.player_one_id, g.player_two_id)
  )
);

drop policy if exists "Players can view game guesses" on public.guesses;
create policy "Players can view game guesses"
on public.guesses
for select
to authenticated
using (
  public.is_game_player(game_id, auth.uid())
);

drop policy if exists "Players can view game comments" on public.comments;
create policy "Players can view game comments"
on public.comments
for select
to authenticated
using (
  public.is_game_player(game_id, auth.uid())
);

drop policy if exists "Players can add comments" on public.comments;
create policy "Players can add comments"
on public.comments
for insert
to authenticated
with check (
  player_id = auth.uid()
  and public.is_game_player(game_id, auth.uid())
);

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
on public.notifications
for select
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects
for select
using (
  bucket_id = 'avatars'
);

drop policy if exists "Users can upload own avatar files" on storage.objects;
create policy "Users can upload own avatar files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own avatar files" on storage.objects;
create policy "Users can update own avatar files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own avatar files" on storage.objects;
create policy "Users can delete own avatar files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

do $$
begin
  alter publication supabase_realtime add table public.games;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.challenges;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.guesses;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
