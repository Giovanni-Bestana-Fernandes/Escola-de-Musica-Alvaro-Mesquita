-- =====================================================================
-- Escola de Música Álvaro Mesquita - esquema inicial
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.user_role      as enum ('admin', 'teacher', 'student');
create type public.lesson_mode    as enum ('presencial', 'online');
create type public.lesson_status  as enum ('scheduled', 'rescheduled', 'canceled', 'done');
create type public.request_type   as enum ('reschedule', 'cancel');
create type public.request_status as enum ('pending', 'approved', 'rejected');
create type public.media_type     as enum ('photo', 'youtube');

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text,
  phone       text,
  avatar_url  text,
  bio         text,
  role        public.user_role not null default 'student',
  color       text not null default '#2b6c84',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.instruments (
  id          serial primary key,
  name        text not null unique,
  slug        text not null unique,
  description text,
  sort        int not null default 0
);

create table public.teacher_instruments (
  teacher_id    uuid not null references public.profiles (id) on delete cascade,
  instrument_id int  not null references public.instruments (id) on delete cascade,
  primary key (teacher_id, instrument_id)
);

create table public.teacher_permissions (
  teacher_id          uuid primary key references public.profiles (id) on delete cascade,
  manage_festivals    boolean not null default false,
  manage_students     boolean not null default false,
  view_all_calendars  boolean not null default false,
  manage_financial    boolean not null default false,
  updated_at          timestamptz not null default now()
);

create table public.enrollments (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  teacher_id    uuid not null references public.profiles (id) on delete restrict,
  instrument_id int  not null references public.instruments (id),
  mode          public.lesson_mode not null default 'presencial',
  status        text not null default 'active' check (status in ('active', 'paused', 'ended')),
  created_at    timestamptz not null default now()
);
create index on public.enrollments (student_id);
create index on public.enrollments (teacher_id);

create table public.conversations (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments (id) on delete cascade,
  student_id    uuid not null references public.profiles (id) on delete cascade,
  teacher_id    uuid not null references public.profiles (id) on delete cascade,
  meet_link     text,
  created_at    timestamptz not null default now()
);

create table public.lessons (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  teacher_id    uuid not null references public.profiles (id),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  instrument_id int  not null references public.instruments (id),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  mode          public.lesson_mode not null default 'presencial',
  meet_link     text,
  status        public.lesson_status not null default 'scheduled',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index on public.lessons (teacher_id, starts_at);
create index on public.lessons (student_id, starts_at);

create table public.lesson_change_requests (
  id                uuid primary key default gen_random_uuid(),
  lesson_id         uuid not null references public.lessons (id) on delete cascade,
  requested_by      uuid not null references public.profiles (id) on delete cascade,
  type              public.request_type not null,
  proposed_starts_at timestamptz,
  reason            text,
  status            public.request_status not null default 'pending',
  decided_by        uuid references public.profiles (id),
  decided_at        timestamptz,
  response          text,
  created_at        timestamptz not null default now()
);
create index on public.lesson_change_requests (lesson_id);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text,
  attachment_path text,
  attachment_name text,
  link_url        text,
  created_at      timestamptz not null default now(),
  check (coalesce(body, attachment_path, link_url) is not null)
);
create index on public.messages (conversation_id, created_at);

create table public.festivals (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date not null,
  location    text,
  description text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.festival_media (
  id           uuid primary key default gen_random_uuid(),
  festival_id  uuid not null references public.festivals (id) on delete cascade,
  type         public.media_type not null,
  storage_path text,
  youtube_id   text,
  caption      text,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  check (
    (type = 'photo'   and storage_path is not null) or
    (type = 'youtube' and youtube_id   is not null)
  )
);
create index on public.festival_media (festival_id);

create table public.site_sections (
  slug       text primary key,
  title      text not null default '',
  body       text not null default '',
  image_url  text,
  sort       int not null default 0,
  visible    boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  id              int primary key default 1 check (id = 1),
  school_name     text not null default 'Espaço Musical Álvaro Mesquita',
  tagline         text,
  address         text,
  maps_embed_url  text,
  whatsapp        text,
  instagram       text,
  email           text,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Funções auxiliares (SECURITY DEFINER para evitar recursão no RLS)
-- ---------------------------------------------------------------------
create or replace function public.my_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.my_role() = 'admin', false) $$;

-- Álvaro (admin) também é professor.
create or replace function public.is_teacher()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.my_role() in ('admin', 'teacher'), false) $$;

create or replace function public.has_perm(perm text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or coalesce((
    select case perm
      when 'manage_festivals'   then tp.manage_festivals
      when 'manage_students'    then tp.manage_students
      when 'view_all_calendars' then tp.view_all_calendars
      when 'manage_financial'   then tp.manage_financial
      else false
    end
    from public.teacher_permissions tp
    join public.profiles p on p.id = tp.teacher_id
    where tp.teacher_id = auth.uid() and p.role = 'teacher' and p.active
  ), false)
$$;

create or replace function public.is_conversation_member(conv uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
  ) or public.is_admin()
$$;

create or replace function public.teaches_student(student uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.enrollments e
    where e.student_id = student and e.teacher_id = auth.uid()
  )
$$;

create or replace function public.is_my_teacher(teacher uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.enrollments e
    where e.teacher_id = teacher and e.student_id = auth.uid()
  )
$$;

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------

-- Cria o perfil automaticamente. O papel vem de app_metadata, que só a
-- service role consegue definir; o cadastro público não consegue virar admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  r public.user_role := coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'student');
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    r
  );
  if r = 'teacher' then
    insert into public.teacher_permissions (teacher_id) values (new.id);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- O serviço de autenticação grava o app_metadata (com o papel) num UPDATE logo após o INSERT.
-- Mantém profiles.role sincronizado. Só a service role consegue alterar app_metadata.
create or replace function public.handle_user_role_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  r public.user_role;
begin
  if (new.raw_app_meta_data ->> 'role') is null
     or (new.raw_app_meta_data ->> 'role') is not distinct from (old.raw_app_meta_data ->> 'role') then
    return new;
  end if;
  r := (new.raw_app_meta_data ->> 'role')::public.user_role;
  update public.profiles set role = r where id = new.id and role is distinct from r;
  return new;
end $$;

create trigger on_auth_user_role_changed
  after update of raw_app_meta_data on auth.users
  for each row execute function public.handle_user_role_change();

-- Apenas admin (ou service role) pode trocar papel/ativo de um perfil.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active)
     -- Pela API (sessão "authenticator") só admin ou service role; atualizações internas
     -- do banco (ex.: serviço de autenticação sincronizando o papel) são permitidas.
     and session_user = 'authenticator'
     and not (auth.role() = 'service_role' or public.is_admin()) then
    raise exception 'Sem permissão para alterar papel ou status do usuário';
  end if;
  if new.role = 'teacher' then
    insert into public.teacher_permissions (teacher_id) values (new.id)
    on conflict (teacher_id) do nothing;
  end if;
  return new;
end $$;

create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Cada matrícula ganha uma conversa (chat) entre aluno e professor.
create or replace function public.handle_new_enrollment()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.conversations (enrollment_id, student_id, teacher_id)
  values (new.id, new.student_id, new.teacher_id)
  on conflict (enrollment_id) do nothing;
  return new;
end $$;

create trigger on_enrollment_created
  after insert on public.enrollments
  for each row execute function public.handle_new_enrollment();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger lessons_touch before update on public.lessons
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Regras de negócio
-- ---------------------------------------------------------------------

-- Existe outra aula do professor no mesmo horário?
create or replace function public.lesson_conflict(
  p_teacher uuid, p_starts timestamptz, p_ends timestamptz, p_ignore uuid default null
) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.lessons l
    where l.teacher_id = p_teacher
      and l.status <> 'canceled'
      and (p_ignore is null or l.id <> p_ignore)
      and l.starts_at < p_ends and l.ends_at > p_starts
  )
$$;

-- Professor da aula (ou admin) aprova/recusa o pedido do aluno, de forma atômica.
create or replace function public.decide_change_request(
  p_request uuid, p_approve boolean, p_response text default null
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  req public.lesson_change_requests;
  les public.lessons;
  dur interval;
begin
  select * into req from public.lesson_change_requests where id = p_request for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if req.status <> 'pending' then raise exception 'Este pedido já foi respondido'; end if;

  select * into les from public.lessons where id = req.lesson_id for update;
  if not (les.teacher_id = auth.uid() or public.is_admin()) then
    raise exception 'Sem permissão para responder este pedido';
  end if;

  if p_approve then
    if req.type = 'cancel' then
      update public.lessons set status = 'canceled' where id = les.id;
    else
      dur := les.ends_at - les.starts_at;
      if public.lesson_conflict(les.teacher_id, req.proposed_starts_at, req.proposed_starts_at + dur, les.id) then
        raise exception 'O professor já tem aula nesse horário';
      end if;
      update public.lessons
         set starts_at = req.proposed_starts_at,
             ends_at   = req.proposed_starts_at + dur,
             status    = 'rescheduled'
       where id = les.id;
    end if;
  end if;

  update public.lesson_change_requests
     set status = case when p_approve then 'approved'::public.request_status else 'rejected'::public.request_status end,
         decided_by = auth.uid(), decided_at = now(), response = p_response
   where id = req.id;
end $$;

-- Professores visíveis na página pública (sem dados de contato).
create view public.public_teachers as
  select p.id, p.full_name, p.bio, p.avatar_url, p.role,
         coalesce(array_agg(i.name order by i.sort) filter (where i.id is not null), '{}') as instruments
  from public.profiles p
  left join public.teacher_instruments ti on ti.teacher_id = p.id
  left join public.instruments i on i.id = ti.instrument_id
  where p.role in ('admin', 'teacher') and p.active
  group by p.id;

grant select on public.public_teachers to anon, authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.instruments            enable row level security;
alter table public.teacher_instruments    enable row level security;
alter table public.teacher_permissions    enable row level security;
alter table public.enrollments            enable row level security;
alter table public.conversations          enable row level security;
alter table public.lessons                enable row level security;
alter table public.lesson_change_requests enable row level security;
alter table public.messages               enable row level security;
alter table public.festivals              enable row level security;
alter table public.festival_media         enable row level security;
alter table public.site_sections          enable row level security;
alter table public.site_settings          enable row level security;

-- profiles
create policy "profiles_select" on public.profiles for select to authenticated using (
  id = auth.uid()
  or role in ('admin', 'teacher')
  or public.is_admin()
  or public.has_perm('manage_students')
  or public.has_perm('view_all_calendars')
  or public.teaches_student(id)
);
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin() or (public.has_perm('manage_students') and role = 'student'))
  with check (id = auth.uid() or public.is_admin() or (public.has_perm('manage_students') and role = 'student'));

-- instruments / teacher_instruments
create policy "instruments_read" on public.instruments for select to anon, authenticated using (true);
create policy "instruments_admin" on public.instruments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "ti_read" on public.teacher_instruments for select to anon, authenticated using (true);
create policy "ti_admin" on public.teacher_instruments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- teacher_permissions
create policy "perm_read" on public.teacher_permissions for select to authenticated
  using (teacher_id = auth.uid() or public.is_admin());
create policy "perm_admin" on public.teacher_permissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- enrollments
create policy "enr_select" on public.enrollments for select to authenticated using (
  student_id = auth.uid() or teacher_id = auth.uid()
  or public.has_perm('manage_students') or public.has_perm('view_all_calendars')
);
create policy "enr_write" on public.enrollments for all to authenticated
  using (public.has_perm('manage_students') or (teacher_id = auth.uid() and public.is_teacher()))
  with check (public.has_perm('manage_students') or (teacher_id = auth.uid() and public.is_teacher()));

-- conversations
create policy "conv_select" on public.conversations for select to authenticated
  using (student_id = auth.uid() or teacher_id = auth.uid() or public.is_admin());
create policy "conv_update" on public.conversations for update to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() or public.is_admin());

-- lessons
create policy "les_select" on public.lessons for select to authenticated using (
  student_id = auth.uid() or teacher_id = auth.uid() or public.has_perm('view_all_calendars')
);
create policy "les_insert" on public.lessons for insert to authenticated
  with check (public.is_admin() or (teacher_id = auth.uid() and public.is_teacher()));
create policy "les_update" on public.lessons for update to authenticated
  using (public.is_admin() or teacher_id = auth.uid())
  with check (public.is_admin() or teacher_id = auth.uid());
create policy "les_delete" on public.lessons for delete to authenticated
  using (public.is_admin() or teacher_id = auth.uid());

-- lesson_change_requests
create policy "req_select" on public.lesson_change_requests for select to authenticated using (
  requested_by = auth.uid() or public.is_admin()
  or exists (select 1 from public.lessons l where l.id = lesson_id
             and (l.teacher_id = auth.uid() or l.student_id = auth.uid()))
);
create policy "req_insert" on public.lesson_change_requests for insert to authenticated with check (
  requested_by = auth.uid() and status = 'pending'
  and exists (select 1 from public.lessons l where l.id = lesson_id and l.student_id = auth.uid()
              and l.status <> 'canceled')
);
-- Aprovar/recusar acontece via decide_change_request(); o aluno pode retirar o próprio pedido pendente.
create policy "req_delete_own" on public.lesson_change_requests for delete to authenticated
  using (requested_by = auth.uid() and status = 'pending');

-- messages
create policy "msg_select" on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "msg_insert" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy "msg_delete_own" on public.messages for delete to authenticated
  using (sender_id = auth.uid());

-- festivals
create policy "fest_read" on public.festivals for select to authenticated using (true);
create policy "fest_write" on public.festivals for all to authenticated
  using (public.has_perm('manage_festivals')) with check (public.has_perm('manage_festivals'));

create policy "fmedia_read" on public.festival_media for select to authenticated using (true);
create policy "fmedia_write" on public.festival_media for all to authenticated
  using (public.has_perm('manage_festivals')) with check (public.has_perm('manage_festivals'));

-- site
create policy "sections_read" on public.site_sections for select to anon, authenticated using (true);
create policy "sections_admin" on public.site_sections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "settings_read" on public.site_settings for select to anon, authenticated using (true);
create policy "settings_admin" on public.site_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('festival-photos', 'festival-photos', false),
  ('chat-files',      'chat-files',      false),
  ('site-images',     'site-images',     true)
on conflict (id) do nothing;

-- Fotos dos festivais: qualquer usuário logado vê; quem tem permissão envia/apaga.
create policy "fphotos_read" on storage.objects for select to authenticated
  using (bucket_id = 'festival-photos');
create policy "fphotos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'festival-photos' and public.has_perm('manage_festivals'));
create policy "fphotos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'festival-photos' and public.has_perm('manage_festivals'));

-- Arquivos do chat: caminho "<conversation_id>/<arquivo>", só participantes.
-- O CASE garante que o cast para uuid só acontece com um uuid válido (sem erro em outros buckets).
create or replace function public.chat_path_member(object_name text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.is_conversation_member(split_part(object_name, '/', 1)::uuid)
    else false
  end
$$;

create policy "chat_read" on storage.objects for select to authenticated
  using (bucket_id = 'chat-files' and public.chat_path_member(name));
create policy "chat_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-files' and public.chat_path_member(name));

-- Imagens da página inicial: públicas para leitura, admin escreve.
create policy "site_img_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'site-images');
create policy "site_img_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-images' and public.is_admin());
create policy "site_img_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'site-images' and public.is_admin());

-- ---------------------------------------------------------------------
-- Realtime (chat)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
