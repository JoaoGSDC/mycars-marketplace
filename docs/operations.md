# Operação — piloto MyCars

Guia operacional para configuração, desenvolvimento, testes, deploy, migrations e integrações.

## Ambientes

| Ambiente | Banco | Mídia | Auth URL | Seed |
| -------- | ----- | ----- | -------- | ---- |
| Local | `file:./.data/local.db` | `MEDIA_STORAGE_DRIVER=local` | `http://localhost:3000` | permitido com `ALLOW_DB_SEED=true` |
| Staging | Turso dedicado | R2 bucket staging | URL staging | **desligado** |
| Production | Turso prod | R2 prod | URL canônica HTTPS | **nunca** |

Regra: credenciais e secrets **nunca** no cliente (`NEXT_PUBLIC_*` só para origem pública).

## Variáveis de ambiente

Ver `.env.example`. Obrigatórias em produção:

| Variável | Uso |
| -------- | --- |
| `TURSO_DATABASE_URL` | libSQL remoto |
| `TURSO_AUTH_TOKEN` | token Turso |
| `BETTER_AUTH_SECRET` | ≥ 32 bytes aleatórios (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | origem canônica da app |
| `NEXT_PUBLIC_SITE_URL` | origem pública (metadata, mídia local) |
| `ROOT_DOMAIN` | domínio raiz das vitrines (ex.: `mycars.com.br`) |
| `INTERNAL_JOBS_SECRET` | Bearer para `POST /api/internal/jobs` (≥ 16 chars) |
| `R2_*` | object storage em produção |

Opcionais: `MEDIA_STORAGE_DRIVER`, `MEDIA_LOCAL_ROOT`, `ALLOW_DB_SEED` (só dev).

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
mkdir -p .data
npm run db:migrate
ALLOW_DB_SEED=true npm run db:seed   # opcional
npm run dev
```

- Marketplace: `http://localhost:3000`
- Vitrine local: `http://{subdomain}.localhost:3000` (após subdomain na loja)
- Design system (noindex): `/design-system`

## Testes

```bash
npm test                 # suite Node (tsx --test) — isolamento multi-tenant e fluxos de domínio
npm run typecheck
npm run lint
```

A suite cobre onboarding, auth/autorização, estoque, mídia, anúncios, catálogo público, vitrine, CRM, reservas, vendas, dashboard, admin e integridade — **não** substitui smoke E2E no browser com DNS real e e-mail.

## Migrations

```bash
# Após alterar schema em src/shared/lib/db/schema/
npm run db:generate
# Revisar SQL em drizzle/*.sql
npm run db:migrate      # aponta para TURSO_DATABASE_URL do ambiente
```

Procedimento de produção:

1. Backup do banco Turso (snapshot / dump do provedor).
2. Aplicar migrations no **staging** e validar `npm test` + smoke manual.
3. Aplicar as **mesmas** migrations em produção.
4. Deploy da aplicação (versão que espera o schema novo).
5. Se falhar: rollback do deploy; migrations Drizzle/SQLite em geral **não** são auto-revertidas — restaure o snapshot.

## Deploy (checklist)

1. Secrets de produção configurados (sem `ALLOW_DB_SEED`).
2. `BETTER_AUTH_SECRET` distinto do valor de exemplo.
3. `ROOT_DOMAIN` e DNS wildcard `*.dominio` apontando para o host.
4. R2 (ou storage) com CORS/público apenas para assets.
5. Cron/worker chamando `POST /api/internal/jobs` com:
   - `Authorization: Bearer $INTERNAL_JOBS_SECRET`
   - body `{ "kind": "availability_enforcement" }` (diário)
   - body `{ "kind": "privacy_retention" }` (semanal)
6. `npm run build` sem erros; health check na home e em `/veiculos`.
7. Smoke: login lojista → publicar → buscar no marketplace → contato → (opcional) reserva/venda em staging.

## Rollback

1. Reverter o release da plataforma (imagem/commit anterior).
2. Se a migration já rodou e for incompatível: restaurar snapshot Turso **antes** da migration.
3. Invalidar CDN/cache de imagens se URLs mudaram.
4. Registrar incidente e auditoria administrativa.

## Backups e recuperação

- Turso: habilitar backups/snapshots do plano; testar restore em staging periodicamente.
- Mídia R2: versionamento do bucket ou replicação; assets são imutáveis por chave.
- Não há backup automático no código da app — responsabilidade da infra.

## Integrações externas

| Integração | Estado piloto | Notas |
| ---------- | ------------- | ----- |
| Turso | obrigatória | limites do plano free (storage/requests) |
| Better Auth | obrigatória | rate limit nativo; reset de senha exige provedor de e-mail em prod |
| Cloudflare R2 | recomendada em prod | local ok só para dev |
| Jobs/cron | obrigatória para confirmação de estoque | Vercel Cron / GitHub Action / worker |
| E-mail transacional | **pendente** | reset de senha e convites não enviam em produção hoje |

## Limites de planos gratuitos (atenção)

- **Turso free**: teto de storage e requisições — monitorar após piloto com várias lojas.
- **R2**: egress e operações; preferir URLs públicas do bucket.
- **Host serverless**: cold start; jobs devem ser idempotentes (`job_runs`).
- Evitar seed e Studio apontando para produção.

## Separação dev/prod

- Bancos, buckets e secrets distintos.
- `ALLOW_DB_SEED` nunca em produção.
- Subdomínios de teste não devem apontar para DB prod.
- Logs sem senhas/tokens (auditoria já sanitiza payloads sensíveis).
