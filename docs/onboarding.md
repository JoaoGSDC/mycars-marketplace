# Onboarding de lojistas

Fluxo de solicitação, análise administrativa e configuração da vitrine.

## Fluxo

1. `/para-lojistas` — produto e CTA
2. `/para-lojistas/cadastro` — wizard (exige login)
3. Solicitação fica `pending`
4. `/admin/solicitacoes` — aprovar ou rejeitar (com motivo)
5. `/painel/solicitacao` — status para o lojista
6. `/painel/vitrine` — identidade visual (somente após `active`)

## Regras

| Regra | Comportamento |
| ----- | ------------- |
| Aprovação ≠ pagamento | `subscriptionStatus` permanece `none` (ou o valor anterior) |
| Cadastro × assinatura | Campos independentes em `stores` |
| Pendente / rejeitada / suspensa | Não publica anúncios (`LISTING_STATUS.PUBLISHED` bloqueado) |
| Subdomínio / slug / CNPJ | Únicos (CNPJ rejeitado pode reenviar) |
| Suspensão | Não apaga dados |
| Alterações críticas | `audit_events` |

## Contas seed

| Papel | E-mail | Senha |
| ----- | ------ | ----- |
| Lojista | `owner@demo-autocenter.example` | `DemoOwner!234` |
| Admin | `admin@mycars.example` | `AdminDemo!234` |

## Código

| Peça | Caminho |
| ---- | ------- |
| Service | `src/server/onboarding/` |
| CNPJ | `@utils/cnpj` |
| UI marketing | `@features/marketing` |
| Painel | `@features/dealer` (`ApplicationStatusView`, `StorefrontSetupView`) |
| Admin | `@features/admin` (`ApplicationsAdminView`) |
