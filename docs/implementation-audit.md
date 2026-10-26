# Auditoria técnica e funcional — MyCars Marketplace

**Data:** 2026-10-21  
**Escopo:** compreensão do estado atual, sem redesenho e sem implementação de módulos novos.  
**Fontes:** `README.md`, `ARCHITECTURE.md`, `AGENTS.md`, `.cursor/rules/*`, `src/**`, `docs/**`, `package.json`.

---

## 1. Resumo executivo

O repositório está em fase de **fundação visual + contratos de domínio público**, com marketplace demonstrável (Home e listagem) alimentado por **fixtures e services stub**. A arquitetura alvo (Feature First + BFF + camadas `route → controller → service → repository`) está **documentada e nas regras do Cursor**, mas as pastas `src/api`, `src/server`, `src/app/api` e a persistência **ainda não existem**.

Há **dívida documental**: trechos de `ARCHITECTURE.md`, `docs/project-standards-nextjs.md`, `docs/REFACTORING.md` e algumas rules citam domínios de outro produto (Twitch/IGDB, bot, economy, raffles, Streaminhub). Isso não deve orientar o MyCars; o código real do marketplace automotivo prevalece.

| Camada | Estado |
| ------ | ------ |
| Design system + tokens | Implementado e em uso |
| Home `/` | Implementada (UI + stubs) |
| Listagem `/veiculos` | Implementada (UI + stubs + URL contract) |
| Detalhe / lojas / painéis | Placeholder / Coming soon |
| API / DB / Auth | Ausentes |
| Testes | Mínimos (contrato de busca) |

---

## 2. O que está realmente implementado

### 2.1 Fundação

- Next.js 16 (App Router), React 19, TypeScript `strict`, Tailwind v4, CSS Modules, Radix, Lucide, Hanken Grotesk.
- Scripts: `dev`, `build`, `start`, `lint`, `format`, `typecheck`, `test` (um arquivo).
- Aliases: `@features`, `@components`, `@app-types`, `@utils`, `@lib`, `@config`, `@fixtures`, `@services`, `@hooks`, `@styles`.
- **Não** há aliases `@api` / `@server` no `tsconfig` (documentados, pastas inexistentes).

### 2.2 Ambientes (route groups)

| Grupo | Rotas | Implementação |
| ----- | ----- | ------------- |
| `(marketplace)` | `/` | **Home completa** (`MarketplaceHomeView`, `revalidate=60`, JSON-LD) |
| | `/veiculos` | **Listagem completa** (filtros URL, sidebar, grid/lista, favoritos, loading/error, JSON-LD) |
| | `/veiculos/[slug]` | Coming soon |
| | `/buscar` | View leve / redirect-like |
| | `/lojas`, `/lojas/[slug]` | Coming soon |
| | `/para-lojistas`, `/sobre`, `/contato`, `/termos`, `/privacidade` | Marketing / Coming soon |
| `(storefront)` | `/vitrine` | Shell + placeholder |
| `(dealer)` | `/painel` | Shell + placeholder |
| `(admin)` | `/admin` | Shell + placeholder |
| — | `/design-system` | Showcase do DS (noindex) |

### 2.3 Design system

- Tokens: `src/styles/theme/_tokens.css` (accent, ink, surfaces, glass, radius 8px, shadow, section/container pad).
- Primitivos UI (~30): Button, Field, Select, Tabs, Badge, Chip, Drawer, Dialog, Pagination, RangeSlider, DeviceFrame, EmptyState, Skeleton, etc.
- Layout: SiteHeader, SiteFooter, PageShell, Section, Logo, BigWordmark, NewsletterForm.
- Marketplace compostos: VehicleCard (grid/listing/featured/compact), SearchPanel, filtros (Range/Year/MakeModel/Chip/BodyType), StoreCard, Bento, CTABanner, etc.
- Dashboard: `DashboardShell` (base para painéis futuros).

### 2.4 Domínio tipado (compartilhado)

- `VehicleListing`, `VehicleSpec`, `StoreSummary` / `StoreProfile` (`@app-types/vehicle`).
- Status: `VehicleStatus`, `ListingStatus`, `OpportunityStatus`, `StoreStatus` (`@app-types/status`).
- Labels e enums públicos (combustível, câmbio, carroceria, condição).

### 2.5 Contratos e regras públicas

- **URL de busca:** `@utils/vehicle-search-params` + `docs/vehicle-search-params.md` (parse/serialize estáveis, SEO canônico).
- **Visibilidade:** `@lib/catalog/is-publicly-listable` (publicado + veículo listável + loja ativa; reservado permanece visível).
- **Services stub:** `services.catalog.*`, `services.vehicleSearch.searchVehicles` (paginação, facets, histogramas).
- **Favoritos:** `@hooks/use-favorites` (localStorage, sem conta).

### 2.6 Fixtures

- ~50 veículos, 10 lojas, catálogo BR, histogramas, market stats, imagens Unsplash.
- Inclui estados não públicos (vendido/pausado) para exercitar `isPubliclyListable`.

### 2.7 Qualidade / erros

- `error.tsx` + `loading.tsx` em `/veiculos`.
- Empty states e aria-live na listagem.
- Teste automatizado: `vehicle-search-params.test.ts` apenas.
- TypeScript exclui `**/*.test.ts` do `tsc` include (testes não entram no typecheck do app).

---

## 3. O que existe apenas como stub / placeholder

| Item | Situação |
| ---- | -------- |
| `services.catalog` / `vehicleSearch` | Leitura síncrona de fixtures; comentário “trocar por HTTP” |
| Persistência Turso / Drizzle | **Não instalados**; sem schema/migrations |
| Auth / sessão / multi-tenant | **Ausentes** |
| `src/app/api/**`, `src/api/**`, `src/server/**` | **Ausentes** (só docs/rules) |
| `paths.ts` / `ENDPOINTS` / axios client | **Ausentes** |
| Zod validators em `server/` | **Ausentes** (Zod nem está em `package.json`) |
| Detalhe do veículo | Coming soon |
| Lojas (lista/vitrine pública) | Coming soon |
| Painel dealer / admin / storefront | Placeholders |
| Newsletter | Action local (`subscribeNewsletter`) sem persistência real |
| WhatsApp em cards | Link `wa.me` com número placeholder |
| `docs/REFACTORING.md` | Documento de **outro produto** (Streaminhub) — ignorar |
| Seções Twitch/IGDB/bot em ARCHITECTURE | **Legado documental** — não há código correspondente |

---

## 4. Componentes reutilizáveis por módulo futuro

| Módulo | Reutilizar |
| ------ | ---------- |
| Detalhe do veículo | VehicleCard (dados), StatusBadge, StoreBadge, Button, Badge, Breadcrumb, SiteHeader/Footer, ImagePlaceholder |
| Vitrine da loja | StoreCard, SiteHeader storefront, VehicleCard grid, SectionHeader, EmptyState |
| Gestão estoque/anúncios | DashboardShell, FilterCard, Field/Select, Dialog/Drawer, StatusBadge, Data tables (a criar), VehicleCard compact |
| Oportunidades / CRM leve | StatusBadge (opportunity), Tabs, Chip, EmptyState, Toast |
| Auth / onboarding lojista | Field, Button, Dialog — **não** inventar DS paralelo |
| Admin plataforma | DashboardShell, StatusBadge (store), Tabs, Pagination |

**Regra:** estender primitivos existentes; compostos de domínio ficam em `@components/marketplace` ou `@features/{dominio}`, não no DS global sem necessidade.

---

## 5. Inconsistências arquiteturais

1. **Docs vs código:** ARCHITECTURE / project-standards / rules citam BFF Twitch, bot-commands, economy, raffles, axios, `ENDPOINTS` — **não existem** neste repo.
2. **Camadas backend prometidas, pastas vazias:** risco de agentes gerarem código “no lugar errado” ou reinventarem.
3. **`@lib/*` marcado como “somente server”** nas rules, mas `is-publicly-listable` é regra pura usada pelos stubs (adequado em RSC). Separar mentalmente: `@lib` infra DB/auth vs helpers de domínio puros.
4. **Services no frontend** (`shared/services`) hoje **são** a camada de dados (fixtures), não HTTP. A transição para BFF deve manter a **assinatura** das funções para não quebrar Views.
5. **Aliases `@api` / `@server` ausentes** no `tsconfig` — adicionar só quando as pastas forem criadas.
6. **Documentação morta:** `docs/REFACTORING.md` (Streaminhub) polui o onboarding.
7. **Condição URL vs domínio:** URL usa `novo|seminovo|usado`; tipo interno `new|seminew|used` — mapeamento já existe nos services; preservar.

---

## 6. Contratos a preservar

| Contrato | Por quê |
| -------- | ------- |
| `vehicle-search-params` (parse/serialize/href) | URL = estado; SEO; Home → listagem |
| `isPubliclyListable` | Única regra de exposição pública |
| DTOs `@app-types/vehicle` e `@app-types/status` | UI e stubs já dependem |
| Assinaturas `services.catalog.*` / `vehicleSearch.searchVehicles` | Views RSC importam direto |
| Tokens `_tokens.css` + componentes DS listados | Identidade visual |
| Rotas públicas existentes (`/`, `/veiculos`, shells) | Não quebrar demos |
| Feature First (páginas finas, UI em `features/`) | Padrão do repo |

---

## 7. Dependências necessárias (persistência e auth)

**Ainda não no `package.json` — candidatas para o próximo marco:**

| Necessidade | Sugestão alinhada ao produto |
| ----------- | ---------------------------- |
| ORM / SQL | `drizzle-orm` + `@libsql/client` (Turso) |
| Migrations | `drizzle-kit` |
| Validação server | `zod` (já citado nas rules; instalar explicitamente) |
| Auth | Preferir solução Next-compatível (ex.: Auth.js / Better Auth) com sessão server-side; **decisão de produto** antes de instalar |
| HTTP client (BFF) | `axios` ou `fetch` wrapper — só quando houver `/api/*` |
| Uploads | Storage externo (S3-compat / R2) — fase posterior ao CRUD de veículos |

**Não instalar** bibliotecas de UI alternativas (MUI, shadcn CLI nova paleta, etc.).

---

## 8. Locais adequados para domínio, serviços e repositórios

Conforme rules (a materializar incrementalmente):

```
src/app/api/internal/{dominio}/route.ts     → wiring
src/api/internal/{dominio}/*.controller.ts  → HTTP parse/map
src/server/{dominio}/*.service.ts           → regras + Zod
src/server/{dominio}/*.validators.ts
src/server/repositories/{dominio}/*.repository.ts → Drizzle
src/shared/lib/db/                          → client Turso, schema
src/shared/types/                           → DTOs públicos (@app-types)
src/shared/services/entities/               → client HTTP das Views (após BFF)
src/features/{marketplace|storefront|dealer|admin}/ → UI
```

**Domínios sugeridos (MyCars, não o legado Twitch):**

`stores`, `vehicles`, `listings`, `opportunities`, `users` / `memberships`, `reservations`, `sales` (mínimo).

Fixtures permanecem em `@fixtures` para demos/testes; **não** misturar com repositories de produção.

---

## 9. Riscos multi-tenant

| Risco | Mitigação |
| ----- | --------- |
| Queries sem `store_id` | Repository sempre scoped; service valida membership |
| Confiar em `storeId` do body | Sessão + vínculo loja + role no server |
| Catálogo público misturado com dados privados (leads, custos) | Tabelas/colunas privadas; DTOs públicos sem campos sensíveis |
| Subdomínio de vitrine | Ainda não há; planejar resolução de tenant por host **sem** quebrar `(marketplace)` |
| `VehicleListing` único tipo | Separar persistência (estoque vs anúncio) mantendo DTO de leitura pública |
| RSC vazando dados privados | Apenas services públicos / `isPubliclyListable` nas rotas abertas |

---

## 10. Vehicle vs Listing — duplicidade e modelo alvo

### Estado atual

`VehicleListing` **agrega** em um único DTO:

- Dados do veículo (marca, modelo, specs, `status` operacional).
- Dados de publicação (`listingStatus`, `publishedAt`, `featured`, preço de anúncio).
- Snapshot da loja (`store`).

Isso é **adequado para UI pública**, mas **não** deve virar uma única tabela “tudo junto” no Turso sem cuidado.

### Modelo recomendado (persistência)

| Entidade | Responsabilidade |
| -------- | ---------------- |
| `vehicles` | Estoque da loja: status operacional, specs, custo interno (privado), fotos |
| `listings` | Publicação marketplace/vitrine: preço, `listing_status`, featured, canais |
| `stores` | Tenant comercial |
| (opcional) `vehicle_media` | Galeria |

**DTO público** continua podendo se chamar `VehicleListing` (view/join), para não forçar refactor massivo da UI.

**Sinais de conflito hoje:**

- Dois eixos de status (`status` + `listingStatus`) no mesmo objeto — correto semanticamente, fácil de confundir na UI dealer.
- `featured` / `previousPrice` vivem no DTO de listagem (publicação/oferta), não no “chassi”.
- Fixtures geram um único seed que preenche ambos — aceitável até haver schema.

---

## 11. Hooks, erros e testes

| Área | Achado |
| ---- | ------ |
| Hooks | Só `use-favorites`; listagem usa `useTransition` + router |
| Erros | `error.tsx` só em `/veiculos`; Home sem boundary dedicado |
| Testes | 1 arquivo (search params); `npm test` usa Node nativo |
| Lint/format | ESLint + Prettier configurados |
| Typecheck | `tsc --noEmit`; testes excluídos do include |

---

## 12. Conclusão da auditoria

O projeto está **pronto para evoluir incrementalmente** a partir de:

1. Limpeza documental (remover legado Twitch/Streaminhub das docs ativas).
2. Scaffold de persistência Turso + schema alinhado a Vehicle/Listing/Store.
3. BFF/internal mínimo + auth, sem reescrever Home/listagem.
4. Detalhe do veículo e painel dealer como próximos produtos de valor.

A identidade visual e os contratos públicos devem permanecer estáveis; a troca de stubs por dados reais deve ser **atrás** de `services.*` e `isPubliclyListable`.
