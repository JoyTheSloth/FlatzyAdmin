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
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Enable Row Level Security (RLS) but allow anonymous read/write for your app
alter table inquiries enable row level security;

-- Policy: Allow all operations (select, insert, update, delete) with anon key
create policy "Allow all public operations on inquiries"
  on inquiries
  for all
  using (true)
  with check (true);

-- 3. Enable Realtime Replication so all devices update live
alter publication supabase_realtime add table inquiries;

