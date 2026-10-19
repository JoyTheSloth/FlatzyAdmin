# FlatzyAdmin - Real Estate Operations & Leads Portal

A high-performance real estate inquiry and lead management portal tailored for Flatzy (Kolkata).

## Features
- **AI Auto-Fill (Groq & Mistral)**: Automatically parses unstructured WhatsApp messages and caller notes into structured lead profiles.
- **Supabase Cloud Live Realtime**: Multi-device live WebSocket synchronization for inquiries, booking statuses, and hot lead flags.
- **Offline Resilience**: Automatic fallback to local storage if cloud credentials are absent or network is disconnected.
- **Swipe Actions & One-Tap Undo**: Mobile gesture-driven card interactions with instant undo.
- **Locality & Shifting Filters**: Instant filtering tailored for Kolkata areas (Shapoorji, New Town, Salt Lake, etc.).

## Setup & Running Locally
```bash
npm install
npm run dev
```

## Environment Variables
Create a `.env` file from `.env.example`:
```env
VITE_GROQ_API_KEY=your-groq-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Database Initialization
Run the SQL queries in `supabase-schema.sql` inside your Supabase **SQL Editor**.
