# Estoque (painel do lojista)

Gestão de veículos da loja ativa — próprios e consignados — independente de anúncio no marketplace.

## Fluxo

```
/painel/estoque → searchStoreVehicles (filtros + contagens)
/painel/estoque/novo → createVehicle (+ custos/mídia opcionais)
/painel/estoque/[id] → update / transition / costs / media
```

Camadas: pages → `@features/inventory` → `inventory-actions` → `vehicles.service` → repositories.

## Permissões

| Ação | Permissão |
| ---- | --------- |
| Listar / ver ficha | `vehicles:read` |
| Cadastrar / editar / transição de estoque | `vehicles:write` |
| Ver custos | `costs:read` |
| Registrar / remover custos | `costs:write` |

Toda consulta exige loja ativa + membership; isolamento entre tenants no repository (`store_id`).

## Transições (módulo estoque)

| De | Para |
| -- | ---- |
| preparing | available, withdrawn |
| available | preparing, withdrawn |
| withdrawn | preparing |
| reserved / sold | — (somente reserva/venda) |

## UI

- Listagem operacional com filtros reutilizáveis, badges, paginação, EmptyState e Skeleton.
- Cadastro em etapas (`INVENTORY_FORM_STEPS`) usando catálogo `fixtureCatalog`.
- Confirmação via `ConfirmDialog`; feedback via toast.
