# MyCars Marketplace

Plataforma SaaS B2B2C para lojas de veículos (marketplace público, vitrine da loja, painéis lojista/admin).

> Nome da marca ainda é placeholder — edite `src/shared/config/brand.ts`.

## Setup

```bash
npm install
cp .env.example .env.local
mkdir -p .data
npm run db:migrate
ALLOW_DB_SEED=true npm run db:seed   # opcional, só em dev
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Design system (noindex): [http://localhost:3000/design-system](http://localhost:3000/design-system)
- Persistência: [docs/database.md](./docs/database.md)
- Auth: [docs/auth.md](./docs/auth.md)
- Onboarding lojistas: [docs/onboarding.md](./docs/onboarding.md)
- Operação (piloto/deploy): [docs/operations.md](./docs/operations.md)

## Scripts

| Comando | Descrição |
| ------- | --------- |
| `npm run dev` | Next.js dev |
| `npm run build` | Build de produção |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Testes (contrato de busca + persistência) |
| `npm run db:generate` | Gera migration Drizzle |
| `npm run db:migrate` | Aplica migrations (Turso local/remoto) |
| `npm run db:seed` | Seed idempotente (exige `ALLOW_DB_SEED=true`) |
| `npm run db:studio` | Drizzle Studio |

## Documentação

- [ARCHITECTURE.md](./ARCHITECTURE.md) — referência rápida
- [AGENTS.md](./AGENTS.md) — regras para agentes
- [docs/database.md](./docs/database.md) — Turso, Drizzle, seed e schema
- [docs/operations.md](./docs/operations.md) — configuração, testes, deploy, migrations, rollback
- [docs/implementation-audit.md](./docs/implementation-audit.md) — auditoria do estado atual
- [docs/implementation-roadmap.md](./docs/implementation-roadmap.md) — marcos incrementais (M0–M9)
- [docs/design-system.md](./docs/design-system.md) — tokens e componentes
- [docs/project-standards-nextjs.md](./docs/project-standards-nextjs.md) — BEM / SMACSS / Feature First
- [docs/vehicle-search-params.md](./docs/vehicle-search-params.md) — contrato da URL de busca
- [docs/pricing.md](./docs/pricing.md) — assistente de precificação (FIPE + margem)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Radix UI · Lucide · Hanken Grotesk · Turso (libSQL) · Drizzle ORM
