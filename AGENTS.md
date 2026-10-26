# Instruções para agentes (Cursor / AI)

Este repositório segue arquitetura **Feature First + BFF + camadas backend**.

## Leitura obrigatória

1. **[README.md](./README.md)** — setup, estrutura, padrões, guia para novas features
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — referência rápida
3. **`.cursor/rules/*.mdc`** — regras persistentes do Cursor (aplicadas automaticamente)

## Regras inegociáveis

- Frontend **nunca** importa `@server/*` ou acessa SQL/repository.
- Backend: `route → controller → service → repository` (domínios padronizados).
- Tipos compartilhados: `@app-types/*` (`src/shared/types/`).
- API externa (Twitch/IGDB): frontend → `@services` → `/api/bff/*`.
- API interna: `/api/internal/*` + `ENDPOINTS` em `shared/services/paths.ts`.
- Rotas dinâmicas: `withParam` / `withParams` de `@api/shared/create-route`.
- Páginas admin finas; UI em `src/features/{dominio}/`.

## Auth

Better Auth + multi-tenancy: [docs/auth.md](./docs/auth.md). Sessão e permissões **somente no servidor** (`@server/auth/access`). Nunca confiar em role/storeId do client.

## Antes de concluir tarefas backend/types

```bash
npx tsc --noEmit
```

## Padrões de UI

- [docs/project-standards-nextjs.md](./docs/project-standards-nextjs.md) — BEM, SMACSS, entidades co-locadas
- [docs/design-system.md](./docs/design-system.md) — tokens, direção visual, componentes

## Idioma

Respostas e comentários de código novos: **português**, salvo pedido contrário.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
