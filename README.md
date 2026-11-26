# Espaço Musical Álvaro Mesquita

*Formando músicos para a vida.*

Site da escola: a página inicial (cursos, aulas, festivais, Projeto de Bandas, equipe e a sede com o mapa) e a tela de matrícula, que mostra o vídeo da escola e leva ao WhatsApp com a mensagem pronta.

Não usa banco de dados nem login: todo o conteúdo fica em [`src/lib/site-data.ts`](src/lib/site-data.ts).

**Stack:** Next.js 15 (App Router, TypeScript). A hospedagem é na Vercel.

---

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:3000
```

Não há variáveis de ambiente para configurar.

## Publicar na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Na Vercel, clique em **Add New → Project** e importe o repositório. O framework é detectado como Next.js.
3. Clique em **Deploy**.

---

## Editar o conteúdo

Tudo fica em [`src/lib/site-data.ts`](src/lib/site-data.ts):

| O quê | Onde |
|---|---|
| Nome, frase, endereço, WhatsApp, Instagram e e-mail | `SETTINGS` |
| Textos de "Sobre", "Festivais", "A nova sede" e "Projeto de Bandas" | `SECTIONS` (aceitam `**negrito**` e `*itálico*`) |
| Cursos do carrossel, na ordem em que aparecem | `INSTRUMENTS` |
| Professores e os cursos de cada um | `TEACHERS` |

- **Mensagem do WhatsApp e vídeo da matrícula:** em [`src/lib/whatsapp.ts`](src/lib/whatsapp.ts).
- **Mapa:** é montado a partir do endereço. Para usar um mapa específico, cole em `SETTINGS.maps_embed_url` o link de **Compartilhar → Incorporar um mapa** do Google Maps.
- **Fotos do site:**
  - A sala de ensaio do topo e os instrumentos do carrossel são fotos livres do Wikimedia Commons. Elas ficam em `public/landing/img`, e os créditos aparecem em `/creditos`.
  - Para trocar uma imagem, edite a lista em `scripts/fetch-instruments.mjs` e rode `npm run images`.
  - As cores e os tamanhos de cada instrumento ficam em `CUT`, no arquivo `src/app/route.ts`.
  - A foto da equipe é `public/landing/img/equipe.webp`.

## Testes

Com o site rodando (`APP_URL`, padrão `http://localhost:3000`):

```bash
npm run test:pages    # cada página renderiza com o conteúdo esperado
npm run test:layout   # nada sobreposto nem cortado em 15 tamanhos de tela (usa o Chrome instalado)
npm run shots         # screenshots em .taste-skill/shots/app
```

## Estrutura

```
src/app/route.ts             Página inicial (HTML + public/landing: stage.js, instruments.js, forms.js)
src/app/matricula/route.ts   Tela de matrícula (vídeo + botão do WhatsApp)
src/app/creditos/route.ts    Créditos das fotos
src/lib/site-data.ts         Conteúdo do site
public/assets/               Kit de design (system.css, layout, moments) e fotos substitutas
public/landing/              Estilo, scripts e imagens da página inicial
```
