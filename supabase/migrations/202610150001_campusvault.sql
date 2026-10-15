create extension if not exists pgcrypto;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(), name text not null unique, code text not null unique,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(), name text not null, code text, branch_id uuid references public.branches(id) on delete set null,
  semester smallint not null check (semester between 1 and 12), description text,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (name, branch_id, semester)
);
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(), submission_reference text not null unique,
  title text not null check (char_length(title) between 3 and 160), description text,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  semester smallint not null check (semester between 1 and 12),
  resource_type text not null check (resource_type in ('Notes','PYQs','Assignments','Lab Manuals','Presentations','Reference Materials','Other')),
  academic_year text, contributor_name text,
  storage_path text not null unique, original_file_name text not null,
  file_size bigint not null check (file_size > 0), mime_type text not null check (mime_type = 'application/pdf'),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected','removed')),
  rejection_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  approved_at timestamptz, approved_by text, download_count bigint not null default 0 check (download_count >= 0)
);
create table if not exists public.resource_reports (
  id uuid primary key default gen_random_uuid(), resource_id uuid not null references public.resources(id) on delete cascade,
  reason text not null check (reason in ('Inappropriate','Misleading','Duplicate','Corrupted or unusable','Copyright-infringing','Categorized incorrectly')),
  details text, status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(), resolved_at timestamptz, resolved_by text
);
create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(), resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), admin_identifier text not null,
  action text not null, resource_id uuid references public.resources(id) on delete set null,
  reason text, created_at timestamptz not null default now()
);

create index if not exists resources_public_created_idx on public.resources (created_at desc) where moderation_status = 'approved';
create index if not exists resources_public_downloads_idx on public.resources (download_count desc) where moderation_status = 'approved';
create index if not exists resources_branch_semester_idx on public.resources (branch_id, semester, created_at desc);
create index if not exists resources_subject_idx on public.resources (subject_id, created_at desc);
create index if not exists resources_type_idx on public.resources (resource_type, created_at desc);
create index if not exists resources_status_created_idx on public.resources (moderation_status, created_at);
create index if not exists resources_search_idx on public.resources using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(contributor_name,'')));
create index if not exists reports_status_idx on public.resource_reports (status, created_at);
create index if not exists downloads_resource_time_idx on public.downloads (resource_id, created_at desc);

alter table public.branches enable row level security;
alter table public.subjects enable row level security;
alter table public.resources enable row level security;
alter table public.resource_reports enable row level security;
alter table public.downloads enable row level security;
alter table public.audit_logs enable row level security;
revoke all on public.branches, public.subjects, public.resources, public.resource_reports, public.downloads, public.audit_logs from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campus-resources', 'campus-resources', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];
drop policy if exists "no public access to campus resources" on storage.objects;

create or replace function public.increment_resource_download(resource_uuid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.resources set download_count = download_count + 1
  where id = resource_uuid and moderation_status = 'approved';
  if not found then raise exception 'Resource unavailable'; end if;
  insert into public.downloads(resource_id) values(resource_uuid);
end;
$$;
revoke all on function public.increment_resource_download(uuid) from public, anon, authenticated;
grant execute on function public.increment_resource_download(uuid) to service_role;

create or replace function public.search_approved_resources(
  query_text text default '', branch_filter uuid default null, subject_filter uuid default null,
  semester_filter smallint default null, type_filter text default null, year_filter text default null,
  sort_popular boolean default false, page_offset integer default 0, page_limit integer default 12
)
returns table (
  id uuid, title text, description text, resource_type text, academic_year text, contributor_name text,
  original_file_name text, file_size bigint, mime_type text, created_at timestamptz, download_count bigint,
  semester smallint, branch jsonb, subject jsonb, total_count bigint
) language sql stable security definer set search_path = public as $$
  with matches as (
    select r.*, b.name as branch_name, b.code as branch_code, s.name as subject_name,
      count(*) over() as matched_count
    from public.resources r
    join public.branches b on b.id = r.branch_id
    join public.subjects s on s.id = r.subject_id
    where r.moderation_status = 'approved'
      and (query_text = '' or to_tsvector('english', coalesce(r.title,'') || ' ' || coalesce(r.description,'') || ' ' || coalesce(r.contributor_name,'') || ' ' || s.name || ' ' || b.name || ' ' || r.resource_type || ' ' || coalesce(r.academic_year,'')) @@ plainto_tsquery('english', query_text))
      and (branch_filter is null or r.branch_id = branch_filter)
      and (subject_filter is null or r.subject_id = subject_filter)
      and (semester_filter is null or r.semester = semester_filter)
      and (type_filter is null or r.resource_type = type_filter)
      and (year_filter is null or r.academic_year = year_filter)
  )
  select m.id,m.title,m.description,m.resource_type,m.academic_year,m.contributor_name,m.original_file_name,m.file_size,m.mime_type,m.created_at,m.download_count,m.semester,
    jsonb_build_object('name',m.branch_name,'code',m.branch_code), jsonb_build_object('name',m.subject_name), m.matched_count
  from matches m
  order by case when sort_popular then m.download_count end desc, case when not sort_popular then m.created_at end desc
  offset greatest(page_offset,0) limit least(greatest(page_limit,1),50);
$$;
revoke all on function public.search_approved_resources(text,uuid,uuid,smallint,text,text,boolean,integer,integer) from public, anon, authenticated;
grant execute on function public.search_approved_resources(text,uuid,uuid,smallint,text,text,boolean,integer,integer) to service_role;

create or replace function public.moderate_resource(resource_uuid uuid, next_status text, reason_text text, admin_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if next_status not in ('approved','rejected','removed') then raise exception 'Invalid status'; end if;
  update public.resources set moderation_status = next_status,
    rejection_reason = case when next_status = 'rejected' then reason_text else null end,
    approved_at = case when next_status = 'approved' then now() else approved_at end,
    approved_by = case when next_status = 'approved' then admin_name else approved_by end
  where id = resource_uuid;
  if not found then raise exception 'Resource not found'; end if;
  insert into public.audit_logs(admin_identifier,action,resource_id,reason) values(admin_name,next_status,resource_uuid,reason_text);
end;
$$;
revoke all on function public.moderate_resource(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.moderate_resource(uuid,text,text,text) to service_role;

create or replace function public.resolve_resource_report(report_uuid uuid, next_status text, admin_name text)
returns void language plpgsql security definer set search_path = public as $$
declare target_resource uuid;
begin
  if next_status not in ('resolved','dismissed') then raise exception 'Invalid status'; end if;
  update public.resource_reports set status = next_status, resolved_at = now(), resolved_by = admin_name
  where id = report_uuid returning resource_id into target_resource;
  if not found then raise exception 'Report not found'; end if;
  insert into public.audit_logs(admin_identifier,action,resource_id,reason) values(admin_name,'report_' || next_status,target_resource,next_status);
end;
$$;
revoke all on function public.resolve_resource_report(uuid,text,text) from public, anon, authenticated;
grant execute on function public.resolve_resource_report(uuid,text,text) to service_role;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists branches_touch_updated on public.branches;
create trigger branches_touch_updated before update on public.branches for each row execute function public.touch_updated_at();
drop trigger if exists subjects_touch_updated on public.subjects;
create trigger subjects_touch_updated before update on public.subjects for each row execute function public.touch_updated_at();
drop trigger if exists resources_touch_updated on public.resources;
create trigger resources_touch_updated before update on public.resources for each row execute function public.touch_updated_at();
revoke all on function public.touch_updated_at() from public, anon, authenticated;
