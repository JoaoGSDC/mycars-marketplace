# Vitrines individuais

## Responsabilidade das rotas

| Rota | Papel |
|------|--------|
| `/lojas` | Diretório público de lojas verificadas (marketplace). |
| `/lojas/[slug]` | Vitrine da loja no path do marketplace. Redireciona 308 se o slug mudou. |
| `/vitrine` | (1) **Subdomínio**: rewrite do proxy → vitrine pública. (2) **Apex autenticado**: preview da loja do usuário (`robots: noindex`). |
| `/vitrine/veiculos/[slug]` | Detalhe do veículo no contexto da vitrine; **canonical** aponta para `/veiculos/[slug]` no marketplace. |
| `{sub}.ROOT_DOMAIN` | Site compartilhável da loja; proxy reescreve para `/vitrine/*`. |

## Subdomínios

- Env: `ROOT_DOMAIN` (ex.: `mycars.com.br` ou `localhost:3000`).
- Local: `https://loja.localhost:3000` (navegadores modernos).
- Preview (Vercel etc.): hosts fora de `ROOT_DOMAIN` → sem resolução de tenant; use `/lojas/[slug]`.
- Reservados: `www`, `api`, `admin`, `painel`, `media`, … (`@utils/tenant-host`).
- Segurança: tenant só via header interno setado pelo `proxy.ts` após validar `Host` contra `ROOT_DOMAIN`. Query/header do cliente são ignorados.

## SEO

- Publicação: URL canônica = marketplace `/veiculos/[slug]`.
- Vitrine: canonical = origem do subdomínio quando existir; senão `/lojas/[slug]`.
- Detalhe na vitrine: `noindex` + canonical marketplace.
- Sitemap: `/`, `/veiculos`, `/lojas`, lojas e anúncios públicos.

## Dados

Marketplace e vitrine consomem a **mesma** publicação elegível (`publicEligibilitySql` / `isPubliclyListable`). Filtros da vitrine usam `storeId` no servidor.
