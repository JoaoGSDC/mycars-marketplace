# Padrões de Projeto — StreaminHub (Next.js)

Siga rigorosamente os padrões abaixo em todo código gerado nessa conversa.

---

## Stack e contexto

- **Framework**: Next.js (App Router) — `src/app/` é a camada de roteamento
- **Estilização**: Tailwind CSS + CSS Modules com nomenclatura BEM
- **Organização de estilos**: SMACSS (global) + SMACSS adaptado (componentes)
- **⚠️ IGNORAR COMPLETAMENTE**: a pasta `src/app/api/` — nunca gerar, editar nem referenciar arquivos dentro dela

---

## Estrutura de pastas

Cada **entidade** (página ou componente global reutilizável) é uma pasta autocontida,
preparada para extração futura (microfrontends, modules, monorepo).

```
src/
├── app/                              # Rotas Next.js + entidades de página
│   ├── api/                          # ⛔ IGNORAR
│   ├── home/                         # Entidade: landing (rota /)
│   ├── home/                         # Entidade: landing (rota /)
│   │   ├── layout.tsx                # Shell client (Header, footer, provider)
│   │   ├── page.tsx                  # Server Component — SEM 'use client'
│   │   ├── home.content.tsx          # Conteúdo client da página
│   │   ├── home.content.constants.ts # Constantes do conteúdo da página
│   │   ├── home.context.tsx          # Contexto da entidade
│   │   ├── home.hook.ts              # Hook exclusivo da entidade
│   │   ├── home.interface.ts         # Interfaces e tipos da entidade
│   │   ├── home.constants.ts         # Constantes da entidade
│   │   ├── home.utils.ts             # Utilitários da entidade
│   │   ├── styles.module.css         # Estilos BEM do bloco raiz (ex: .home)
│   │   └── components/               # Componentes usados SOMENTE nesta entidade
│   │       └── Hero/
│   │           ├── index.tsx
│   │           ├── hero.interface.ts
│   │           ├── hero.constants.ts
│   │           └── styles.module.css # BEM: .hero, .hero__title, .hero__chip--active
│   ├── admin/
│   │   └── bot/
│   │       └── commands/             # Entidade: comandos do bot
│   │           ├── page.tsx
│   │           ├── commands.hook.ts
│   │           ├── commands.types.ts
│   │           ├── styles.module.css
│   │           └── components/
│   └── layout.tsx
│
├── shared/                           # Tudo GLOBAL — reutilizado entre entidades
│   ├── components/                   # Componentes globais (Button, Header, ui/)
│   │   └── Button/
│   │       ├── index.tsx
│   │       └── styles.module.css
│   ├── hooks/                        # Hooks globais
│   ├── services/                     # API / axios / entities
│   ├── utils/                        # Utilitários globais
│   ├── types/                        # Tipos de domínio compartilhados
│   ├── contexts/                     # Contextos globais
│   ├── lib/                          # Infra (db, auth helpers, etc.)
│   ├── typings/                      # Tipos auxiliares (paginação, DTOs)
│   └── styles/                       # SMACSS global (tokens, reset, states)
│
├── api/                              # Controllers internos
└── server/                           # Lógica server-side
```

### Regra de ouro: interno vs global

| Escopo                  | Onde fica                                 | Exemplo                          |
| ----------------------- | ----------------------------------------- | -------------------------------- |
| Usado só na entidade    | Dentro da pasta da entidade               | `home/components/Hero/`          |
| Usado em 2+ entidades   | `shared/`                                 | `shared/components/Header/`      |
| Hook de uma página      | `[entidade].hook.ts` na pasta da entidade | `home/home.hook.ts`              |
| Hook compartilhado      | `shared/hooks/`                           | `useAdminSession`                |
| Tipos da entidade       | `[entidade].interface.ts`                 | `home/home.interface.ts`         |
| Constantes da entidade  | `[entidade].constants.ts`                 | `home/home.constants.ts`         |
| Constantes de submódulo | `[modulo].constants.ts`                   | `home/home.content.constants.ts` |
| Tipos de domínio        | `shared/types/`                           | `shared/types/raffle.ts`         |

**Nunca** usar `src/pages/` separado de `src/app/`. A entidade vive co-locada à rota.

**Nunca** colocar componente exclusivo de uma entidade em `shared/components/`.

---

## Regras de Next.js

### `src/app/[entidade]/` — entidade co-locada à rota

Cada rota que representa uma entidade de negócio contém **tudo** que é exclusivo dela:

```tsx
// src/app/home/layout.tsx — shell client (Header, footer, provider)
'use client';

import styles from './styles.module.css';
import { HomeProvider } from './home.context';

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <HomeProvider>
      <div className={styles.home}>
        <Header />
        {children}
        <footer className={styles.home__footer}>…</footer>
      </div>
    </HomeProvider>
  );
}
```

```tsx
// src/app/home/page.tsx — Server Component (sem 'use client')
import { HomeContent } from './home.content';

export default function HomePage() {
  return <HomeContent />;
}
```

```tsx
// src/app/page.tsx — rota / (compõe layout + page da entidade)
import HomeLayout from './home/layout';
import HomePage from './home/page';

export default function RootPage() {
  return (
    <HomeLayout>
      <HomePage />
    </HomeLayout>
  );
}
```

### BEM + CSS Modules (obrigatório em entidades e shared)

```tsx
// src/app/home/home.content.tsx — conteúdo client
'use client';

import styles from './styles.module.css';
import { useHomeContext } from './home.context';
import { Hero } from './components/Hero';

export function HomeContent() {
  const { currentStreamer } = useHomeContext();
  return (
    <>
      <Hero currentStreamer={currentStreamer} />
    </>
  );
}
```

```css
/* src/app/home/styles.module.css — BEM + @apply Tailwind */
.home {
  @apply relative min-h-screen overflow-x-hidden bg-background;
}
.home__footer {
  @apply border-t border-outline-variant/30 py-8;
}
```

- **Bloco** = nome da entidade ou componente (`home`, `hero`, `creator-card`)
- **Elemento** = `bloco__elemento`
- **Modificador** = `bloco__elemento--modificador` ou `bloco--modificador`
- Arquivo sempre `styles.module.css` co-localizado — classes BEM com `@apply` das utilities Tailwind (nunca CSS cru nem Tailwind solto no JSX para layout visual)
- Tailwind inline permitido apenas em casos excepcionais (props de libs externas sem wrapper BEM)

### Diretiva `'use client'`

- `[entidade]/layout.tsx` → `'use client'` quando usa hooks, provider ou interatividade no shell
- `[entidade]/home.content.tsx` (ou equivalente) → `'use client'` para seções com hooks/contexto
- Arquivos auxiliares usam **ponto final**: `.hook.ts`, `.context.tsx`, `.content.tsx`, `.interface.ts`, `.constants.ts`, `.utils.ts`
- Componentes internos seguem kebab-case: `creators-section.interface.ts`, `creators-section.constants.ts`
- `page.tsx` → **nunca** `'use client'` — importa componentes client

### Pasta `src/app/api/` — ignorar completamente

Nunca gerar, modificar, importar ou referenciar arquivos dentro de `src/app/api/`.
Essa pasta é gerenciada separadamente e está fora do escopo desta conversa.

---

## Arquitetura de estilos — SMACSS + BEM + Tailwind

### Camada 1 — Estilos globais (`src/styles/`) — SMACSS puro

Organiza regras CSS que não pertencem a nenhum componente específico:

| Pasta     | Conteúdo                                                                          |
| --------- | --------------------------------------------------------------------------------- |
| `base/`   | Resets adicionais, `@font-face`, defaults de elemento (`h1`, `a`, etc.)           |
| `layout/` | Grid global, breakpoints, estrutura da página (não ligados a componentes)         |
| `state/`  | Classes globais de estado: `.is-loading`, `.is-error`, `.is-hidden`, `.is-active` |
| `theme/`  | CSS custom properties: `--color-primary`, `--radius-md`, tokens de design         |

```css
/* src/styles/theme/_tokens.css */
:root {
  --color-brand: #7c3aed;
  --color-brand-hover: #6d28d9;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

```css
/* src/styles/state/_states.css */
.is-loading {
  opacity: 0.6;
  pointer-events: none;
}
.is-hidden {
  display: none !important;
}
.is-active {
  /* sobrescrito por componentes via BEM modifier */
}
```

`src/styles/index.css` importa tudo em ordem SMACSS:

```css
/* src/styles/index.css */
@import './base/_reset.css';
@import './base/_typography.css';
@import './theme/_tokens.css';
@import './layout/_grid.css';
@import './state/_states.css';
```

### Camada 2 — Estilos de componentes (`.module.css`) — SMACSS adaptado + BEM

Cada componente em `src/components/layout/`, `src/components/modules/` e nos
componentes de feature em `src/pages/[feature]/components/` tem seu próprio
arquivo `.module.css` co-localizado.

A organização da pasta `src/components/` espelha as camadas SMACSS:

- `ui/` → camada **Base** (shadcn — atômicos, sem `.module.css` customizado)
- `layout/` → camada **Layout** (componentes estruturais)
- `modules/` → camada **Module** (componentes reutilizáveis compostos)

Componentes de feature em `src/pages/[feature]/components/` são a camada **Module**
restrita a essa feature.

**Estado (SMACSS State layer) em componentes** → tratado via modificadores BEM
(`--active`, `--disabled`, `--loading`) dentro do próprio `.module.css`, não em
arquivo global.

---

## Nomenclatura BEM nos arquivos `.module.css`

Padrão: `bloco__elemento--modificador`

```css
/* command-card.module.css */

/* Block */
.commandCard {
  @apply border border-border/40 rounded-lg p-4 transition-all;
}

/* Block modifier */
.commandCard--active {
  @apply border-purple-500/40 bg-purple-500/5;
}

.commandCard--disabled {
  @apply opacity-50 pointer-events-none;
}

/* Elements */
.commandCard__header {
  @apply flex items-center justify-between mb-2;
}

.commandCard__trigger {
  @apply font-mono text-sm font-medium text-foreground;
}

.commandCard__response {
  @apply text-xs text-muted-foreground truncate;
}

.commandCard__badge {
  @apply text-[10px] px-1.5 py-0.5 rounded-full border;
}

/* Element modifier */
.commandCard__badge--builtin {
  @apply bg-muted text-muted-foreground border-border;
}

.commandCard__badge--custom {
  @apply bg-purple-500/10 text-purple-400 border-purple-500/20;
}
```

### Regras de nomenclatura BEM

- **Block**: camelCase → `.commandCard`, `.filterBar`, `.rafflePanel`
- **Element**: `__` + camelCase → `.commandCard__header`, `.filterBar__chip`
- **Modifier**: `--` + camelCase → `.commandCard--active`, `.filterBar__chip--selected`
- Máximo de **um nível de elemento** — nunca `.block__element__subelement`
- Modificadores sempre acompanham o block ou element base (nunca sozinhos)

### Acesso no TSX — usar sempre notação de string para BEM

```tsx
// ✅ Correto
import styles from './command-card.module.css';

<div
  className={cn(
    styles['commandCard'],
    isActive && styles['commandCard--active'],
    isDisabled && styles['commandCard--disabled'],
    'relative' // Tailwind utilitário quando necessário
  )}
>
  <div className={styles['commandCard__header']}>
    <span className={styles['commandCard__trigger']}>{command.trigger}</span>
    <span
      className={cn(
        styles['commandCard__badge'],
        command.isBuiltin ? styles['commandCard__badge--builtin'] : styles['commandCard__badge--custom']
      )}
    >
      {command.isBuiltin ? 'Padrão' : 'Custom'}
    </span>
  </div>
</div>;
```

### BEM + Tailwind — quando usar cada um

| Situação                                                      | Usar                                     |
| ------------------------------------------------------------- | ---------------------------------------- |
| Estilo semântico do componente (estrutura, bloco, elemento)   | BEM no `.module.css`                     |
| Utilitários de layout, espaçamento, tipografia inline         | Tailwind no JSX                          |
| Estado visual do componente (ativo, desabilitado, carregando) | BEM modifier no `.module.css`            |
| Estado global de página (loading, error, hidden)              | Classe SMACSS State em `styles/state/`   |
| Variáveis de design (cores, bordas, raios)                    | CSS custom properties em `styles/theme/` |
| Estilos que precisam de `@apply` complexo                     | `.module.css` com BEM                    |

---

## Arquitetura Feature-Based (mantida do padrão original)

### `index.tsx` — somente JSX

```tsx
// ✅ src/pages/bot-commands/index.tsx
'use client';

import { useBotCommandsPage } from './bot-commands.hook';
import { CommandFilterBar } from './components/command-filter-bar';
import { CommandTable } from './components/command-table';

export function BotCommandsPage() {
  const {
    commands,
    filteredCommands,
    activeModule,
    activePermission,
    searchQuery,
    counts,
    handleModuleChange,
    handlePermissionChange,
    handleSearchChange,
    handleResetFilters,
  } = useBotCommandsPage();

  return (
    <div>
      <CommandFilterBar
        activeModule={activeModule}
        activePermission={activePermission}
        searchQuery={searchQuery}
        counts={counts}
        onModuleChange={handleModuleChange}
        onPermissionChange={handlePermissionChange}
        onSearchChange={handleSearchChange}
        onReset={handleResetFilters}
      />
      <CommandTable commands={filteredCommands} />
    </div>
  );
}
```

### `[feature].hook.ts` — toda a lógica

```ts
// ✅ src/pages/bot-commands/bot-commands.hook.ts
import { useState, useMemo } from 'react';
import { services } from '@services';
import type { BotCommand } from '@types/bot-command';

export function useBotCommandsPage() {
  const [commands, setCommands] = useState<BotCommand[]>([]);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [activePermission, setActivePermission] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCommands = useMemo(() => {
    return commands.filter((cmd) => {
      const matchesModule = !activeModule || cmd.module === activeModule;
      const matchesPermission = !activePermission || cmd.minPermission === activePermission;
      const matchesSearch =
        !searchQuery ||
        cmd.trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.response?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesModule && matchesPermission && matchesSearch;
    });
  }, [commands, activeModule, activePermission, searchQuery]);

  const handleModuleChange = (module: string | null) => setActiveModule(module);
  const handlePermissionChange = (permission: string | null) => setActivePermission(permission);
  const handleSearchChange = (query: string) => setSearchQuery(query);
  const handleResetFilters = () => {
    setActiveModule(null);
    setActivePermission(null);
    setSearchQuery('');
  };

  return {
    commands,
    filteredCommands,
    activeModule,
    activePermission,
    searchQuery,
    counts: { filtered: filteredCommands.length },
    handleModuleChange,
    handlePermissionChange,
    handleSearchChange,
    handleResetFilters,
  };
}
```

---

## Camada de Services (mantida do padrão original)

### `src/services/axios.ts`

```ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Erro ao realizar requisição';
    return Promise.reject(new Error(message));
  }
);

export default api;
```

> Note: em Next.js, variáveis de ambiente públicas usam prefixo `NEXT_PUBLIC_`.

### `src/services/paths.ts`

```ts
export const ENDPOINTS = {
  BotCommands: '/bot/commands',
  Raffles: '/raffles',
  Economy: '/economia',
} as const;
```

### `src/services/index.ts`

```ts
import { botCommands } from './entities/bot-commands.services';
import { raffles } from './entities/raffles.services';

export const services = { botCommands, raffles };
```

### `src/services/entities/[entity].services.ts`

```ts
import api from '@services/axios';
import { ENDPOINTS } from '@services/paths';
import type { BotCommand } from '@types/bot-command';
import type { PaginatedResponse, PaginationParams } from '@typings/pagination';

export const botCommands = {
  findAll: (params?: PaginationParams) =>
    api.get<PaginatedResponse<BotCommand>>(ENDPOINTS.BotCommands, { params }).then((r) => r.data),

  findOne: (id: string) => api.get<BotCommand>(`${ENDPOINTS.BotCommands}/${id}`).then((r) => r.data),

  create: (data: Partial<BotCommand>) => api.post<BotCommand>(ENDPOINTS.BotCommands, data).then((r) => r.data),

  update: (id: string, data: Partial<BotCommand>) =>
    api.put<BotCommand>(`${ENDPOINTS.BotCommands}/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`${ENDPOINTS.BotCommands}/${id}`).then((r) => r.data),
};
```

---

## Utilitários — Padrão Factory (mantido)

```ts
// src/utils/sort.ts
export const createSortComparator =
  (field: string, order: 'asc' | 'desc') => (a: Record<string, unknown>, b: Record<string, unknown>) => {
    const aVal = a[field];
    const bVal = b[field];
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  };

// src/utils/error.ts
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'Erro desconhecido';
};
```

---

## Tipagem

```ts
// src/types/bot-command.ts   → tipo de domínio
export interface BotCommand {
  id: string;
  trigger: string;
  response: string;
  module: 'canal' | 'quotes' | 'economia' | 'sorteios' | 'jogos' | 'custom';
  minPermission: 'all' | 'moderator' | 'streamer';
  isBuiltin: boolean;
  isActive: boolean;
  cooldown: number;
  useCount: number;
}

// src/typings/pagination.ts  → tipo auxiliar
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## Path aliases

```ts
// ✅ Sempre usar aliases
import { CommandCard } from '@components/modules/command-card';
import { useBotCommandsPage } from '@pages/bot-commands/bot-commands.hook';
import { services } from '@services';
import type { BotCommand } from '@types/bot-command';
import type { PaginationParams } from '@typings/pagination';
import { cn } from '@lib/utils';

// ❌ Nunca caminhos relativos longos
import { CommandCard } from '../../../components/modules/command-card';
```

Aliases configurados em `tsconfig.json` e `next.config.ts`:

```json
// tsconfig.json (paths)
{
  "@components/*": ["./src/components/*"],
  "@pages/*": ["./src/pages/*"],
  "@hooks/*": ["./src/hooks/*"],
  "@services": ["./src/services"],
  "@services/*": ["./src/services/*"],
  "@contexts/*": ["./src/contexts/*"],
  "@typings/*": ["./src/typings/*"],
  "@types/*": ["./src/types/*"],
  "@utils/*": ["./src/utils/*"],
  "@lib/*": ["./src/lib/*"],
  "@styles/*": ["./src/styles/*"]
}
```

---

## Regras gerais de código (mantidas + complementadas)

### Return early

```ts
// ❌
if (condition) {
  return true;
} else {
  return false;
}

// ✅
if (!condition) return false;
return true;
```

### Clean code

```ts
// ❌
return hasErrors ? false : true;

// ✅
return !hasErrors;
```

### Componentes React

```tsx
// ✅ Sempre função nomeada
export function CommandCard({ command }: CommandCardProps) { ... }

// ❌ Arrow function anônima exportada diretamente
export default ({ command }) => { ... }
```

### Hooks

```ts
// ✅ Sempre começam com "use"
export function useCommandFilters() { ... }
export function useBotCommandsPage() { ... }
```

### TypeScript

```ts
// ✅
import type { BotCommand } from '@types/bot-command';
const commands: BotCommand[] = [];

// ❌ Nunca any sem justificativa explícita no comentário
const data: any = {};
```

---

## Artefatos obrigatórios ao criar nova feature

Ao criar qualquer feature nova, gerar obrigatoriamente os quatro artefatos:

1. `src/pages/[feature]/index.tsx` — JSX com `'use client'`
2. `src/pages/[feature]/[feature].hook.ts` — lógica completa
3. `src/services/entities/[entity].services.ts` — serviço da entidade
4. `src/types/[entity].ts` — tipo de domínio

Ao criar qualquer componente novo em `src/components/`:

1. `src/components/[smacss-layer]/[component]/index.tsx`
2. `src/components/[smacss-layer]/[component]/[component].hook.ts` (se tiver lógica)
3. `src/components/[smacss-layer]/[component]/[component].module.css`

---

## Resumo — o que NUNCA fazer

| ❌ Proibido                                      | ✅ Correto                        |
| ------------------------------------------------ | --------------------------------- |
| Tocar `src/app/api/`                             | Ignorar completamente             |
| Lógica em `index.tsx`                            | Mover para `.hook.ts`             |
| `useState` / `useEffect` em `src/app/*/page.tsx` | Manter em Client Components       |
| Caminhos relativos longos                        | Usar path aliases                 |
| Nomes de classe CSS sem BEM                      | Seguir `block__element--modifier` |
| Estilos globais dentro de `.module.css`          | Mover para `src/styles/`          |
| `var` ou `let` desnecessário                     | Usar `const`                      |
| `any` sem justificativa                          | Tipar corretamente                |
| Arrow function anônima exportada                 | Função nomeada                    |
| Importar `@services` direto em `index.tsx`       | Importar só no hook               |

---

Confirme que entendeu os padrões e aguarde minha instrução sobre o que construir.
