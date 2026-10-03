create extension if not exists pgcrypto;

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  image_url text not null,
  title text,
  caption text,
  uploaded_by text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.gallery enable row level security;

alter table public.gallery
  add column if not exists storage_path text,
  add column if not exists caption text,
  add column if not exists uploaded_by text,
  add column if not exists display_order integer default 0;

alter table public.gallery
  add column if not exists image_path text,
  add column if not exists image_url text,
  add column if not exists description text;

drop policy if exists "Public can view gallery images" on public.gallery;
create policy "Public can view gallery images"
on public.gallery for select using (true);

drop policy if exists "Authenticated can manage gallery" on public.gallery;
create policy "Authenticated can manage gallery"
on public.gallery for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Public can view gallery storage" on storage.objects;
create policy "Public can view gallery storage"
on storage.objects for select using (bucket_id = 'gallery');

drop policy if exists "Authenticated can upload gallery files" on storage.objects;
create policy "Authenticated can upload gallery files"
on storage.objects for insert with check (bucket_id = 'gallery' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete gallery files" on storage.objects;
create policy "Authenticated can delete gallery files"
on storage.objects for delete using (bucket_id = 'gallery' and auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;
