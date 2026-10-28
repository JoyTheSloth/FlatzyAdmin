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


