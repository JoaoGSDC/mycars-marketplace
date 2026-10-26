# Anúncios (Listing)

`Vehicle` = unidade física do estoque. `Listing` = publicação comercial (1:1 com veículo).

## Elegibilidade (domínio)

Centralizado em `src/server/listings/listing-eligibility.ts`:

- Veículo `preparing` / `sold` / `withdrawn` → não publica
- Loja só com `STORE_STATUS.ACTIVE` (`canStorePublishListings`)
- Anúncio `suspended` → lojista não republica
- Exige preço público e ao menos uma foto selecionada

Visibilidade pública (marketplace + vitrine): `isPubliclyListable(VehicleListing)` — contrato preservado; o mapper DB usa a mesma lógica via `isListingRowPubliclyVisible`.

## Transições (lojista)

| De | Para |
| -- | ---- |
| draft | published, closed |
| published | paused, closed |
| paused | published, closed |
| suspended / closed | — |

Suspensão administrativa cascadeia na suspensão da loja; lojista não reverte.

Venda do veículo (`source: sale`) encerra o anúncio ativo — estoque permanece.

## Canais

Publicação única: mesmo `Listing` alimenta marketplace (`/veiculos`) e vitrine (`/lojas/[slug]`). Preço público alterado no anúncio reflete nos dois.
