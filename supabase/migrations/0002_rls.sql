-- Veda Learning — Row Level Security
--
-- Model:
--   * Published course content (courses/modules/chants/lessons/phrases/words/
--     syllables/lesson_audio/achievements/app_config) is readable by anyone
--     signed in (including anonymous "guest" sessions), never by the public
--     unauthenticated role.
--   * Only rows belonging to an admin_roles entry can write course content.
--   * A student's own rows (profile, calibrations, enrolments, favourites,
--     attempts, scores, earned achievements) are readable/writable only by
--     that student (auth.uid() = profile_id), with no exceptions for other
--     students — "no public profiles", "no social messaging" per the spec.

alter table profiles enable row level security;
alter table courses enable row level security;
alter table modules enable row level security;
alter table chants enable row level security;
alter table lessons enable row level security;
alter table phrases enable row level security;
alter table words enable row level security;
alter table syllables enable row level security;
alter table lesson_audio enable row level security;
alter table pitch_contours enable row level security;
alter table scale_calibrations enable row level security;
alter table enrolments enable row level security;
alter table favourite_lessons enable row level security;
alter table practice_attempts enable row level security;
alter table attempt_scores enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table admin_roles enable row level security;
alter table app_config enable row level security;

create or replace function is_admin(check_profile_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from admin_roles where profile_id = check_profile_id);
$$;

-- --- profiles -----------------------------------------------------------
create policy "profiles: read own" on profiles for select using (auth.uid() = id);
create policy "profiles: update own" on profiles for update using (auth.uid() = id);
create policy "profiles: insert own" on profiles for insert with check (auth.uid() = id);

-- --- published content: readable by any signed-in user (guest sessions included) ---
create policy "courses: read published" on courses for select using (published or is_admin(auth.uid()));
create policy "modules: read published" on modules for select using (published or is_admin(auth.uid()));
create policy "chants: read published" on chants for select using (published or is_admin(auth.uid()));
create policy "lessons: read published" on lessons for select using (published or is_admin(auth.uid()));
create policy "phrases: read via lesson" on phrases for select using (
  exists (
    select 1 from lessons l where l.id = phrases.lesson_id and (l.published or is_admin(auth.uid()))
  )
);
create policy "words: read via phrase" on words for select using (
  exists (
    select 1 from phrases p join lessons l on l.id = p.lesson_id
    where p.id = words.phrase_id and (l.published or is_admin(auth.uid()))
  )
);
create policy "syllables: read via word" on syllables for select using (
  exists (
    select 1 from words w join phrases p on p.id = w.phrase_id join lessons l on l.id = p.lesson_id
    where w.id = syllables.word_id and (l.published or is_admin(auth.uid()))
  )
);
create policy "lesson_audio: read via lesson" on lesson_audio for select using (
  exists (select 1 from lessons l where l.id = lesson_audio.lesson_id and (l.published or is_admin(auth.uid())))
);
create policy "pitch_contours: admin only" on pitch_contours for select using (is_admin(auth.uid()));
create policy "achievements: read all" on achievements for select using (true);
create policy "app_config: read all" on app_config for select using (true);

-- --- admin write access on content tables --------------------------------
create policy "courses: admin write" on courses for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "modules: admin write" on modules for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "chants: admin write" on chants for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "lessons: admin write" on lessons for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "phrases: admin write" on phrases for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "words: admin write" on words for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "syllables: admin write" on syllables for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "lesson_audio: admin write" on lesson_audio for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "pitch_contours: admin write" on pitch_contours for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "app_config: admin write" on app_config for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin_roles: admin read" on admin_roles for select using (is_admin(auth.uid()) or auth.uid() = profile_id);
create policy "admin_roles: admin write" on admin_roles for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- --- a student's own data -------------------------------------------------
create policy "calibrations: own" on scale_calibrations for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "enrolments: own" on enrolments for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "favourites: own" on favourite_lessons for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "attempts: own" on practice_attempts for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "scores: own via attempt" on attempt_scores for all using (
  exists (select 1 from practice_attempts a where a.id = attempt_scores.attempt_id and a.profile_id = auth.uid())
) with check (
  exists (select 1 from practice_attempts a where a.id = attempt_scores.attempt_id and a.profile_id = auth.uid())
);
create policy "user_achievements: own" on user_achievements for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
