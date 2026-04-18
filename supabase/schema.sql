-- ============================================================
-- Trust & Company Formation CRM — Supabase Schema
-- ============================================================
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type entity_type as enum ('Trust', 'Company', 'Both');
create type priority_level as enum ('High', 'Medium', 'Low');
create type stage_name as enum (
  'Lead / Inquiry',
  'Document Collection',
  'Entity Formation',
  'Compliance / FICA',
  'Ongoing Management'
);
create type doc_status as enum ('Pending', 'Received', 'Verified', 'Rejected');
create type task_status as enum ('Open', 'In Progress', 'Done', 'Cancelled');

-- ============================================================
-- TEAM MEMBERS (extends Supabase auth.users)
-- ============================================================

create table team_members (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  email        text not null unique,
  avatar_url   text,
  role         text default 'advisor',          -- advisor | admin | compliance
  created_at   timestamptz default now()
);

-- ============================================================
-- CLIENTS
-- ============================================================

create table clients (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  email           text,
  phone           text,
  id_number       text,                          -- SA ID / passport
  entity_type     entity_type not null,
  priority        priority_level default 'Medium',
  stage           stage_name default 'Lead / Inquiry',
  assigned_to     uuid references team_members(id) on delete set null,
  source          text,                          -- Referral | Website | Cold call | etc.
  notes           text,
  is_archived     boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- STAGE HISTORY (time tracking per stage)
-- ============================================================

create table stage_history (
  id            uuid primary key default uuid_generate_v4(),
  client_id     uuid not null references clients(id) on delete cascade,
  stage         stage_name not null,
  entered_at    timestamptz default now(),
  exited_at     timestamptz,                     -- null = current stage
  moved_by      uuid references team_members(id) on delete set null,
  notes         text
);

-- ============================================================
-- DOCUMENTS
-- ============================================================

create table documents (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references clients(id) on delete cascade,
  doc_type        text not null,                 -- 'SA ID', 'Proof of Address', etc.
  required_for    entity_type,                   -- which entity type this doc applies to
  status          doc_status default 'Pending',
  file_url        text,                          -- Supabase Storage path
  uploaded_at     timestamptz,
  verified_by     uuid references team_members(id) on delete set null,
  verified_at     timestamptz,
  rejection_reason text,
  created_at      timestamptz default now()
);

-- ============================================================
-- DOCUMENT TEMPLATES (standard checklist per entity type)
-- ============================================================

create table document_templates (
  id            uuid primary key default uuid_generate_v4(),
  entity_type   entity_type not null,
  doc_type      text not null,
  description   text,
  is_mandatory  boolean default true,
  sort_order    int default 0
);

-- Seed standard document templates
insert into document_templates (entity_type, doc_type, description, is_mandatory, sort_order) values
  -- Trust documents
  ('Trust', 'SA ID / Passport (Founder)',        'Certified copy of ID for trust founder/settlor', true, 1),
  ('Trust', 'SA ID / Passport (Trustees)',        'Certified copies for all trustees', true, 2),
  ('Trust', 'Proof of Address (Trustees)',        'Not older than 3 months', true, 3),
  ('Trust', 'Trust Deed (Draft)',                 'Draft trust deed for review', true, 4),
  ('Trust', 'Letter of Authority',               'Issued by Master of High Court', true, 5),
  ('Trust', 'Beneficiary Details',               'Full names and ID numbers of all beneficiaries', true, 6),
  -- Company documents
  ('Company', 'SA ID / Passport (Directors)',    'Certified copies for all directors', true, 1),
  ('Company', 'Proof of Address (Directors)',    'Not older than 3 months', true, 2),
  ('Company', 'Company Name Reservation',        'CIPC name reservation certificate', true, 3),
  ('Company', 'MOI / Constitution',              'Memorandum of Incorporation', true, 4),
  ('Company', 'CIPC Registration Certificate',  'CoR14.3 from CIPC', true, 5),
  ('Company', 'Shareholder Register',            'Initial shareholder register', false, 6),
  -- Both
  ('Both', 'Tax Clearance Certificate',          'From SARS — current year', false, 7),
  ('Both', 'FICA Source of Funds Declaration',   'Signed client declaration', true, 8);

-- ============================================================
-- NOTES
-- ============================================================

create table notes (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references clients(id) on delete cascade,
  content     text not null,
  author_id   uuid references team_members(id) on delete set null,
  is_pinned   boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- TASKS
-- ============================================================

create table tasks (
  id            uuid primary key default uuid_generate_v4(),
  client_id     uuid references clients(id) on delete cascade,  -- null = general task
  title         text not null,
  description   text,
  status        task_status default 'Open',
  priority      priority_level default 'Medium',
  assigned_to   uuid references team_members(id) on delete set null,
  due_date      date,
  completed_at  timestamptz,
  created_by    uuid references team_members(id) on delete set null,
  created_at    timestamptz default now()
);

-- ============================================================
-- ACTIVITY LOG (immutable audit trail)
-- ============================================================

create table activity_log (
  id            uuid primary key default uuid_generate_v4(),
  client_id     uuid references clients(id) on delete cascade,
  actor_id      uuid references team_members(id) on delete set null,
  action        text not null,                   -- 'stage_changed' | 'doc_uploaded' | 'note_added' | etc.
  metadata      jsonb,                           -- flexible payload per action type
  created_at    timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_clients_stage         on clients(stage);
create index idx_clients_assigned_to   on clients(assigned_to);
create index idx_clients_entity_type   on clients(entity_type);
create index idx_clients_priority      on clients(priority);
create index idx_documents_client      on documents(client_id);
create index idx_stage_history_client  on stage_history(client_id);
create index idx_tasks_client          on tasks(client_id);
create index idx_tasks_assigned        on tasks(assigned_to);
create index idx_activity_client       on activity_log(client_id);
create index idx_activity_created      on activity_log(created_at desc);

-- ============================================================
-- TRIGGERS — auto-update updated_at
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_clients_updated
  before update on clients
  for each row execute function update_updated_at();

create trigger trg_notes_updated
  before update on notes
  for each row execute function update_updated_at();

-- ============================================================
-- TRIGGER — auto-insert stage history on stage change
-- ============================================================

create or replace function log_stage_change()
returns trigger as $$
begin
  if old.stage is distinct from new.stage then
    -- close the previous stage
    update stage_history
      set exited_at = now()
      where client_id = new.id and exited_at is null;
    -- open the new stage
    insert into stage_history (client_id, stage)
      values (new.id, new.stage);
    -- write to activity log
    insert into activity_log (client_id, action, metadata)
      values (new.id, 'stage_changed', jsonb_build_object(
        'from', old.stage,
        'to',   new.stage
      ));
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_stage_change
  after update on clients
  for each row execute function log_stage_change();

-- ============================================================
-- TRIGGER — auto-create document checklist on new client
-- ============================================================

create or replace function create_document_checklist()
returns trigger as $$
begin
  insert into documents (client_id, doc_type, required_for)
  select new.id, dt.doc_type, dt.entity_type
  from document_templates dt
  where dt.entity_type = new.entity_type
     or (new.entity_type = 'Both');
  return new;
end;
$$ language plpgsql;

create trigger trg_new_client_docs
  after insert on clients
  for each row execute function create_document_checklist();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table clients         enable row level security;
alter table documents       enable row level security;
alter table notes           enable row level security;
alter table tasks           enable row level security;
alter table activity_log    enable row level security;
alter table stage_history   enable row level security;
alter table team_members    enable row level security;

-- Allow authenticated users (your team) to read/write everything
-- Adjust these policies to match your access control needs

create policy "team_all_clients"      on clients         for all using (auth.role() = 'authenticated');
create policy "team_all_documents"    on documents       for all using (auth.role() = 'authenticated');
create policy "team_all_notes"        on notes           for all using (auth.role() = 'authenticated');
create policy "team_all_tasks"        on tasks           for all using (auth.role() = 'authenticated');
create policy "team_all_activity"     on activity_log    for all using (auth.role() = 'authenticated');
create policy "team_all_stage_hist"   on stage_history   for all using (auth.role() = 'authenticated');
create policy "team_read_members"     on team_members    for select using (auth.role() = 'authenticated');
create policy "team_update_self"      on team_members    for update using (auth.uid() = id);

-- ============================================================
-- SEED: Sample clients for development
-- ============================================================
-- Uncomment below to load sample data

/*
insert into clients (name, email, phone, entity_type, priority, stage, notes) values
  ('Priya Naidoo',         'priya@naidoo.co.za',      '071 234 5678', 'Trust',   'High',   'Lead / Inquiry',       'Family discretionary trust. Awaiting signed mandate.'),
  ('Van der Berg Family',  'info@vdb.co.za',           '082 345 6789', 'Both',    'High',   'Lead / Inquiry',       'Trust + holding company structure. High-value client.'),
  ('Sipho Dlamini',        'sipho@dlamini.biz',        '083 456 7890', 'Company', 'Medium', 'Document Collection',  'Pty Ltd for property portfolio.'),
  ('Kobus Visser',         'kobus@visser.com',         '082 678 9012', 'Company', 'High',   'Entity Formation',     'CIPC registration in progress.'),
  ('Steyn Family Trust',   'psteyn@gmail.com',         '083 890 1234', 'Trust',   'High',   'Compliance / FICA',    'FICA outstanding: proof of address for all trustees.'),
  ('Marcus & Sons Holdings','info@marcusholdings.com', '021 012 3456', 'Both',    'Low',    'Ongoing Management',   'Active. Annual review due Q3.');
*/
