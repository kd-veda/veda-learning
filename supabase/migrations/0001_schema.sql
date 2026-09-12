-- Veda Learning — initial schema
-- Mirrors src/lib/data/types.ts. Run in order with 0002_rls.sql.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users, including anonymous/guest users)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Guest',
  is_guest boolean not null default true,
  preferred_display_mode text not null default 'iast'
    check (preferred_display_mode in ('iast', 'devanagari', 'simplified')),
  text_size_scale numeric not null default 1,
  show_meaning boolean not null default true,
  dark_mode boolean not null default false,
  save_recordings_consent boolean not null default false,
  guardian_consent_on_file boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Course hierarchy
-- ---------------------------------------------------------------------------
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  cover_image_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  title text not null,
  description text not null default '',
  order_index integer not null default 1,
  published boolean not null default false
);

create table if not exists chants (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules (id) on delete cascade,
  title text not null,
  subtitle text,
  english_meaning text not null default '',
  devanagari text,
  iast text not null default '',
  is_placeholder_content boolean not null default true,
  order_index integer not null default 1,
  published boolean not null default false
);

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  chant_id uuid not null references chants (id) on delete cascade,
  kind text not null check (
    kind in ('introduction', 'pronunciation', 'svara_practice', 'line_by_line', 'full_chant', 'assessment')
  ),
  title text not null,
  order_index integer not null default 1,
  published boolean not null default false
);

create table if not exists phrases (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  order_index integer not null default 1,
  is_repeatable_independently boolean not null default true,
  start_time_sec numeric not null default 0,
  end_time_sec numeric not null default 0
);

create table if not exists words (
  id uuid primary key default gen_random_uuid(),
  phrase_id uuid not null references phrases (id) on delete cascade,
  order_index integer not null default 1,
  display_text text not null,
  iast text not null default '',
  devanagari text,
  translation text
);

create table if not exists syllables (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references words (id) on delete cascade,
  order_index integer not null default 1,
  display_text text not null,
  iast text not null default '',
  devanagari text,
  transliteration text not null default '',
  start_time_sec numeric not null default 0,
  end_time_sec numeric not null default 0,
  svara_category text not null default 'udatta'
    check (svara_category in ('udatta', 'anudatta', 'svarita', 'dirgha_svarita')),
  target_pitch_level numeric not null default 0,
  target_pitch_contour_cents numeric[] not null default '{}',
  teacher_note text,
  pronunciation_note text,
  translation text,
  is_repeatable_independently boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Reference audio + extracted pitch contours
-- ---------------------------------------------------------------------------
create table if not exists lesson_audio (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  scale text not null check (scale in ('B', 'D', 'F', 'G#')),
  audio_url text not null,
  duration_sec numeric not null default 0,
  is_placeholder boolean not null default true,
  uploaded_at timestamptz not null default now(),
  unique (lesson_id, scale)
);

create table if not exists pitch_contours (
  id uuid primary key default gen_random_uuid(),
  lesson_audio_id uuid not null references lesson_audio (id) on delete cascade,
  points jsonb not null default '[]',
  is_manually_corrected boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Calibration, enrolment, favourites
-- ---------------------------------------------------------------------------
create table if not exists scale_calibrations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  detected_frequency_hz numeric not null,
  detected_pitch_class text not null,
  recommended_scale text not null check (recommended_scale in ('B', 'D', 'F', 'G#')),
  selected_scale text not null check (selected_scale in ('B', 'D', 'F', 'G#')),
  is_manual_override boolean not null default false,
  confidence numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists enrolments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (profile_id, course_id)
);

create table if not exists favourite_lessons (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  lesson_id uuid not null references lessons (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, lesson_id)
);

-- ---------------------------------------------------------------------------
-- Practice attempts + scores
-- ---------------------------------------------------------------------------
create table if not exists practice_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  lesson_id uuid not null references lessons (id) on delete cascade,
  phrase_id uuid references phrases (id) on delete set null,
  mode text not null check (
    mode in ('listen', 'listen_and_repeat', 'chant_along', 'independent_practice', 'slow_practice')
  ),
  playback_rate numeric not null default 1,
  scale text not null check (scale in ('B', 'D', 'F', 'G#')),
  -- Only populated if the student explicitly consented to save this recording (see profiles.save_recordings_consent).
  recording_url text,
  student_pitch_contour jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists attempt_scores (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references practice_attempts (id) on delete cascade,
  intonation_accuracy numeric not null,
  timing_accuracy numeric not null,
  phrase_completion numeric not null,
  pronunciation_similarity numeric,
  overall numeric not null,
  alignment_confidence numeric not null default 0,
  syllable_feedback jsonb not null default '[]',
  encouraging_message text not null default ''
);

-- ---------------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------------
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text not null default '',
  icon text not null default '🌟'
);

create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  achievement_id uuid not null references achievements (id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (profile_id, achievement_id)
);

-- ---------------------------------------------------------------------------
-- Admin + platform configuration
-- ---------------------------------------------------------------------------
create table if not exists admin_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  role text not null check (role in ('teacher', 'administrator')),
  granted_at timestamptz not null default now(),
  unique (profile_id)
);

-- Single-row configuration table: note->scale mapping + pitch tolerance,
-- editable from the admin Configuration page (see src/lib/config/appConfig.ts).
create table if not exists app_config (
  id text primary key default 'singleton',
  scale_mapping jsonb not null,
  pitch_tolerance jsonb not null,
  min_confidence numeric not null default 0.5
);

create index if not exists idx_modules_course on modules (course_id);
create index if not exists idx_chants_module on chants (module_id);
create index if not exists idx_lessons_chant on lessons (chant_id);
create index if not exists idx_phrases_lesson on phrases (lesson_id);
create index if not exists idx_words_phrase on words (phrase_id);
create index if not exists idx_syllables_word on syllables (word_id);
create index if not exists idx_attempts_profile on practice_attempts (profile_id, lesson_id);
create index if not exists idx_calibrations_profile on scale_calibrations (profile_id, created_at desc);
