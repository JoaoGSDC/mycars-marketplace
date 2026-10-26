# Assistente de Precificação (FIPE)

Módulo **privado do painel** integrado ao estoque (etapa comercial do cadastro e card na ficha). Não há item dedicado na sidebar e **nada de FIPE/margem/custos vai para o marketplace**.

## Provedor

- Implementação atual: [Parallelum FIPE API v2](https://deividfortuna.github.io/fipe/) (`https://fipe.parallelum.com.br/api/v2`).
- Abstração: `FipeProvider` em `src/server/fipe/fipe.provider.ts` — permite trocar o backend sem mudar a UI.
- Escopo v1: apenas **carros** (`cars`).
- Token opcional no servidor: `FIPE_API_TOKEN` → header `X-Subscription-Token`.
  - Sem token: ~500 req/dia.
  - Com token gratuito Parallelum: ~1000 req/dia.
- Timeout HTTP: ~8s. Erros 429/5xx/timeout viram estado `unavailable` na UI.
- Copy para o usuário: dados via **provedor terceiro com base na Tabela FIPE** — **não** é a API oficial da Fundação FIPE.

## Cache

Tabela global `fipe_price_cache` (sem `storeId`), compartilhada entre lojas:

| Campo | Uso |
| ----- | --- |
| `provider`, `fipe_code`, `year_id`, `reference_code` | Chave única |
| `price_cents`, `fetched_at` | Cotação |
| marca/modelo/combustível/ano | Metadados para exibição |

Recálculo de margem usa só cache + `vehicle_costs` — **sem HTTP** quando a referência já está no veículo/cache.

## Persistência no veículo

Colunas em `vehicles`:

- `fipe_match_status`: `unmatched` \| `candidates` \| `matched` \| `stale` \| `unavailable`
- códigos FIPE + provedor + referência + `fipe_price_cents` / `fipe_fetched_at`
- `desired_margin_bps` (1500 = 15%; default de UI se null)

**Não** duplicamos o preço público (`listings.priceCents`). Atualização mensal da FIPE atualiza a análise; **não** altera `askingPriceCents` nem o anúncio.

## Matching

Serviço: `src/server/fipe/fipe-match.service.ts`.

1. `makeSlug` → aliases estáticos (`brand-map.ts`) + lista dinâmica de marcas do provedor.
2. Modelos filtrados por modelo/versão; 0 ou muitos → lista para a UI.
3. Anos filtrados por `yearModel` + combustível; ambíguo → seleção explícita.
4. Persistência só após escolha (ou match único inequívoco).
5. Escape: código FIPE manual + ano (`listYearsByCode` / `getPriceByCode`).

Nunca há auto-escolha silenciosa com múltiplos candidatos.

## Fórmulas (centavos / inteiros)

```
priceFromMargin = ceil(knownCost / (1 - margin/100))
               = ceil(knownCost * 10000 / (10000 - marginBps))

diffVsFipePct   ≈ ((price / fipe) - 1) * 100

estimatedMargin = ((ask - cost) / ask) * 100   // só com custos completos e ask > 0
```

Custo conhecido (próprio): soma `acquisition` + extras em `vehicle_costs` (sem double-count). Distingue aquisição **ausente** vs **zero**.

## Quando não recomenda

| Situação | Comportamento |
| -------- | ------------- |
| Consignado | Mostra FIPE; **não** oferece “Usar preço calculado” por margem |
| Sem aquisição | Mensagem de custos incompletos |
| Sem match FIPE | Candidatos / código manual |
| API down / 429 | Estado `unavailable` |
| Preço automático | **Nunca** preenche sem clique em “Usar preço calculado” |

## API e actions

Actions (UI): `src/server/pricing/pricing-actions.ts`.

Rotas internas (BFF): `/api/internal/pricing/*`

| Rota | Método |
| ---- | ------ |
| `/analysis` | GET `?storeId&vehicleId` |
| `/match` | POST |
| `/select` | POST |
| `/manual` | POST |
| `/manual-years` | POST |
| `/margin` | POST |
| `/explanation` | GET |

Auth: sessão + `vehicles:read` / `vehicles:write` / `costs:read` conforme a operação. Rate limit leve em memória (~30/min/usuário).

DTOs: `@app-types/pricing` (`src/shared/types/pricing.ts`).

## UI

- `PricingAssistant` — step comercial do `VehicleFormWizard` (variante full).
- Card compacto na ficha (`VehicleDetailView`) — respeita `costs:read`.
- Dialog “Como este preço foi calculado”.
- Listagem de estoque: **sem** coluna FIPE na v1.

## Limitações conhecidas

- Só carros; motos/caminhões fora do v1.
- Matching heurístico — versões com nomes muito diferentes exigem código manual.
- Rate limit Parallelum é compartilhado; preferir cache e evitar refresh agressivo.
- Seller sem `costs:read` vê FIPE, mas não a análise de margem completa.
