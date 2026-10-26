# Contrato de busca de veículos

A **URL é o estado** da busca. Parse e serialize: `src/shared/utils/vehicle-search-params.ts` (`@utils/vehicle-search-params`).

Path base: `/veiculos`.

## Parâmetros

| Param                     | Tipo                            | Notas                                                                   |
| ------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `q`                       | string                          | Texto livre (marca, modelo, versão)                                     |
| `condicao`                | `novo` \| `seminovo` \| `usado` | Opcional                                                                |
| `marca`                   | string (repetível)              | Slug da marca                                                           |
| `modelo`                  | string (repetível)              | Formato `marca:modelo`                                                  |
| `preco_min` / `preco_max` | inteiro ≥ 0                     | Reais                                                                   |
| `km_min` / `km_max`       | inteiro ≥ 0                     | Quilômetros                                                             |
| `ano_min` / `ano_max`     | inteiro                         | Ano-modelo                                                              |
| `combustivel`             | repetível                       | `gasolina` \| `etanol` \| `flex` \| `diesel` \| `eletrico` \| `hibrido` |
| `cambio`                  | repetível                       | `manual` \| `automatico` \| `cvt` \| `automatizado`                     |
| `carroceria`              | repetível                       | `hatch` \| `sedan` \| `suv` \| `picape` \| `utilitario`                 |
| `local`                   | string                          | Slug `cidade-uf` (ex.: `sao-paulo-sp`)                                  |
| `ordem`                   | enum                            | Padrão `recentes`; também `menor-preco`, `maior-preco`, `menor-km`      |
| `pagina`                  | inteiro ≥ 1                     | Padrão `1`                                                              |

## Regras

- Valores inválidos são **ignorados** (nunca quebram a página).
- `serialize` gera ordem de chaves **estável**, ordena valores repetíveis e **omite** defaults (`ordem=recentes`, `pagina=1`) e arrays vazios.
- Helpers: `parseVehicleSearchParams`, `serializeVehicleSearchParams`, `buildVehicleSearchHref`, `PRICE_RANGE_PRESETS`.

## Exemplos

```
/veiculos?condicao=usado&marca=volkswagen&carroceria=suv&ordem=menor-preco
/veiculos?modelo=toyota:corolla&ano_min=2020&preco_max=120000
```

## Listagem `/veiculos`

- Stub: `services.vehicleSearch.searchVehicles(params)` → items (12/página), total, facets (histogramas ~24 faixas, marcas/modelos, limites).
- Visibilidade: apenas `isPubliclyListable` (Disponível/Reservado + anúncio Publicado + loja ativa).
- URL é a fonte da verdade; filtros no client usam `router.replace({ scroll: false })` + `useTransition`.

### SEO (provisório)

| Regra | Comportamento |
| ----- | ------------- |
| Canonical | Omite `ordem` (sempre “recentes” no canônico) e `pagina` quando = 1 |
| `q` presente | `robots: noindex, follow` |
| JSON-LD | `ItemList` com os itens da página atual |

Revisar quando houver indexação real e conta de consumidor.
