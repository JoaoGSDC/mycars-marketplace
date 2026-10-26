# Design System — MyCars Marketplace

Fonte visual: referências em [`docs/design-references/`](./design-references/).  
Showcase vivo (noindex): [`/design-system`](/design-system) — View em `@features/design-system`; a page em `app/` só reexporta.

## Princípios

1. **Um acento** — laranja-avermelhado vivo para superfícies/decoração; neutros quentes + preto profundo.
2. **Dois contextos de superfície** — claro (off-white + cards brancos) e escuro (quase preto + grafite) via `data-theme="dark"` no escopo da seção. Sem dark mode do sistema.
3. **Formas consistentes** — cards / painéis / navbar floating `8px` (`rounded-md`…`rounded-2xl`); pills full só onde for chip/badge. Hero da Home é full-bleed (sem padding lateral nem radius).
4. **Planos, não sombras** — separação por fundo e borda fina; no máximo 2 níveis de sombra sutil.
5. **Tipografia grotesca** — Hanken Grotesk; títulos semibold com tracking negativo; corpo regular em cinza médio.
6. **Assinaturas de marca** — Eyebrow `//`, Heading em duas tonalidades, SearchPanel glass **sutilmente claro** (só no hero: tint branco baixo + sombra, sem borda; pills originais com tab ativa em `accent-button`), Bento, BigWordmark, histograma nos ranges.

### Evitar (cara de IA / template)

Gradientes decorativos coloridos, glass fora do SearchPanel, sombras difusas grandes, emojis como ícone, cards idênticos sem hierarquia, Inter/Geist como fonte principal, aparência default shadcn sem tokens, animações exageradas.

## Tokens

Definidos em `src/styles/theme/_tokens.css` e mapeados no `@theme` do Tailwind v4.

| Grupo | Exemplos de classes |
| ----- | ------------------- |
| Accent | `bg-accent`, `bg-accent-button`, `text-accent-strong`, `bg-accent-soft` |
| Ink / texto | `text-ink`, `text-text`, `text-text-muted` |
| Superfície | `bg-bg`, `bg-surface`, `bg-surface-sunken`, `border-border` |
| Raios | `rounded-sm` … `rounded-2xl`, `rounded-full` |
| Semânticos soft | `bg-success-bg text-success-fg` (e warning/error/info) |

### Contraste (WCAG AA)

| Combinação | Uso |
| ---------- | --- |
| `accent` (#F04E1F) + branco ≈ 3.2:1 | **Não** usar em texto pequeno nem rótulo de botão |
| `accent-button` / `accent-strong` (#C93A0C) + branco ≈ 4.6:1 | Botões primários e texto laranja pequeno sobre claro |
| `accent` vivo | Superfícies decorativas grandes, indicadores, histograma ativo |

Focus-visible: anel `accent` com offset (global em `_reset.css`).

## Estilos globais

SMACSS em `src/styles/`:

- `theme/_tokens.css` — variáveis + `@theme`
- `base/` — reset, tipografia, scrollbar
- `layout/_container.css` — `.container`, `.section`, `.shell-rounded`
- `state/_states.css` — `.is-loading`, `prefers-reduced-motion`

Import único: `src/styles/index.css` (no root layout).

**Pipeline CSS:** Tailwind v4 via **PostCSS** (`@tailwindcss/postcss` + `postcss.config.mjs`).  
Não usar `turbopack.rules['*.css']` com `@tailwindcss/turbopack` — isso intercepta `*.module.css` e deixa `className` `undefined` (layout “sem estilo”).

**CSS Modules + Tailwind v4:** todo `styles.module.css` deve começar com:

```css
@reference "../../../../styles/index.css"; /* caminho relativo ao arquivo */
```

## Componentes

### Primitivos — `src/shared/components/ui/`

Padrão shadcn: Tailwind + CVA, sem BEM module. Import: `@components/ui`.

| Componente | Quando usar |
| ---------- | ----------- |
| `Button` | Ações primárias/secundárias; `primary` usa `accent-button` (AA) |
| `IconButton` | Ações só ícone (user accent, busca circular, favoritar outline) |
| `Badge` / `Chip` | Contadores, condição, filtros rápidos |
| `Tabs` | Segmentos pills (Novos/Usados) ou nav underline |
| `Field` / `Select` / `NumberInput` | Formulários; `underline` no glass, `filled` no listing |
| `RangeSlider` | Preço/km com histograma opcional |
| `Pagination` | Listagens |
| `Card` | Contêiner base; `featured` = borda accent |
| `Eyebrow` / `Heading` / `SectionHeader` | Hierarquia de seção |
| `Dialog` / `Drawer` / `Tooltip` / `Toast` | Overlays |
| `ImagePlaceholder` | Sem foto real — silhueta SVG |
| `DeviceFrame` | Moldura de celular CSS para demos (Home “Como funciona”) |
| `Icon` / `SpecIcon` | Ícones outline Lucide + specs de veículo |

### Layout — `src/shared/components/layout/`

BEM + CSS Modules. Import: `@components/layout`.

| Componente | Quando usar |
| ---------- | ----------- |
| `Logo` / `BigWordmark` | Marca; wordmark gigante acima do footer |
| `PageShell` / `Section` | Estrutura de página; `Section` aceita `data-theme` |
| `SiteHeader` | `floating` (hero), `solid` (internas), `storefront`; solid: `cityOptions`/`onCityChange`, `favoritesCount`, `showMessages`/`showUser` (marketplace consumidor: sem mensagens/conta) |
| `SiteFooter` / `NewsletterForm` | Rodapé escuro; variante `compact` na vitrine |

### Marketplace — `src/shared/components/marketplace/`

| Componente | Quando usar |
| ---------- | ----------- |
| `SearchPanel` | Busca no hero (glass sutilmente claro + sombra, sem borda); pills com tab ativa na cor principal; selects underline branco/opacity; ações brancas com ícone escuro |
| `VehicleCard` | `grid` / `listing` / `featured` / `compact`; listing/featured com foto, StoreBadge, WhatsApp (`wa.me` + `onContactClick` opcional), preço reduzido (`previousPrice`), Reservado; prop `href` |
| `Pagination` | Aceita `getHref(page)` para links reais (`<a>`/`Link`) além de `onPageChange` |
| `RangeSlider` / `RangeFilter` | `onValueCommit` (soltar polegar) + `onInputCommit` (blur/Enter); `prefix`/`suffix` nos inputs |
| Favoritos (hook) | `@hooks/use-favorites` — localStorage provisório até conta de consumidor; alimenta badge do `SiteHeader` |
| `FilterSidebar` + filtros | Desktop na listagem; referência no Design System. Mobile usa `BottomSheet` (não Drawer bottom) |
| `BottomSheet` | Overlays inferiores (filtros, sort, mais filtros). Teclado via `visualViewport`; `snapPoints`/`defaultSnap`; drag no body só com `scrollTop === 0`. Desktop: preferir `Dialog` |
| `ResultsHeader` / `BodyTypeSelector` | Cabeçalho de resultados |
| `BentoGrid` / `StatCard` / `BrandCard` / `ImageOverlayCard` | Seções de marca (bento 3 colunas) |
| `CTABanner` | Banner laranja; `eyebrow` + `href` (sem rating inventado na Home) |
| `CategoryCarousel` / `CategoryCard` | Carrossel com `href` e `renderHeader` |
| `StoreCard` | Card de loja (capa, logo, cidade, contagem) |
| `StoreBadge` / `StatusBadge` | Loja nos cards e estados de domínio |
| `FeatureShowcase` | Showcase escuro (reaproveitável; Home usa composição própria de lojas) |

### Dashboard — `src/shared/components/dashboard/`

| Componente | Uso |
| ---------- | --- |
| `DashboardShell` | Sidebar + topbar; `navGroups`, `collapsible` (desktop), drawer mobile |
| `ConfirmDialog` | Confirmações destrutivas (logout, etc.) |
| `AdminPageHeader` | Título + descrição + ações (primary/secondary) — abaixo do breadcrumb do shell |
| `AdminStatChips` | Contagens/filtros rápidos por status |
| `AdminFilterBar` | Grid de filtros + slot de ações |
| `AdminDataTable` | Tabela operacional (hover, empty/loading, footer) |
| `AdminFormActions` | Barra de ações de formulário (`sticky` opcional) |
| `AdminSection` | Seção de ficha/config |
| `AdminFormLayout` | Largura máxima do form + coluna opcional de resumo |
| `AdminFormStepper` | Etapas com status (current/done/error/pending); compacto no mobile |
| `AdminFormStatus` | Estado de salvamento (idle/dirty/saving/draft/saved/error) |
| `AdminFormErrorSummary` | Lista de erros com foco no campo |
| `AdminEntitySummary` | Resumo lateral sticky (foto, título, pendências) |
| `Autocomplete` | Campo de texto + sugestões filtráveis (combobox); não substitui `Select` |

Não duplicar o título da página no topbar do shell quando o conteúdo já usa `AdminPageHeader`.
Não usar `ProgressBars` junto com `AdminFormStepper` no mesmo formulário.

No `/painel`: filtros longos no mobile usam `BottomSheet` (ex.: estoque); touch targets ≥ `--touch-min`; sidebar collapsible respeita `prefers-reduced-motion`.

## Marca e locale

Placeholder único: `src/shared/config/brand.ts` (`brand.name`, moeda BRL, `pt-BR`, km).

## Estados de domínio

Constantes em `@app-types/status` — veículo, anúncio, oportunidade, loja.  
UI: `StatusBadge` (tons soft). Sem lógica de negócio.

## Fixtures

`src/shared/fixtures/` — só para `/design-system` e demos. Dados fictícios tipados.

## Checklist para novas UIs

1. Reutilizar token/componente existente antes de criar outro.
2. Sem hex/sombra/px mágico fora dos tokens.
3. Contexto escuro = `data-theme="dark"` na seção, não componente duplicado.
4. Glass só no `SearchPanel`.
5. Validar contraste de texto/botão (preferir `accent-button` / `accent-strong`).
6. Mobile-first; filtros longos em `BottomSheet` (painel) ou `Drawer` quando lateral.
