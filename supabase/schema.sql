create extension if not exists pgcrypto;

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  donor_name text not null,
  mobile_number text,
  whatsapp_number text,
  donation_amount numeric not null,
  receipt_date date not null default current_date,
  festival_name text default 'Ganesh Festival',
  status text default 'Received',
  created_by_name text,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.receipts
  add column if not exists festival_name text default 'Ganesh Festival';

alter table public.receipts
  add column if not exists status text default 'Received';

alter table public.receipts
  add column if not exists payment_status text default 'Received';

alter table public.receipts
  add column if not exists payment_method text default 'Cash';

alter table public.receipts
  add column if not exists donation_date date;

alter table public.receipts
  add column if not exists event_name text default 'Ganesh Festival';

alter table public.receipts
  add column if not exists created_by_name text;

alter table public.receipts
  add column if not exists created_by_email text;

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile_number text,
  email text,
  role text not null default 'Admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.income (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'Donation',
  amount numeric not null,
  description text,
  income_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_name text not null,
  amount numeric not null,
  description text,
  expense_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile_number text,
  booking_date date not null default current_date,
  description text,
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  image_url text not null,
  title text,
  description text,
  uploaded_by text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger receipts_set_updated_at
before update on public.receipts
for each row execute function public.set_updated_at();

create trigger admins_set_updated_at
before update on public.admins
for each row execute function public.set_updated_at();

create trigger income_set_updated_at
before update on public.income
for each row execute function public.set_updated_at();

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

alter table public.receipts enable row level security;
alter table public.admins enable row level security;
alter table public.income enable row level security;
alter table public.expenses enable row level security;
alter table public.bookings enable row level security;
alter table public.gallery enable row level security;

create policy "Public can view gallery images"
on public.gallery for select using (true);

create policy "Authenticated can manage receipts"
on public.receipts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated can manage admins"
on public.admins for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated can manage income"
on public.income for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated can manage expenses"
on public.expenses for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated can manage bookings"
on public.bookings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated can manage gallery"
on public.gallery for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Public can view gallery storage"
on storage.objects for select using (bucket_id = 'gallery');

create policy "Authenticated can upload gallery files"
on storage.objects for insert with check (bucket_id = 'gallery' and auth.role() = 'authenticated');

create policy "Authenticated can delete gallery files"
on storage.objects for delete using (bucket_id = 'gallery' and auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;
