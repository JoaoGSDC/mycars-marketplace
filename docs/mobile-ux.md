# Mobile app-like UX

Padrões touch do marketplace público. Sem bottom navigation global — barras contextuais + drawer lateral.

## Arquivos principais

| Área | Arquivo |
| ---- | ------- |
| BottomSheet | `src/shared/components/ui/BottomSheet/index.tsx` |
| Header + favoritos | `src/shared/components/layout/SiteHeader/` |
| Home search | `src/shared/components/marketplace/SearchPanel/` |
| Listagem | `src/features/marketplace/MarketplaceListingView.tsx` |
| Diretório lojas | `src/features/storefront/StorefrontDirectoryView.tsx` |
| Vitrine | `src/features/storefront/components/StorefrontCatalog/` |
| Galeria | `src/features/marketplace/components/VehicleGallery/` |
| Formulário interesse | `src/features/marketplace/components/VehicleInterestForm/` |
| Tokens safe-area | `src/styles/theme/_tokens.css` (`--safe-*`, `--page-pad-bottom-mobile`) |

## Comportamentos

- **BottomSheet**: handle arrastável; dismiss no body só se `scrollTop === 0`; teclado ajusta max-height/padding via `visualViewport`; `height` / `snapPoints` / `defaultSnap`.
- **Favoritos**: ícone no header solid (todas as larguras) + item no drawer; sheet informativo (contagem + nota localStorage + CTA `/veiculos`). Sem API de lista.
- **Ordenação**: Select desktop (`lg+`); mobile via barra inferior + sheet (listagem e `/lojas`).
- **Formulários**: `autocomplete` / `inputMode`; fonte ≥16px no mobile (evita zoom iOS).
- **Galeria lightbox**: pinch/pan leve (sem lib); Escape/backdrop fecham via Dialog Radix.

## Validação sugerida

- Viewports 320–430 (iPhone SE / comuns), tablet ~768, desktop `lg+`.
- Teclado virtual com sheet aberto (footer Aplicar visível).
- Scroll longo no body do sheet sem dismiss acidental.
- Desktop: Select de ordenação, Dialog de filtros na vitrine, sem barra mobile.

## Limitações

- Favoritos só neste aparelho (`localStorage`); sem página de lista completa.
- Pinch/pan do lightbox é básico (sem inércia / bounce).
- Sem PWA / install prompt.
- Sem bottom nav global (decisão de produto).
- `FilterSidebar` permanece no Design System e na coluna desktop da listagem — não é o padrão mobile.
