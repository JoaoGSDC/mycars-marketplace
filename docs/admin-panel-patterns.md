# Padrões do painel lojista (`/painel`)

Referência rápida alinhada ao design system (`docs/design-system.md` → Dashboard).

## Shell

- `DealerAppShell` → `DashboardShell` com `navGroups`, `collapsible`, sem `title` no topbar.
- Breadcrumb no shell; título e CTAs no `AdminPageHeader` do conteúdo.

## Listagens

Ordem típica: `AdminPageHeader` → `AdminStatChips` → `AdminFilterBar` → `AdminDataTable`.

- Ação de linha padrão: **Editar** (quando `canWrite`).
- Pausar/retomar anúncio permanece na ficha (`ListingDetailView`), sem novas regras.

## Fichas e formulários

- `AdminPageHeader` + `AdminSection` para leitura/edição.
- Layout padrão: `AdminFormLayout` (`width="sm"` | `"form"` | `"wide"`) + `AdminFormActions` (`sticky` em wizards longos).
- Wizard multi-etapa: `AdminFormStepper` (não combinar com `ProgressBars`) + `AdminFormStatus` + `AdminFormErrorSummary` + `AdminEntitySummary` (resumo lateral).
- Wizard de estoque (`VehicleFormWizard`): 5 etapas; rascunho via `isDraft`; Vehicle ≠ Listing.
- Forms simples (cliente, reserva, etc.): `AdminFormLayout` + `AdminFormActions` **sem** stepper.
- Vitrine (`/painel/vitrine`): editor ~40/60 com preview sticky; rascunho (`draftJson`) vs publicação; `/vitrine?rascunho=1` só autenticado; uploads `ImageUploader` `variant="logo|cover|gallery"`.

### Adoção gradual (checklist)

| Módulo | Layout/actions | Stepper | Notas |
| --- | --- | --- | --- |
| Estoque (wizard) | sim | sim | referência |
| Clientes | sim | não | |
| Reservas (nova) | sim | não | |
| Oportunidades | pendente | não | form curto |
| Vendas | pendente | não | form curto |
| Equipe / convites | pendente | não | |
| Configurações | pendente | não | |
| Vitrine | layout próprio | não | editor visual |

## Mobile

- Filtros longos (estoque): `BottomSheet` “Mais filtros”.
- Touch ≥ `--touch-min` no shell e ações admin.
- `prefers-reduced-motion` na sidebar e chips.
- Stepper: rótulo compacto “Etapa X de Y” no mobile; lista completa no desktop.
- `AdminEntitySummary`: colapsável no mobile.
