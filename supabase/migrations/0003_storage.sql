-- Storage buckets: lesson reference audio (readable by any signed-in user,
-- writable by admins only) and student recordings (private, opt-in only —
-- see profiles.save_recordings_consent and docs/LIMITATIONS.md).

insert into storage.buckets (id, name, public)
values ('lesson-audio', 'lesson-audio', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('student-recordings', 'student-recordings', false)
on conflict (id) do nothing;

create policy "lesson-audio: read if signed in"
on storage.objects for select
using (bucket_id = 'lesson-audio' and auth.role() = 'authenticated');

create policy "lesson-audio: admin write"
on storage.objects for all
using (bucket_id = 'lesson-audio' and is_admin(auth.uid()))
with check (bucket_id = 'lesson-audio' and is_admin(auth.uid()));

-- Student recordings are stored under a path prefixed with the owning
-- profile's id (student-recordings/<profile_id>/...), enforced here.
create policy "student-recordings: own read"
on storage.objects for select
using (bucket_id = 'student-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "student-recordings: own write"
on storage.objects for insert
with check (bucket_id = 'student-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "student-recordings: own delete"
on storage.objects for delete
using (bucket_id = 'student-recordings' and (storage.foldername(name))[1] = auth.uid()::text);
