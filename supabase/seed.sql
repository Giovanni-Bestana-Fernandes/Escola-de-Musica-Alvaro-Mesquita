-- Dados iniciais: instrumentos e conteúdo da página inicial.
-- Os usuários (Álvaro, professores e alunos) são criados por scripts/seed.mjs.

insert into public.instruments (name, slug, description, sort) values
  ('Guitarra', 'guitarra', 'Do primeiro acorde aos solos: técnica, repertório e improvisação.', 1),
  ('Violão',   'violao',   'Popular e erudito, dedilhado, batidas e leitura de cifras e partituras.', 2),
  ('Baixo',    'baixo',    'Groove, linhas de baixo e a base rítmica de qualquer banda.', 3),
  ('Teclado',  'teclado',  'Harmonia, leitura e acompanhamento para todos os estilos.', 4),
  ('Ukulelê',  'ukulele',  'Leve, divertido e perfeito para começar na música.', 5),
  ('Canto',    'canto',    'Técnica vocal, respiração, afinação e interpretação.', 6)
on conflict (slug) do nothing;

insert into public.site_settings (id, school_name, tagline, address, maps_embed_url, whatsapp, instagram, email)
values (
  1,
  'Espaço Musical Álvaro Mesquita',
  'Formando músicos para a vida.',
  'Rua Exemplo, Centro',
  null,
  '5500000000000',
  'escolaalvaromesquita',
  'contato@exemplo.com'
)
on conflict (id) do nothing;

insert into public.site_sections (slug, title, body, sort) values
  ('sobre', 'Sobre a escola',
   'A escola nasceu das aulas de **guitarra** do professor Álvaro Mesquita e foi crescendo junto com os alunos.

Hoje somos uma escola completa, com aulas de **guitarra, violão, baixo, teclado, ukulelê e canto**, presenciais e online, para todas as idades e níveis.', 1),
  ('nova-sede', 'A nova sede',
   'Para receber mais alunos e oferecer mais conforto, **mudamos de sede**.

Agora contamos com mais salas, estúdio para ensaios e um espaço para os nossos festivais.', 2),
  ('festivais', 'Festivais',
   'Várias vezes por ano, todos os alunos sobem ao palco nos nossos **festivais**. Cada aluno toca o repertório que preparou nas aulas, sozinho ou em grupo.

As fotos e os vídeos de cada festival ficam na área do aluno.', 3),
  ('online', 'Aulas online',
   'Não pode vir até a escola? Temos aulas **online ao vivo** pelo Google Meet, com chat exclusivo entre aluno e professor para materiais, partituras e gravações.', 4)
on conflict (slug) do nothing;
