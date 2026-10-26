# Autenticação e autorização

Provedor: **[Better Auth](https://www.better-auth.com/)** (sessões, senhas, reset) + **autorização multi-tenant** própria em `store_memberships`.

## Por que Better Auth

- Compatível com Next.js 16, React 19 e Drizzle + Turso/libSQL.
- Sessões, hashing de senha e recuperação maduros — sem reinventar criptografia.
- Rate limit nativo nos endpoints de auth.
- Plugin `nextCookies` para Server Actions.

Papéis de loja **não** vão no JWT/cookie do client; ficam no servidor.

## Configuração

```bash
cp .env.example .env.local
# Defina BETTER_AUTH_SECRET (produção: openssl rand -base64 32)
npm run db:migrate
ALLOW_DB_SEED=true npm run db:seed
```

| Variável | Uso |
| -------- | --- |
| `BETTER_AUTH_SECRET` | Segredo de sessão (obrigatório em production) |
| `BETTER_AUTH_URL` | URL pública da app (ex. `http://localhost:3000`) |
| `NEXT_PUBLIC_SITE_URL` | Metadata / redirects |

Conta demo (seed): `owner@demo-autocenter.example` / `DemoOwner!234`

## Rotas

| Rota | Função |
| ---- | ------ |
| `/entrar` | Login |
| `/cadastro` | Cadastro |
| `/recuperar-senha` | Solicitar reset |
| `/redefinir-senha?token=` | Nova senha |
| `/convite?token=` | Aceitar convite de loja |
| `/api/auth/*` | Handler Better Auth |
| `/painel`, `/admin` | Privadas (proxy + layout) |

## Papéis

| Papel | Código | Escopo típico |
| ----- | ------ | ------------- |
| Proprietário | `owner` | Tudo na loja |
| Gerente | `manager` | Operação + membros/convites (exceto promover owner) |
| Vendedor | `seller` | Estoque e anúncios (sem custos privados) |
| Operador | `operator` | Leitura + mídia |

Matriz: `src/shared/types/permissions.ts`.

## Multi-tenancy

1. Sessão via Better Auth (`requireSession`).
2. Loja ativa: cookie httpOnly `mycars_active_store` + memberships ativos.
3. `authorizeStoreAction(userId, storeId, permission)` em toda operação sensível.
4. Vínculo `revoked` ⇒ `FORBIDDEN`.
5. Convites: `store_invites` com `token_hash` (SHA-256); plaintext só no e-mail/log de dev.

## Código-chave

| Artefato | Caminho |
| -------- | ------- |
| Auth server | `src/server/auth/auth.ts` |
| Guards | `src/server/auth/access.ts` |
| Client | `src/shared/lib/auth-client.ts` |
| Convites | `src/server/invites/` |
| UI | `src/features/auth/` |

## Testes

```bash
npm test
```

Cobre: papel autorizado, sem vínculo, vendedor em ação restrita, acesso cruzado, vínculo revogado, sessão expirada (registro `session`), permissões unitárias.
