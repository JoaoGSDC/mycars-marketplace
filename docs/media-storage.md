# Armazenamento de mídia (imagens)

Binários **não** ficam no Turso — apenas metadados e URLs. Objetos vão para um object store via abstração `ObjectStorageProvider`.

## Avaliação de provedores (2026)

| Critério | Cloudflare R2 | Vercel Blob (Hobby) | UploadThing Free |
| -------- | ------------- | ------------------- | ---------------- |
| Plano gratuito | 10 GB storage, 1M Class A / 10M Class B ops | 1 GB storage, 10 GB transfer, 10k/2k ops | ~2 GB storage |
| Egress | **Grátis** (Internet) | Conta no limite Hobby | Sem cobrança de bandwidth (produto) |
| Custo além do free | ~US$ 0,015/GB-mês + ops | ~US$ 0,023/GB + ops | Planos a partir de ~US$ 10 |
| Next.js | S3 SDK (`@aws-sdk/client-s3`) | SDK nativo excelente | DX forte, backend fechado |
| Migração futura | API S3 → qualquer S3-compatível | Lock-in Vercel | Lock-in produto |
| URLs | Públicas (custom domain) ou assinadas | Públicas ou privadas | URLs gerenciadas |

**Não assumir gratuidade ilimitada.** Um estoque com dezenas de fotos por veículo consome storage e Class A (writes) rapidamente no Hobby da Vercel.

### Decisão

- **Produção recomendada:** Cloudflare **R2** (S3-compatible) — melhor margem no free tier, egress zero, migração trivial.
- **Desenvolvimento local:** adapter `local` grava em `.data/media` e serve via `/api/media/*` (sem credenciais cloud).
- Driver selecionado por `MEDIA_STORAGE_DRIVER=local|r2` (default: `r2` se credenciais R2 presentes, senão `local`).

## Variantes geradas (servidor, `sharp`)

| Variante | Uso | Largura máx. |
| -------- | --- | ------------ |
| `detail` | Galeria / página de detalhe | 1600px |
| `card` | Cards do marketplace | 800px |
| `original` (logo/capa) | Identidade da vitrine | 512 / 1920px |

Saída preferencial: **WebP**. Validação por **magic bytes**, não só pela extensão.

## Segurança

- Upload autenticado + permissão da loja (`vehicles:write` / `storefront:write`).
- Chaves privadas só no servidor.
- Prefixo de objeto: `stores/{storeId}/{purpose}/…`.
- Tabela `media_assets` rastreia uploads `pending` → limpeza de órfãos.
- Limites de tamanho, quantidade e MIME no servidor.

## Integrações

- `VehicleMedia` + formulário de estoque (`ImageUploader`)
- Logotipo / capa da vitrine
- `VehicleCard` e detalhes públicos consomem `cardUrl` / `detailUrl` (ou `url`)
