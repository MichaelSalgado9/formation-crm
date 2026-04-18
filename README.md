# Formation CRM

Internal CRM for tracking client progress through Trust and Company formation workflows.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18 + Vite                     |
| Routing    | React Router v6                     |
| Database   | Supabase (PostgreSQL)               |
| Auth       | Supabase Auth (email + password)    |
| Realtime   | Supabase Realtime (auto-refresh)    |
| Styling    | Plain CSS (no framework)            |
| Dates      | date-fns                            |

---

## Project Structure

```
src/
├── lib/
│   └── supabase.js          # Supabase client, STAGES, colour constants
├── hooks/
│   └── useClients.js        # All data access — hooks + async helpers
├── components/
│   ├── Layout.jsx           # Sidebar + nav shell
│   ├── UI.jsx               # Shared: Badge, Avatar, Modal, Spinner…
│   └── NewClientModal.jsx   # New client form
├── pages/
│   ├── Pipeline.jsx         # Kanban board view
│   ├── Clients.jsx          # Table list view
│   ├── ClientDetail.jsx     # Full client record (tabs)
│   ├── Tasks.jsx            # Cross-client task list
│   ├── Reports.jsx          # Pipeline & doc stats
│   └── Login.jsx            # Auth page
├── App.jsx                  # Router + auth guard
├── main.jsx                 # Entry point
└── index.css                # Global styles + design tokens

supabase/
└── schema.sql               # Full DB schema — run once in Supabase SQL editor
```

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon public key** from:  
   `Project Settings → API`

### 2. Run the database schema

1. In your Supabase dashboard, open **SQL Editor**.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
3. This creates all tables, enums, indexes, triggers, RLS policies, and seeds the document template checklist.

### 3. Create your first team member (admin user)

1. In Supabase: **Authentication → Users → Invite user** (or Add user).
2. After the user confirms their email, run this in the SQL editor to create their team profile:

```sql
insert into team_members (id, full_name, email, role)
values (
  '<paste-user-uuid-from-auth-users>',
  'Your Name',
  'you@practice.co.za',
  'admin'
);
```

Repeat for each team member. The UUID is visible in **Authentication → Users**.

### 4. Clone and configure the app

```bash
git clone <your-repo>
cd trust-company-crm

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and fill in your Supabase URL and anon key
```

### 5. Run locally

```bash
npm run dev
# → http://localhost:5173
```

### 6. Deploy (recommended: Vercel)

```bash
npm install -g vercel
vercel

# Set environment variables in Vercel dashboard:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

Or use Netlify, Cloudflare Pages — any static host works since it's a pure frontend app.

---

## Features

### Pipeline (Kanban board)
- 5-stage kanban: Lead → Document Collection → Entity Formation → Compliance/FICA → Ongoing Management
- Filter by type (Trust / Company / Both), priority, and assigned advisor
- Move clients between stages with one click directly on the card
- Document completion progress bar per card
- Realtime updates — changes made by teammates appear instantly

### Client record
- **Overview tab** — contact details + stage history timeline
- **Documents tab** — auto-generated checklist per entity type; update status (Pending → Received → Verified → Rejected)
- **Notes tab** — timestamped notes with author tracking
- **Tasks tab** — per-client tasks with due dates and priority

### Tasks
- Cross-client task list with overdue highlighting
- Filter by open / done / all
- One-click complete/reopen

### Reports
- Pipeline stage breakdown (bar chart)
- Split by entity type and priority
- Document compliance rate
- Open + overdue task counts

---

## Database highlights

### Automatic document checklists
When a new client is created, a `BEFORE INSERT` trigger reads `document_templates` for that entity type and automatically creates a `documents` row for every required document. No manual setup needed.

### Stage history with time tracking
An `AFTER UPDATE` trigger on `clients` automatically:
- Closes the previous `stage_history` record (sets `exited_at`)
- Opens a new record for the new stage
- Writes an entry to `activity_log`

This gives you a full audit trail and time-in-stage reporting.

### Row Level Security
All tables have RLS enabled. The default policies allow any authenticated user (your team) full read/write access. To restrict by role (e.g. advisors can only see their own clients), update the policies in `schema.sql`:

```sql
-- Example: advisors see only their assigned clients
drop policy "team_all_clients" on clients;
create policy "assigned_clients" on clients
  for all using (
    assigned_to = auth.uid()
    or exists (select 1 from team_members where id = auth.uid() and role = 'admin')
  );
```

---

## Extending the app

### Adding email notifications
Use **Supabase Edge Functions** + a transactional email service (Resend, SendGrid):

```
supabase/functions/
└── notify-stage-change/
    └── index.ts   # triggered by DB webhook on stage_history insert
```

### File uploads for documents
Supabase Storage is already configured. To wire it up:
1. Create a bucket called `documents` in Supabase Storage.
2. In `DocumentsTab`, add a file input that calls `supabase.storage.from('documents').upload(...)`.
3. Store the returned path in `documents.file_url`.

### Adding clients via a web form
Create a public intake form (separate app or a simple HTML page) that calls the Supabase API with the service role key on a backend, or use Supabase's built-in form handling.

---

## Environment Variables

| Variable                  | Description                              |
|---------------------------|------------------------------------------|
| `VITE_SUPABASE_URL`       | Your Supabase project URL                |
| `VITE_SUPABASE_ANON_KEY`  | Your Supabase anon/public key            |

---

## License

Private — internal use only.
