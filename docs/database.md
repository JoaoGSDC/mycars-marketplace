# Persistência — Turso + Drizzle

Fundação relacional do MyCars (marketplace, vitrine e gestão comercial).

## Stack

| Peça | Pacote / caminho |
| ---- | ---------------- |
| Driver | `@libsql/client` |
| ORM | `drizzle-orm` (dialect Turso / SQLite) |
| Migrations | `drizzle-kit` → pasta `drizzle/` |
| Schema | `src/shared/lib/db/schema/` |
| Client | `src/shared/lib/db/client.ts` → `getDb()` |
| Repositories | `src/server/repositories/*.repository.ts` |
| Services | `src/server/{stores,users,vehicles,listings}/*.service.ts` |

Frontend e React **nunca** importam `@lib/db` nem `@server/*`. Acesso a dados só via BFF/internal API (próximos marcos) ou Server Components que chamem services.

## Configuração local

1. Copie o exemplo de ambiente:

```bash
cp .env.example .env.local
```

2. Variáveis:

| Variável | Dev local | Remoto (Turso) |
| -------- | --------- | -------------- |
| `TURSO_DATABASE_URL` | `file:./.data/local.db` | `libsql://<db>.turso.io` |
| `TURSO_AUTH_TOKEN` | omitir | token do dashboard Turso |
| `ALLOW_DB_SEED` | `true` só para seed | **nunca** em production |

3. Crie o diretório de dados (gitignored) e aplique migrations:

```bash
mkdir -p .data
npm run db:migrate
```

4. Seed de demonstração (idempotente, bloqueado em production):

```bash
ALLOW_DB_SEED=true npm run db:seed
```

## Scripts

| Comando | Função |
| ------- | ------ |
| `npm run db:generate` | Gera SQL a partir do schema Drizzle |
| `npm run db:migrate` | Aplica migrations em `TURSO_DATABASE_URL` |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Seed dev (exige `ALLOW_DB_SEED=true`) |

> A migration inicial (`drizzle/0000_*.sql`) foi reordenada para criar tabelas na ordem das FKs (stores/users → vehicles → listings → audit). Novas migrations geradas pelo kit devem ser revisadas se o ordenamento alfabético quebrar dependências.

## Modelo (resumo)

```
Store 1──* StoreMembership *──1 User
Store 1──* Vehicle 1──0..1 Listing
Vehicle 1──* VehicleCost   (privado)
Vehicle 1──* VehicleMedia  (URL, sem binário)
Store 1──1 StorefrontSettings
Store 0──* AuditEvent      (retenção; sem purge automático)
```

Regras:

- Um veículo pertence a uma loja (`vehicles.store_id`).
- Um anúncio corresponde a no máximo um veículo (`listings.vehicle_id` único).
- Veículo pode existir sem listing publicado (estoque ≠ marketplace).
- Código interno único por loja (`vehicles.store_id` + `internal_code`); placa única por loja (validação no service).
- Situações: `preparing` | `available` | `reserved` | `sold` | `withdrawn` — `reserved`/`sold` só via reserva/venda.
- Propriedade: `own` | `consigned` (consignação exige consignante; custo de aquisição não equivale a compra própria).
- `stores.slug` e `stores.subdomain` únicos (subdomínio preparado para multi-tenancy de vitrine).
- IDs estáveis: UUID em texto (`crypto.randomUUID()`).
- Timestamps: `created_at` / `updated_at` ISO (texto); audit só com `created_at`.
- Preços e custos em **centavos** (`integer`); custos nunca em endpoints públicos.

## Segurança do seed

- Abort se `NODE_ENV === 'production'`.
- Abort se `ALLOW_DB_SEED !== 'true'`.
- Idempotente: se a loja `demo-autocenter` já existe, encerra sem duplicar.
- Credenciais e tokens **fora** do repositório (`.env*` gitignored; só `.env.example` versionado).

## Testes

```bash
npm test
```

Inclui `src/server/persistence.test.ts`: migrations em banco limpo, relações, unicidade de slug/subdomínio, isolamento por loja e unicidade listing↔vehicle.

Auth/sessões e convites: ver [auth.md](./auth.md) (`session`, `account`, `verification`, `store_invites`).
