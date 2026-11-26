-- Equipe e Projeto de Bandas no site.
-- 1) "Nome no site": o apelido com que o professor aparece na página (ex.: Alvarinho). Opcional.
alter table public.profiles add column if not exists nickname text;

-- a view pública ganha o apelido (colunas novas só podem entrar no fim)
create or replace view public.public_teachers as
  select p.id, p.full_name, p.bio, p.avatar_url, p.role,
         coalesce(array_agg(i.name order by i.sort) filter (where i.id is not null), '{}') as instruments,
         p.nickname
  from public.profiles p
  left join public.teacher_instruments ti on ti.teacher_id = p.id
  left join public.instruments i on i.id = ti.instrument_id
  where p.role in ('admin', 'teacher') and p.active
  group by p.id;

grant select on public.public_teachers to anon, authenticated;

-- 2) o texto do Projeto de Bandas, editável em Administração → Site da escola
insert into public.site_sections (slug, title, body, sort, visible) values (
  'projeto-bandas',
  'Projeto de Bandas',
  'O Projeto de Bandas do Espaço Musical nasceu para proporcionar aos nossos alunos a experiência de viver uma **banda de verdade**.

Sob a orientação do professor **Alvarinho**, os participantes se reúnem para ensaiar, desenvolver o entrosamento, aperfeiçoar a técnica, aprender a ouvir o outro e construir a música em conjunto.

Cada ensaio é um passo importante para ganhar confiança, presença de palco e se preparar para futuras apresentações.

O projeto incentiva o trabalho em equipe, a disciplina e a vivência prática da música, preparando os alunos para apresentações e fortalecendo o seu desenvolvimento artístico.',
  4,
  true
) on conflict (slug) do nothing;
