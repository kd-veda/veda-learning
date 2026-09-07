-- Veda Learning — seed data
--
-- Mirrors src/content/ganapati-prarthana/index.ts. This is PLACEHOLDER
-- demonstration content (see that file's header comment) — replace via the
-- admin chant editor once teacher-approved text/audio is available.
--
-- Run after 0001_schema.sql / 0002_rls.sql / 0003_storage.sql, e.g.:
--   supabase db execute -f supabase/seed.sql
-- (uses fixed ids so it can be re-run safely with `on conflict do update`.)

insert into courses (id, slug, title, description, published)
values (
  '00000000-0000-0000-0000-000000000001',
  'first-steps',
  'First Steps in Chanting',
  'A gentle introduction course, beginning with the demonstration lesson Gaṇapati Prārthanā.',
  true
)
on conflict (id) do update set title = excluded.title, description = excluded.description;

insert into modules (id, course_id, title, description, order_index, published)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Invocations',
  'Opening invocations chanted before study begins.',
  1,
  true
)
on conflict (id) do update set title = excluded.title;

insert into chants (id, module_id, title, subtitle, english_meaning, devanagari, iast, is_placeholder_content, order_index, published)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'Gaṇapati Prārthanā',
  'Placeholder demonstration content — awaiting teacher-approved text and recordings',
  'PLACEHOLDER TRANSLATION — replace with the teacher-approved English meaning once supplied.',
  '( देवनागरी पाठ अभी लंबित है — प्लेसहोल्डर )',
  '( PLACEHOLDER IAST TEXT — teacher-approved wording pending )',
  true,
  1,
  true
)
on conflict (id) do update set title = excluded.title;

insert into lessons (id, chant_id, kind, title, order_index, published)
values (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000003',
  'full_chant',
  'Full Chanting (demo)',
  1,
  true
)
on conflict (id) do update set title = excluded.title;

insert into phrases (id, lesson_id, order_index, is_repeatable_independently, start_time_sec, end_time_sec)
values (
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000004',
  1, true, 0, 4.5
)
on conflict (id) do update set start_time_sec = excluded.start_time_sec;

insert into words (id, phrase_id, order_index, display_text, iast, devanagari, translation)
values
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', 1, 'Oṃ', 'oṃ', 'ॐ', 'the primordial sound'),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000005', 2, 'Gaṃ Gaṇapataye', 'gaṃ gaṇapataye', 'गं गणपतये', 'PLACEHOLDER — salutation to Gaṇapati (seed bīja + name)')
on conflict (id) do update set display_text = excluded.display_text;

insert into syllables (
  id, word_id, order_index, display_text, iast, devanagari, transliteration,
  start_time_sec, end_time_sec, svara_category, target_pitch_level, target_pitch_contour_cents,
  teacher_note, pronunciation_note, translation, is_repeatable_independently
) values
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000006', 1, 'Oṃ', 'oṃ', 'ॐ', 'om',
   0.2, 2.0, 'udatta', 1, '{0,5,0,-5,0}',
   'PLACEHOLDER — hold steady, medium pitch.', 'Nasal resonance through to the end of the syllable.', 'the primordial sound', true),
  ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000007', 1, 'Gaṃ', 'gaṃ', 'गं', 'gam',
   2.3, 2.9, 'anudatta', -1, '{-80,-90,-100}',
   'PLACEHOLDER — lower, brief bīja syllable.', 'Short, closed nasal ending.', 'seed sound', true),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000007', 2, 'Ga-ṇa-pa-ta-ye', 'gaṇapataye', 'गणपतये', 'ganapataye',
   3.0, 4.4, 'svarita', 2, '{0,60,120,100,80}',
   'PLACEHOLDER — rising svarita across the word, settling at the end.', 'Even syllable timing; light stress on -pa-.',
   'PLACEHOLDER — ''to the Lord of hosts'' (dative)', true)
on conflict (id) do update set display_text = excluded.display_text;

-- Reference audio: upload the generated placeholder tones (scripts/generate-test-tones.mjs,
-- output in public/audio/ganapati-prarthana/) to the `lesson-audio` storage bucket and
-- update audio_url below to the resulting Storage URL before running this insert.
insert into lesson_audio (id, lesson_id, scale, audio_url, duration_sec, is_placeholder)
values
  ('0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000004', 'B', 'REPLACE_WITH_STORAGE_URL/placeholder-scale-b.wav', 4.5, true),
  ('0000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000004', 'D', 'REPLACE_WITH_STORAGE_URL/placeholder-scale-d.wav', 4.5, true),
  ('0000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000004', 'F', 'REPLACE_WITH_STORAGE_URL/placeholder-scale-f.wav', 4.5, true)
on conflict (lesson_id, scale) do update set audio_url = excluded.audio_url;

insert into achievements (id, key, title, description, icon) values
  ('00000000-0000-0000-0000-00000000000e', 'first_attempt', 'First Steps', 'Completed your first practice attempt.', '🌱'),
  ('00000000-0000-0000-0000-00000000000f', 'streak_3', 'Three Days Together', 'Practised three days in a row.', '🔥'),
  ('00000000-0000-0000-0000-000000000010', 'green_phrase', 'Steady Voice', 'Scored ''green'' intonation on a full phrase.', '🟢')
on conflict (key) do nothing;

insert into app_config (id, scale_mapping, pitch_tolerance, min_confidence)
values (
  'singleton',
  '{"A":"B","A#":"B","B":"B","C":"B","C#":"D","D":"D","D#":"D","E":"F","F":"F","F#":"F","G":"F","G#":"F"}',
  '{"greenCents":25,"amberCents":50,"octaveToleranceEnabled":true}',
  0.5
)
on conflict (id) do update set scale_mapping = excluded.scale_mapping;

-- To make an existing authenticated user a teacher/administrator once you have a real account:
--   insert into admin_roles (profile_id, role) values ('<your-auth-user-uuid>', 'administrator');
