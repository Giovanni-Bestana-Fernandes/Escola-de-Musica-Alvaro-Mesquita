# Espaço Musical Álvaro Mesquita

*Formando músicos para a vida.*

Plataforma da escola: site público, área do aluno e do professor, calendário de aulas com remarcação e cancelamento, chat com arquivos e link do Meet, galeria dos festivais e painel administrativo.
Funciona no navegador e pode ser **instalada no celular como app** (PWA).

**Stack:** Next.js 15 (App Router, TypeScript, Tailwind 4), Supabase (Auth, Postgres com RLS, Storage, Realtime) e FullCalendar. A hospedagem é na Vercel.

---

## Quem pode fazer o quê

| | Aluno | Professor | Álvaro (diretor e professor) |
|---|---|---|---|
| Ver as próprias aulas no calendário | ✅ | ✅ (aulas com os seus alunos) | ✅ "Minhas aulas" + todos os professores |
| Remarcar ou cancelar aula | Pede ao professor | Direto, também arrastando no calendário | Direto, em qualquer aula |
| Aprovar ou recusar pedidos | – | Das próprias aulas | De qualquer aula |
| Chat com arquivos e link do Meet | Com os seus professores | Com os seus alunos | Com os seus alunos + vê todos |
| Ver fotos e vídeos dos festivais | ✅ | ✅ | ✅ |
| Publicar festivais | – | Se tiver a permissão **Festivais** | ✅ |
| Cadastrar alunos e matrículas de outros professores | – | Se tiver a permissão **Alunos** | ✅ |
| Ver o calendário de todos | – | Se tiver a permissão **Calendário geral** | ✅ |
| Cadastrar professores e definir permissões | – | – | ✅ |
| Editar a página inicial (textos, nova sede, mapa) | – | – | ✅ |

As permissões são garantidas no banco (Row Level Security), não apenas escondidas na tela.

---

## 1. Colocar a logo

Salve a logo oficial como **`public/logo.png`**, de preferência com fundo transparente ou preto. Ela aparece no topo da página inicial.
Enquanto o arquivo não existir, o site mostra um emblema dourado em SVG com o nome da escola.

## 2. Criar o projeto no Supabase

1. Crie um projeto em <https://supabase.com> (o plano gratuito serve para começar).
2. Abra **SQL Editor** e execute, nesta ordem:
   1. o conteúdo de [`supabase/migrations/20261125000000_schema.sql`](supabase/migrations/20261125000000_schema.sql);
   2. o conteúdo de [`supabase/seed.sql`](supabase/seed.sql), que cria os instrumentos e os textos iniciais do site.
3. Em **Authentication → Sign In / Providers**, **desative "Allow new users to sign up"**. Só o Álvaro e os professores com permissão criam contas.
4. Em **Project Settings → API**, copie a URL, a `anon key` e a `service_role key`.

## 3. Rodar localmente

```bash
cp .env.example .env.local   # preencha as chaves do Supabase e ADMIN_EMAIL / ADMIN_PASSWORD
npm install
npm run seed                 # cria a conta do Álvaro (admin)
# ou: npm run seed:demo      # admin + 2 professores, 2 alunos, aulas e um festival (senha: senha123)
npm run dev                  # http://localhost:3000
```

### Alternativa: tudo local com Docker (sem criar projeto no Supabase)

Com o Docker Desktop aberto:

```bash
npx supabase start              # sobe Postgres, Auth, Storage e Realtime e aplica migration + seed.sql
npx supabase status -o env      # mostra API_URL, ANON_KEY e SERVICE_ROLE_KEY para o .env.local
npm run seed:demo               # cria os usuários de demonstração (senha: senha123)
npm run dev
```

- Painel do banco (Supabase Studio): <http://127.0.0.1:54323>
- Para zerar o banco: `npx supabase db reset` e depois `npm run seed:demo`
- Para desligar: `npx supabase stop`

**Testes automatizados** (rodam contra o banco com os dados de demonstração):

```bash
npm run test:rls     # 54 verificações de permissão: aluno x professor x Álvaro, chat, arquivos, festivais, tempo real
npm run test:pages   # abre cada página logado como cada usuário (APP_URL=http://localhost:3000 por padrão)
```

## 4. Publicar na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Na Vercel, clique em **Add New → Project** e importe o repositório. O framework é detectado como Next.js.
3. Em **Environment Variables**, cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secreta, usada só no servidor para criar contas)
4. Clique em **Deploy**.
5. No Supabase, em **Authentication → URL Configuration**, coloque o domínio da Vercel em *Site URL*.

Para instalar no celular, abra o site, toque em **Compartilhar → Adicionar à Tela de Início** (iPhone) ou em **Instalar app** (Android/Chrome).

---

## Uso do dia a dia

- **Cadastrar professor:** *Professores e acessos → Cadastrar professor*. Ali mesmo você liga ou desliga as permissões de cada um.
- **Cadastrar aluno e matrícula:** *Alunos e matrículas*. Cada matrícula (aluno + professor + instrumento) cria automaticamente um **chat** entre os dois.
- **Agendar aulas:** em cada matrícula, use *+ Agendar aulas*. Informe a primeira aula e o número de semanas. O sistema avisa se houver conflito de horário.
- **Aulas online:** cole o link do Google Meet na aula ou fixe-o no chat. O aluno vê o botão **Entrar no Google Meet**.
- **Remarcação:**
  - O aluno abre a aula e pede a remarcação, sugerindo um horário, ou o cancelamento.
  - O professor recebe o pedido em *Início* e aprova ou recusa. Ao aprovar, o calendário é atualizado.
- **Festivais:** crie o festival, envie várias fotos de uma vez (elas são otimizadas automaticamente) e cole links do YouTube. Publique os vídeos como **"Não listado"**.
- **Página inicial:** em *Página inicial*, edite os textos, o endereço da nova sede, o mapa do Google, o WhatsApp e o Instagram.

## Estrutura

```
src/app/(public)/page.tsx       Site público
src/app/(auth)/login            Login
src/app/(app)/...               Área logada: inicio, calendario, aulas/[id], chat, festivais, alunos, perfil, admin/*
src/lib/actions/*.ts            Server Actions (aulas, chat, festivais, pessoas, site)
src/lib/auth.ts                 Usuário atual e permissões
supabase/migrations/            Tabelas, RLS, storage, funções
scripts/seed.mjs                Cria o admin e os dados de demonstração
```
