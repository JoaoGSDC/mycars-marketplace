# Arquitetura — referência rápida

> **Documentação completa:** [README.md](./README.md) (setup, estrutura, padrões, guia para novas features).

## Fluxo backend

```
app/api/route.ts → api/controller → server/service → server/repository → shared/lib
```

## Aliases principais

| Alias          | Caminho                        |
| -------------- | ------------------------------ |
| `@features/*`  | `src/features/*`               |
| `@services`    | `src/shared/services/index.ts` |
| `@hooks/*`     | `src/shared/hooks/*`           |
| `@app-types/*` | `src/shared/types/*`           |
| `@api/*`       | `src/api/*`                    |
| `@server/*`    | `src/server/*` (server only)   |
| `@lib/*`       | `src/shared/lib/*` (infra)     |

## Persistência

| Camada | Caminho |
| ------ | ------- |
| Client + schema | `src/shared/lib/db/` → `@lib/db` |
| Repositories | `src/server/repositories/` |
| Services | `src/server/{stores,users,vehicles,listings}/` |
| Migrations | `drizzle/` |
| Docs | [docs/database.md](./docs/database.md) |

Entidades: `Store`, `User`, `StoreMembership`, `Vehicle`, `VehicleCost`, `VehicleMedia`, `Listing`, `StorefrontSettings`, `AuditEvent`. **Vehicle ≠ Listing.** Custos internos nunca são públicos.

**Auth:** Better Auth (`/api/auth/*`) + guards em `@server/auth/access` (sessão, loja ativa, permissões). Papéis: owner / manager / seller / operator. Docs: [docs/auth.md](./docs/auth.md).

**Onboarding:** `/para-lojistas` → solicitação → admin aprova/rejeita → `/painel/vitrine`. Cadastro e assinatura são independentes. Docs: [docs/onboarding.md](./docs/onboarding.md).

**Integridade / privacidade:** confirmação de estoque, auditoria sanitizada, exportação/exclusão com retenção, jobs idempotentes em `POST /api/internal/jobs`. Operação: [docs/operations.md](./docs/operations.md).

Controllers (quando existirem) importam **somente** `*Service`, nunca `@server/repositories`. React não importa ORM.

## Endpoints (alvo)

- **BFF** `/api/bff/*` — integrações externas
- **Internal** `/api/internal/*` — DB / admin / painel

## Tipos

DTOs compartilhados em `src/shared/types/` (`@app-types/*`). Schemas Zod apenas em `src/server/{dominio}/*.validators.ts`.

## Frontend — Feature First + design system

Páginas em `src/app/` são **finas** (metadata + reexport da View). UI e shells por domínio ficam em `src/features/{dominio}/`.

| Área | Caminho |
| ---- | ------- |
| Features (Views / Shells) | `src/features/{marketplace,storefront,dealer,admin,design-system}/` → `@features/*` |
| Tokens / SMACSS | `src/styles/` (`theme/_tokens.css`, base, layout, state) |
| Marca (placeholder) | `src/shared/config/brand.ts` |
| Primitivos UI | `src/shared/components/ui/` → `@components/ui` |
| Layout global | `src/shared/components/layout/` → `@components/layout` |
| Marketplace / vitrine (compostos) | `src/shared/components/marketplace/` → `@components/marketplace` |
| Painel (compostos) | `src/shared/components/dashboard/` → `@components/dashboard` |
| Tipos de domínio (status, veículo) | `src/shared/types/` → `@app-types/*` |
| Fixtures (demo) | `src/shared/fixtures/` → `@fixtures` |
| Showcase | `/design-system` (noindex) → `@features/design-system` |
| Docs UI | [docs/design-system.md](./docs/design-system.md) |
| Referências visuais | [docs/design-references/](./docs/design-references/) |

### Ambientes (route groups)

| Grupo | Rotas | Feature |
| ----- | ----- | ------- |
| `(marketplace)` | `/` (Home), `/buscar`, `/veiculos`, `/lojas`, `/para-lojistas`, legales | `@features/marketplace` + `@features/marketing` |
| `(storefront)` | `/vitrine/*` (rewrite interno via `proxy.ts` + Host/`ROOT_DOMAIN`) | `@features/storefront` |
| `(dealer)` | `/painel/*` (shell único + módulos) | `@features/dealer` (`DealerAppShell`) |
| `(admin)` | `/admin` | `@features/admin` |

Vitrine pública: subdomínio `{loja}.{ROOT_DOMAIN}` → rewrite para `/vitrine`. Headers `x-mycars-storefront-*` só são setados pelo proxy após resolução confiável do Host.

### Home / busca / listagem

| Artefato | Caminho |
| -------- | ------- |
| Contrato URL de busca | `@utils/vehicle-search-params` · [docs/vehicle-search-params.md](./docs/vehicle-search-params.md) |
| Visibilidade pública | `@lib/catalog/is-publicly-listable` |
| Stub de catálogo | `@services` → `services.catalog.*` |
| Stub de busca/listagem | `@services` → `services.vehicleSearch.searchVehicles` |
| Fixtures | `@fixtures` (~48 veículos, 10 lojas, catálogo BR) |
| Copy da Home | `src/features/marketplace/marketplace.home.content.ts` |
| Listagem `/veiculos` | `MarketplaceListingView` + `loading.tsx` / `error.tsx` |
| Favoritos (provisório) | `@hooks/use-favorites` (localStorage, sem conta) |

## Cursor / agentes

Regras persistentes em [`.cursor/rules/`](./.cursor/rules/) + [AGENTS.md](./AGENTS.md). O agente deve seguir a mesma arquitetura descrita no [README.md](./README.md).
