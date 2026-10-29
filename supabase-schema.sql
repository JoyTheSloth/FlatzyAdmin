-- ==============================================================================
-- FLATZY ADMIN PORTAL: SUPABASE DATABASE INITIALIZATION SCRIPT
-- Run this script in the Supabase Dashboard -> SQL Editor -> Click 'Run'
-- ==============================================================================

-- 1. Create the inquiries table
create table if not exists inquiries (
  id text primary key,
  name text not null,
  phone text not null,
  bhk text default '2 BHK',
  property text default 'Flat',
  location text default 'New Town',
  furnishing text default 'Semi-Furnished',
  budget text default '₹15,000 – ₹20,000',
  shifting_date text default 'Immediate',
  tenant_type text default 'Bachelor',
  status text default 'Active Lead', -- 'Active Lead', 'Hot Lead', 'Booked'
  is_hot boolean default false,
  is_closed boolean default false,
  last_follow_up text default 'Just now',
  assigned_broker_id text,
  assigned_broker_name text,
  assigned_broker_phone text,
  assigned_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Alter existing inquiries table in case it was already created without broker columns
alter table inquiries add column if not exists assigned_broker_id text;
alter table inquiries add column if not exists assigned_broker_name text;
alter table inquiries add column if not exists assigned_broker_phone text;
alter table inquiries add column if not exists assigned_at timestamp with time zone;

-- Enable RLS for inquiries
alter table inquiries enable row level security;
create policy "Allow all public operations on inquiries"
  on inquiries
  for all
  using (true)
  with check (true);

-- Enable Realtime Replication for inquiries
alter publication supabase_realtime add table inquiries;


-- 2. Create the properties / flats table (Syncs with Website Flats Section)
create table if not exists properties (
  id text primary key,
  broker_id text,
  broker_name text default 'Flatzy Partner',
  broker_phone text,
  title text not null,
  listing_type text default 'rent', -- 'rent' or 'sale'
  bhk text default '2 BHK',
  sqft integer default 1000,
  posting_date text,
  location text default 'New Town',
  sub_location text,
  price numeric not null,
  security_deposit numeric default 0,
  furnishing text default 'Semi Furnished',
  amenities text[] default '{}',
  status text default 'available', -- 'available', 'reserved', 'sold'
  is_verified boolean default true,
  images text[] default '{}',
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for properties
alter table properties enable row level security;
create policy "Allow all public operations on properties"
  on properties
  for all
  using (true)
  with check (true);

-- Enable Realtime Replication for properties
alter publication supabase_realtime add table properties;


-- 3. Create the roommates / flatmates table (Syncs Flatmates Section & Public Submissions)
create table if not exists roommates (
  id text primary key,
  name text not null,
  age integer default 24,
  gender text default 'Male',
  avatar_id text default 'avatar-tech-bro',
  profession text default 'Working Professional',
  occupation_title text default '',
  religion text default 'Open to All',
  looking_for_bhk text default '2 BHK',
  listing_type text default 'Room in Flat',
  budget_per_month numeric default 8000,
  preferred_locations text[] default '{"New Town"}',
  move_in_date text default 'Immediate',
  lifestyle_habits jsonb default '{"diet": "Vegetarian", "smoking": "Non-Smoker", "drinking": "Non-Drinker", "pets": "Pet Friendly", "sleepSchedule": "Flexible"}'::jsonb,
  about_me text default '',
  contact_whatsapp text not null default '919830000000',
  is_approved boolean default true,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure existing columns have safe defaults and non-blocking nullability
alter table roommates add column if not exists listing_type text default 'Room in Flat';
alter table roommates add column if not exists status text default 'active';
alter table roommates alter column age drop not null;
alter table roommates alter column age set default 24;
alter table roommates alter column gender set default 'Male';
alter table roommates alter column avatar_id drop not null;
alter table roommates alter column avatar_id set default 'avatar-tech-bro';
alter table roommates alter column profession drop not null;
alter table roommates alter column profession set default 'Working Professional';
alter table roommates alter column looking_for_bhk drop not null;
alter table roommates alter column looking_for_bhk set default '2 BHK';
alter table roommates alter column budget_per_month drop not null;
alter table roommates alter column budget_per_month set default 8000;
alter table roommates alter column move_in_date drop not null;
alter table roommates alter column move_in_date set default 'Immediate';

-- Enable RLS for roommates
alter table roommates enable row level security;
drop policy if exists "Allow all public operations on roommates" on roommates;
create policy "Allow all public operations on roommates"
  on roommates
  for all
  using (true)
  with check (true);

-- Enable Realtime Replication for roommates so multi-device/client sync works instantly
alter publication supabase_realtime add table roommates;



