'use client';

import {
  Car,
  Heart,
  LayoutDashboard,
  Package,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { brand } from '@config/brand';
import { DashboardShell } from '@components/dashboard';
import { BigWordmark, Logo, NewsletterForm, PageShell, Section, SiteFooter, SiteHeader } from '@components/layout';
import {
  BentoGrid,
  BodyTypeSelector,
  BrandCard,
  CategoryCarousel,
  ChipFilter,
  CTABanner,
  FeatureShowcase,
  FilterSidebar,
  ImageOverlayCard,
  MakeModelFilter,
  type MakeModelRow,
  RangeFilter,
  ResultsHeader,
  SearchPanel,
  StatCard,
  StatusBadge,
  StoreCard,
  VehicleCard,
  YearRangeFilter,
} from '@components/marketplace';
import {
  Avatar,
  AvatarFallback,
  DeviceFrame,
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CarouselControls,
  Checkbox,
  Chip,
  ChipGroup,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  EmptyState,
  Eyebrow,
  FeatureItem,
  Field,
  Heading,
  IconButton,
  ImagePlaceholder,
  Pagination,
  ProgressBars,
  RadioGroup,
  RadioItem,
  RangeSlider,
  Rating,
  SectionHeader,
  Select,
  SelectItem,
  Skeleton,
  Stat,
  StatGroup,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToastProvider,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from '@components/ui';
import { LISTING_STATUS, OPPORTUNITY_STATUS, STORE_STATUS, VEHICLE_STATUS } from '@app-types/status';
import type { BodyType } from '@app-types/vehicle';
import {
  fixtureBrands,
  fixtureMileageHistogram,
  fixturePriceHistogram,
  fixtureStores,
  fixtureVehicles,
} from '@fixtures';

import styles from './styles.module.css';

const TOC = [
  { href: '#tokens', label: 'Tokens' },
  { href: '#primitivos', label: 'Primitivos' },
  { href: '#contexto-escuro', label: 'Contexto escuro' },
  { href: '#layout', label: 'Layout' },
  { href: '#marketplace', label: 'Marketplace' },
  { href: '#dashboard', label: 'Dashboard' },
  { href: '#composicao-a', label: 'Composição A' },
  { href: '#composicao-b', label: 'Composição B' },
] as const;

const COLOR_TOKENS = [
  { name: 'accent', className: 'bg-accent' },
  { name: 'accent-hover', className: 'bg-accent-hover' },
  { name: 'accent-soft', className: 'bg-accent-soft' },
  { name: 'accent-strong', className: 'bg-accent-strong' },
  { name: 'accent-button', className: 'bg-accent-button' },
  { name: 'ink', className: 'bg-ink' },
  { name: 'ink-muted', className: 'bg-ink-muted' },
  { name: 'ink-subtle', className: 'bg-ink-subtle' },
  { name: 'bg', className: 'bg-bg' },
  { name: 'surface', className: 'bg-surface' },
  { name: 'surface-sunken', className: 'bg-surface-sunken' },
  { name: 'surface-raised', className: 'bg-surface-raised' },
  { name: 'border', className: 'bg-border' },
  { name: 'success-bg', className: 'bg-success-bg' },
  { name: 'warning-bg', className: 'bg-warning-bg' },
  { name: 'error-bg', className: 'bg-error-bg' },
  { name: 'info-bg', className: 'bg-info-bg' },
] as const;

const RADIUS_TOKENS = [
  { name: 'xs', className: 'rounded-xs' },
  { name: 'sm', className: 'rounded-sm' },
  { name: 'md', className: 'rounded-md' },
  { name: 'lg', className: 'rounded-lg' },
  { name: 'xl', className: 'rounded-xl' },
  { name: '2xl', className: 'rounded-2xl' },
  { name: 'full', className: 'rounded-full' },
] as const;

const MAKE_OPTIONS = fixtureBrands.map((item) => ({
  value: item.name,
  label: item.name,
}));

const MODEL_OPTIONS_BY_MAKE: Record<string, { value: string; label: string }[]> = {
  'Aurora Motors': [
    { value: 'Aurora 320', label: 'Aurora 320' },
    { value: 'Aurora GT', label: 'Aurora GT' },
  ],
  'Atlas Veículos': [
    { value: 'Atlas Cross', label: 'Atlas Cross' },
    { value: 'Atlas City', label: 'Atlas City' },
  ],
  NovaDrive: [
    { value: 'Nova E', label: 'Nova E' },
    { value: 'Nova Hatch', label: 'Nova Hatch' },
  ],
  'Serra Automóveis': [
    { value: 'Serra Pickup', label: 'Serra Pickup' },
    { value: 'Serra Van', label: 'Serra Van' },
  ],
  'Orla Motors': [
    { value: 'Orla Sedan', label: 'Orla Sedan' },
    { value: 'Orla SUV', label: 'Orla SUV' },
  ],
  'Campo & Cia': [
    { value: 'Campo Utility', label: 'Campo Utility' },
    { value: 'Campo Ranch', label: 'Campo Ranch' },
  ],
};

const CATEGORY_ITEMS = [
  { id: 'sedan', label: 'Sedãs', availableCount: 128 },
  { id: 'suv', label: 'SUVs', availableCount: 214 },
  { id: 'hatch', label: 'Hatches', availableCount: 96 },
  { id: 'pickup', label: 'Picapes', availableCount: 71 },
  { id: 'utility', label: 'Utilitários', availableCount: 43 },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'year-desc', label: 'Mais novos' },
];

const FUEL_OPTIONS = [
  { value: 'flex', label: 'Flex' },
  { value: 'gasoline', label: 'Gasolina' },
  { value: 'ethanol', label: 'Etanol' },
  { value: 'electric', label: 'Elétrico' },
  { value: 'hybrid', label: 'Híbrido' },
];

const DASHBOARD_NAV = [
  {
    href: '#dashboard',
    label: 'Visão geral',
    icon: <LayoutDashboard strokeWidth={1.5} />,
    active: true,
  },
  { href: '#dashboard', label: 'Estoque', icon: <Package strokeWidth={1.5} /> },
  { href: '#dashboard', label: 'Oportunidades', icon: <Users strokeWidth={1.5} /> },
  { href: '#dashboard', label: 'Loja', icon: <Store strokeWidth={1.5} /> },
  { href: '#dashboard', label: 'Configurações', icon: <Settings strokeWidth={1.5} /> },
];

function ToastDemoButton() {
  const { toast } = useToast();

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        toast({
          title: 'Anúncio publicado',
          description: 'Seu veículo já está visível no marketplace.',
          variant: 'success',
        });
      }}
    >
      Disparar toast
    </Button>
  );
}

function PrimitivesDemo({ dark }: { dark?: boolean }) {
  const [priceRange, setPriceRange] = useState<[number, number]>([40000, 180000]);
  const [page, setPage] = useState(2);
  const [chipValues, setChipValues] = useState<string[]>(['flex']);
  const [rating, setRating] = useState(4);

  return (
    <div className={styles.designSystem__stack}>
      <div className={styles.designSystem__stack}>
        <p className={styles.designSystem__subTitle}>Button</p>
        <div className={styles.designSystem__row}>
          <Button variant="primary">Primário</Button>
          <Button variant="dark">Escuro</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="outline-accent">Contorno accent</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="white">Branco</Button>
          <Button variant="primary" withArrow>
            Com seta
          </Button>
          <Button variant="primary" loading>
            Carregando
          </Button>
          <Button variant="primary" disabled>
            Desabilitado
          </Button>
        </div>
        <div className={styles.designSystem__row}>
          <Button size="sm">Pequeno</Button>
          <Button size="md">Médio</Button>
          <Button size="lg">Grande</Button>
        </div>
      </div>

      <div className={styles.designSystem__stack}>
        <p className={styles.designSystem__subTitle}>IconButton</p>
        <div className={styles.designSystem__row}>
          <IconButton
            variant="square-accent"
            size="md"
            aria-label="Favoritar"
            icon={<Heart className="size-5" strokeWidth={1.5} />}
          />
          <IconButton
            variant="circle-white"
            size="md"
            aria-label="Buscar"
            icon={<Search className="size-5" strokeWidth={1.5} />}
          />
          <IconButton
            variant="circle-dark"
            size="md"
            aria-label="Carrinho"
            icon={<ShoppingBag className="size-5" strokeWidth={1.5} />}
          />
          <IconButton
            variant="square-outline"
            size="sm"
            aria-label="Configurações"
            icon={<Settings className="size-4" strokeWidth={1.5} />}
          />
        </div>
      </div>

      <div className={styles.designSystem__stack}>
        <p className={styles.designSystem__subTitle}>Badge / Chip</p>
        <div className={styles.designSystem__row}>
          <Badge variant="neutral">Neutro</Badge>
          <Badge variant="soft">Suave</Badge>
          <Badge variant="count">12</Badge>
          <Badge variant="offer">Oferta</Badge>
          <Badge variant="dot">Com ponto</Badge>
        </div>
        <ChipGroup mode="multi" value={chipValues} onValueChange={setChipValues}>
          <Chip value="flex">Flex</Chip>
          <Chip value="auto">Automático</Chip>
          <Chip value="new">Novo</Chip>
        </ChipGroup>
      </div>

      <div className={styles.designSystem__stack}>
        <p className={styles.designSystem__subTitle}>Tabs</p>
        <Tabs defaultValue="used">
          <TabsList variant="pills">
            <TabsTrigger variant="pills" value="new">
              Novos
            </TabsTrigger>
            <TabsTrigger variant="pills" value="used">
              Usados
            </TabsTrigger>
          </TabsList>
          <TabsContent value="new">Estoque de veículos 0 km.</TabsContent>
          <TabsContent value="used">Seminovos com garantia da loja.</TabsContent>
        </Tabs>
        <Tabs defaultValue="overview">
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="overview">
              Visão geral
            </TabsTrigger>
            <TabsTrigger variant="underline" value="specs">
              Ficha técnica
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Resumo do anúncio.</TabsContent>
          <TabsContent value="specs">Motor, câmbio e consumo.</TabsContent>
        </Tabs>
      </div>

      <div className={styles.designSystem__grid}>
        <Field label="Nome" placeholder="Seu nome" variant="filled" />
        <Field label="Cidade" placeholder="São Paulo" variant="underline" />
        <Field label="E-mail" placeholder="voce@email.com" error="Informe um e-mail válido" />
        <Select label="Marca" placeholder="Selecione a marca" defaultValue={MAKE_OPTIONS[0]?.value}>
          {MAKE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div className={styles.designSystem__row}>
        <Checkbox label="Aceito receber ofertas" defaultChecked />
        <Checkbox label="Somente com foto" />
        <RadioGroup defaultValue="used" className="flex flex-row gap-4">
          <RadioItem value="new" label="Novo" />
          <RadioItem value="used" label="Usado" />
        </RadioGroup>
        <Switch label="Mostrar reservados" defaultChecked />
      </div>

      <div className={styles.designSystem__demoPanel}>
        <p className={styles.designSystem__subTitle}>RangeSlider + histograma</p>
        <RangeSlider
          min={0}
          max={300000}
          step={5000}
          value={priceRange}
          onValueChange={setPriceRange}
          histogram={fixturePriceHistogram}
          minLabel="Preço mín."
          maxLabel="Preço máx."
        />
      </div>

      <Pagination page={page} totalPages={8} onPageChange={setPage} />

      <div className={styles.designSystem__grid}>
        <Card>
          <CardHeader>
            <CardTitle>Card padrão</CardTitle>
            <CardDescription>Borda e sombra sutis.</CardDescription>
          </CardHeader>
          <CardContent>Conteúdo do card.</CardContent>
        </Card>
        <Card variant="sunken">
          <CardHeader>
            <CardTitle>Card sunken</CardTitle>
            <CardDescription>Fundo rebaixado.</CardDescription>
          </CardHeader>
          <CardContent>Ideal para agrupamentos densos.</CardContent>
        </Card>
        <Card variant="featured">
          <CardHeader>
            <CardTitle>Card featured</CardTitle>
            <CardDescription>Destaque com borda accent.</CardDescription>
          </CardHeader>
          <CardContent>Use em ofertas especiais.</CardContent>
        </Card>
      </div>

      <div className={styles.designSystem__stack}>
        <Eyebrow>Design system</Eyebrow>
        <Heading as="h2" secondary="secundário">
          Tipografia de seção
        </Heading>
        <SectionHeader
          eyebrow="Marketplace"
          title="Encontre o próximo carro"
          titleSecondary="com confiança"
          description={`Catálogo de lojistas parceiros do ${brand.name}.`}
          actions={
            <Button size="sm" withArrow>
              Explorar
            </Button>
          }
        />
      </div>

      <div className={styles.designSystem__row}>
        <Avatar>
          <AvatarFallback>MC</AvatarFallback>
        </Avatar>
        <Breadcrumb items={[{ label: 'Início', href: '#' }, { label: 'Comprar', href: '#' }, { label: 'SUVs' }]} />
        <Rating value={rating} onChange={setRating} />
        <ProgressBars count={4} activeIndex={1} />
        <CarouselControls />
      </div>

      <StatGroup>
        <Stat label="Anúncios" value="1.284" hint="+12% no mês" />
        <Stat label="Lojas" value="86" />
        <Stat label="Leads" value="342" hint="últimos 7 dias" />
      </StatGroup>

      <FeatureItem
        icon={<Shield className="size-5" strokeWidth={1.5} />}
        title="Lojas verificadas"
        description="Cada anúncio passa por validação básica de estoque e dados da loja."
      />

      <EmptyState
        icon={<Car className="size-8" strokeWidth={1.5} />}
        title="Nenhum veículo encontrado"
        description="Ajuste os filtros ou limpe a busca para ver mais resultados."
        action={
          <Button size="sm" variant="outline">
            Limpar filtros
          </Button>
        }
      />

      <div className={styles.designSystem__row}>
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <ImagePlaceholder aspectRatio="16/9" className="w-48" />
      </div>

      <div className={styles.designSystem__row}>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Abrir dialog
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Confirmar reserva</DialogTitle>
            <DialogDescription>O veículo ficará indisponível para outros compradores por 24 horas.</DialogDescription>
            <div className={styles.designSystem__row}>
              <Button size="sm">Confirmar</Button>
              <Button size="sm" variant="outline">
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Drawer>
          <DrawerTrigger asChild>
            <Button size="sm" variant="outline">
              Abrir drawer
            </Button>
          </DrawerTrigger>
          <DrawerContent side="right">
            <DrawerHeader>
              <DrawerTitle>Filtros rápidos</DrawerTitle>
            </DrawerHeader>
            <DrawerBody>
              <p className="text-sm text-text-muted">
                Drawer left/right para menus. Overlays inferiores usam BottomSheet.
              </p>
            </DrawerBody>
          </DrawerContent>
        </Drawer>

        <BottomSheet>
          <BottomSheetTrigger asChild>
            <Button size="sm" variant="outline">
              Abrir bottom sheet
            </Button>
          </BottomSheetTrigger>
          <BottomSheetContent height="content" snapPoints={['content', 'half']}>
            <BottomSheetHeader>
              <BottomSheetTitle>BottomSheet</BottomSheetTitle>
            </BottomSheetHeader>
            <BottomSheetBody>
              <p className="text-sm text-text-muted">
                Mobile-first: handle, drag-to-dismiss (body só com scrollTop 0), snapPoints,
                visualViewport para teclado e footer fixo.
              </p>
            </BottomSheetBody>
            <BottomSheetFooter>
              <Button size="sm" variant="primary" className="w-full">
                Aplicar
              </Button>
            </BottomSheetFooter>
          </BottomSheetContent>
        </BottomSheet>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost">
                Hover tooltip
              </Button>
            </TooltipTrigger>
            <TooltipContent>Dica contextual do design system</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {!dark ? <ToastDemoButton /> : null}
      </div>
    </div>
  );
}

export function DesignSystemView() {
  const [make, setMake] = useState<string>();
  const [bodyType, setBodyType] = useState<BodyType | null>(null);
  const [sort, setSort] = useState('relevance');
  const [priceFilter, setPriceFilter] = useState<[number, number]>([30000, 220000]);
  const [mileageFilter, setMileageFilter] = useState<[number, number]>([0, 120000]);
  const [yearFilter, setYearFilter] = useState<[number, number]>([2018, 2025]);
  const [fuelFilter, setFuelFilter] = useState<string[]>(['flex']);
  const [listingPage, setListingPage] = useState(1);
  const [makeModelRows, setMakeModelRows] = useState<MakeModelRow[]>([
    { id: 'row-1', make: 'Aurora Motors', models: ['Aurora 320'] },
  ]);

  const demoCatalog = useMemo(
    () =>
      fixtureBrands.map((item) => ({
        slug: item.name,
        name: item.name,
        models: (MODEL_OPTIONS_BY_MAKE[item.name] ?? []).map((option) => ({
          value: option.value,
          label: option.label,
        })),
      })),
    []
  );

  const listingVehicles = fixtureVehicles.filter((v) => v.listingStatus === 'published').slice(0, 4);

  return (
    <ToastProvider>
      <div className={styles.designSystem}>
        <nav className={styles.designSystem__toc} aria-label="Seções do design system">
          <div className={styles.designSystem__tocInner}>
            {TOC.map((item) => (
              <a key={item.href} href={item.href} className={styles.designSystem__tocLink}>
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <main className={styles.designSystem__main}>
          <header className={styles.designSystem__intro}>
            <Eyebrow>Documentação visual</Eyebrow>
            <h1 className={styles.designSystem__introTitle}>Design System — {brand.name}</h1>
            <p className={styles.designSystem__introLead}>
              Showcase interativo de tokens, primitivos, layout, marketplace e composições de referência. Uso interno —
              noindex.
            </p>
          </header>

          {/* 1. Tokens */}
          <section id="tokens" className={styles.designSystem__section}>
            <h2 className={styles.designSystem__sectionTitle}>Tokens</h2>
            <p className={styles.designSystem__sectionLead}>
              Cores via classes semânticas (sem hex no JSX), tipografia display→caption, raios e sombras.
            </p>

            <p className={styles.designSystem__subTitle}>Cores</p>
            <div className={styles.designSystem__swatchGrid}>
              {COLOR_TOKENS.map((token) => (
                <div key={token.name} className={styles.designSystem__swatch}>
                  <div className={`${styles.designSystem__swatchChip} ${token.className}`} />
                  <span className={styles.designSystem__swatchLabel}>{token.name}</span>
                </div>
              ))}
            </div>

            <p className={styles.designSystem__subTitle}>Tipografia</p>
            <div className={styles.designSystem__typeSample}>
              <p className={styles.designSystem__typeDisplay}>Display</p>
              <p className={styles.designSystem__typeH1}>Heading 1</p>
              <p className={styles.designSystem__typeH2}>Heading 2</p>
              <p className={styles.designSystem__typeH3}>Heading 3</p>
              <p className={styles.designSystem__typeH4}>Heading 4</p>
              <p className={styles.designSystem__typeBody}>
                Body — texto corrido para descrições de veículos e conteúdo de listagem.
              </p>
              <p className={styles.designSystem__typeSmall}>Small — metadados e legendas.</p>
              <p className={styles.designSystem__typeCaption}>Caption — rótulos auxiliares.</p>
            </div>

            <p className={styles.designSystem__subTitle}>Raios</p>
            <div className={styles.designSystem__radiusRow}>
              {RADIUS_TOKENS.map((token) => (
                <div key={token.name} className={`${styles.designSystem__radiusSample} ${token.className}`}>
                  {token.name}
                </div>
              ))}
            </div>

            <p className={styles.designSystem__subTitle}>Sombras</p>
            <div className={styles.designSystem__shadowRow}>
              <div className={`${styles.designSystem__shadowSample} shadow-card`}>shadow-card</div>
              <div className={`${styles.designSystem__shadowSample} shadow-popover`}>shadow-popover</div>
            </div>
          </section>

          {/* 2. Primitivos */}
          <section id="primitivos" className={styles.designSystem__section}>
            <h2 className={styles.designSystem__sectionTitle}>Primitivos UI</h2>
            <p className={styles.designSystem__sectionLead}>
              Variantes e estados dos componentes base em `@components/ui`.
            </p>
            <PrimitivesDemo />
          </section>

          {/* 3. Contexto escuro */}
          <section id="contexto-escuro" className={styles.designSystem__section}>
            <h2 className={styles.designSystem__sectionTitle}>Contexto escuro</h2>
            <p className={styles.designSystem__sectionLead}>
              Mesmos primitivos dentro de `Section` com `data-theme=dark`.
            </p>
            <Section theme="dark" spacing="compact" className="rounded-2xl px-5 py-8">
              <PrimitivesDemo dark />
            </Section>
          </section>

          {/* 4. Layout */}
          <section id="layout" className={styles.designSystem__section}>
            <h2 className={styles.designSystem__sectionTitle}>Layout</h2>
            <p className={styles.designSystem__sectionLead}>
              SiteHeader (floating / solid), SiteFooter, Logo, BigWordmark e NewsletterForm.
            </p>

            <div className={styles.designSystem__row}>
              <Logo size="sm" />
              <Logo size="md" />
              <Logo size="lg" />
            </div>

            <div className={styles.designSystem__demoPanel}>
              <BigWordmark />
            </div>

            <NewsletterForm
              onSubmit={() => {
                /* demo */
              }}
            />

            <p className={styles.designSystem__subTitle}>SiteHeader — floating</p>
            <div className={styles.designSystem__layoutPreviewFloating}>
              <SiteHeader variant="floating" overlayPosition="absolute" />
            </div>

            <p className={styles.designSystem__subTitle}>SiteHeader — solid</p>
            <div className={`${styles.designSystem__layoutPreview} ${styles.designSystem__layoutPreviewSolid}`}>
              <SiteHeader
                variant="solid"
                favoritesCount={2}
                showMessages={false}
                showUser={false}
                cityOptions={[
                  { value: '', label: 'Todo o Brasil' },
                  { value: 'sao-paulo-sp', label: 'São Paulo, SP' },
                ]}
                onCityChange={() => undefined}
              />
            </div>

            <div className={styles.designSystem__footerPreview}>
              <SiteFooter variant="compact" />
            </div>
          </section>

          {/* 5. Marketplace */}
          <section id="marketplace" className={styles.designSystem__section}>
            <h2 className={styles.designSystem__sectionTitle}>Marketplace</h2>
            <p className={styles.designSystem__sectionLead}>
              Componentes de busca, filtros, cards e blocos de marketing.
            </p>

            <Section theme="dark" spacing="compact" className="rounded-2xl px-5 py-8">
              <SearchPanel catalog={demoCatalog} />
            </Section>

            <BodyTypeSelector value={bodyType} onChange={setBodyType} />

            <ResultsHeader
              title="Comprar um carro"
              totalCount={fixtureVehicles.length}
              sort={sort}
              onSortChange={setSort}
              sortOptions={SORT_OPTIONS}
              bodyType={bodyType}
              onBodyTypeChange={setBodyType}
            />

            <div className={styles.designSystem__gridWide}>
              <FilterSidebar
                onClearAll={() => {
                  setPriceFilter([30000, 220000]);
                  setMileageFilter([0, 120000]);
                  setYearFilter([2018, 2025]);
                  setFuelFilter([]);
                  setMakeModelRows([{ id: 'row-1', make: '', models: [''] }]);
                }}
                clearAllLabel="Limpar tudo"
              >
                <MakeModelFilter
                  rows={makeModelRows}
                  makeOptions={MAKE_OPTIONS}
                  modelOptionsByMake={MODEL_OPTIONS_BY_MAKE}
                  onMakeChange={(rowId, nextMake) => {
                    setMakeModelRows((rows) =>
                      rows.map((row) => (row.id === rowId ? { ...row, make: nextMake, models: [''] } : row))
                    );
                  }}
                  onModelChange={(rowId, modelIndex, nextModel) => {
                    setMakeModelRows((rows) =>
                      rows.map((row) => {
                        if (row.id !== rowId) {
                          return row;
                        }

                        const models = [...row.models];
                        models[modelIndex] = nextModel;

                        return { ...row, models };
                      })
                    );
                  }}
                  onAddModel={(rowId) => {
                    setMakeModelRows((rows) =>
                      rows.map((row) => (row.id === rowId ? { ...row, models: [...row.models, ''] } : row))
                    );
                  }}
                  onRemoveModel={(rowId, modelIndex) => {
                    setMakeModelRows((rows) =>
                      rows.map((row) => {
                        if (row.id !== rowId) {
                          return row;
                        }

                        const models = row.models.filter((_, index) => index !== modelIndex);

                        return { ...row, models: models.length ? models : [''] };
                      })
                    );
                  }}
                  onRemoveRow={(rowId) => {
                    setMakeModelRows((rows) => rows.filter((row) => row.id !== rowId));
                  }}
                  onAddRow={() => {
                    setMakeModelRows((rows) => [...rows, { id: `row-${rows.length + 1}`, make: '', models: [''] }]);
                  }}
                  onClear={() => {
                    setMakeModelRows([{ id: 'row-1', make: '', models: [''] }]);
                  }}
                />
                <RangeFilter
                  title="Preço"
                  min={0}
                  max={300000}
                  step={5000}
                  value={priceFilter}
                  onValueChange={setPriceFilter}
                  histogram={fixturePriceHistogram}
                  minLabel="Mín."
                  maxLabel="Máx."
                  onClear={() => {
                    setPriceFilter([0, 300000]);
                  }}
                />
                <RangeFilter
                  title="Quilometragem"
                  min={0}
                  max={200000}
                  step={1000}
                  value={mileageFilter}
                  onValueChange={setMileageFilter}
                  histogram={fixtureMileageHistogram}
                  minLabel="Km mín."
                  maxLabel="Km máx."
                  onClear={() => {
                    setMileageFilter([0, 200000]);
                  }}
                />
                <YearRangeFilter
                  minYear={2015}
                  maxYear={2026}
                  value={yearFilter}
                  onValueChange={setYearFilter}
                  onClear={() => {
                    setYearFilter([2015, 2026]);
                  }}
                />
                <ChipFilter
                  title="Combustível"
                  options={FUEL_OPTIONS}
                  value={fuelFilter}
                  onValueChange={setFuelFilter}
                  onClear={() => {
                    setFuelFilter([]);
                  }}
                />
              </FilterSidebar>

              <div className={styles.designSystem__listingStack}>
                <p className={styles.designSystem__subTitle}>VehicleCard — grid</p>
                <div className={styles.designSystem__vehicleGrid}>
                  {fixtureVehicles.slice(0, 3).map((vehicle) => (
                    <VehicleCard key={vehicle.id} variant="grid" vehicle={vehicle} />
                  ))}
                  <VehicleCard variant="grid" loading />
                </div>

                <p className={styles.designSystem__subTitle}>VehicleCard — featured / reserved</p>
                <div className={styles.designSystem__vehicleGrid}>
                  {fixtureVehicles
                    .filter((vehicle) => vehicle.featured)
                    .slice(0, 2)
                    .map((vehicle) => (
                      <VehicleCard key={`feat-${vehicle.id}`} variant="featured" vehicle={vehicle} />
                    ))}
                </div>

                <p className={styles.designSystem__subTitle}>VehicleCard — listing</p>
                <div className={styles.designSystem__listingStack}>
                  {listingVehicles.map((vehicle) => (
                    <VehicleCard key={`list-${vehicle.id}`} variant="listing" vehicle={vehicle} />
                  ))}
                  <VehicleCard variant="listing" loading />
                </div>
              </div>
            </div>

            <CategoryCarousel items={CATEGORY_ITEMS} />

            <p className={styles.designSystem__subTitle}>StatusBadge — todos os status</p>
            <div className={styles.designSystem__statusGrid}>
              {Object.values(VEHICLE_STATUS).map((status) => (
                <StatusBadge key={`v-${status}`} kind="vehicle" status={status} />
              ))}
              {Object.values(LISTING_STATUS).map((status) => (
                <StatusBadge key={`l-${status}`} kind="listing" status={status} />
              ))}
              {Object.values(OPPORTUNITY_STATUS).map((status) => (
                <StatusBadge key={`o-${status}`} kind="opportunity" status={status} />
              ))}
              {Object.values(STORE_STATUS).map((status) => (
                <StatusBadge key={`s-${status}`} kind="store" status={status} />
              ))}
            </div>

            <p className={styles.designSystem__subTitle}>BrandCard / StatCard / Bento</p>
            <div className={styles.designSystem__brandGrid}>
              {fixtureBrands.slice(0, 3).map((item) => (
                <BrandCard key={item.id} name={item.name} initials={item.initials} vehicleCount={24} />
              ))}
              {fixtureStores.slice(0, 2).map((store) => (
                <StatCard
                  key={store.id}
                  label={store.city}
                  value={store.name}
                  hint={`${store.state} · ${store.logoInitials}`}
                />
              ))}
            </div>

            <BentoGrid>
              <ImageOverlayCard title="SUVs para a estrada" subtitle="Modelos com espaço e conforto" />
              <StatCard label="Lojas ativas" value="86" hint="em todo o Brasil" />
              <BrandCard name={fixtureBrands[0].name} initials={fixtureBrands[0].initials} />
              <ImageOverlayCard title="Elétricos" subtitle="Baixo custo por km" />
            </BentoGrid>

            <p className={styles.designSystem__subTitle}>StoreCard / DeviceFrame</p>
            <div className={styles.designSystem__grid}>
              {fixtureStores.slice(0, 2).map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
              <DeviceFrame ariaLabel="Demo DeviceFrame">
                <div className="p-3">
                  <VehicleCard variant="compact" vehicle={listingVehicles[0]} />
                </div>
              </DeviceFrame>
            </div>

            <CTABanner
              title={`Venda mais com o ${brand.name}`}
              description="Publique seu estoque, receba leads qualificados e acompanhe o funil da loja."
              rating={4.8}
              actionLabel="Começar agora"
            />

            <FeatureShowcase
              eyebrow="Diferenciais"
              title="Tudo que a loja precisa em um só lugar"
              description="Estoque, anúncios, oportunidades e reputação — pensado para o dia a dia do lojista brasileiro."
              actionLabel="Saiba mais"
              stats={[
                { label: 'Anúncios', value: '12k+', hint: 'ativos' },
                { label: 'Tempo médio', value: '48h', hint: 'até o lead' },
                { label: 'Satisfação', value: '4.8', hint: 'avaliação' },
              ]}
              gallery={[
                { id: 'g1', alt: 'Painel da loja' },
                { id: 'g2', alt: 'Listagem de veículos' },
                { id: 'g3', alt: 'Detalhe do anúncio' },
              ]}
            />
          </section>

          {/* 6. DashboardShell */}
          <section id="dashboard" className={styles.designSystem__section}>
            <h2 className={styles.designSystem__sectionTitle}>DashboardShell</h2>
            <p className={styles.designSystem__sectionLead}>
              Shell denso para áreas autenticadas — sidebar + topbar sóbrios, sem decoração da landing.
            </p>
            <div className={styles.designSystem__dashboardDemo}>
              <DashboardShell navItems={DASHBOARD_NAV} title="Visão geral" userName="Carlos Mendes">
                <div className={styles.designSystem__dashboardBody}>
                  <p>Bem-vindo ao painel do lojista.</p>
                  <div className={styles.designSystem__grid}>
                    <StatCard label="Em estoque" value="42" />
                    <StatCard label="Reservados" value="7" />
                    <StatCard label="Leads novos" value="15" hint="hoje" />
                  </div>
                </div>
              </DashboardShell>
            </div>
          </section>

          {/* 7. COMPOSIÇÃO A — Hero */}
          <section id="composicao-a" className={styles.designSystem__section}>
            <h2 className={styles.designSystem__sectionTitle}>Composição A — Hero</h2>
            <p className={styles.designSystem__sectionLead}>
              Fidelidade à referência A: PageShell / Section escura, ImagePlaceholder de fundo, SiteHeader floating,
              headline pt-BR e SearchPanel glass.
            </p>
            <div className={styles.designSystem__composeFrame}>
              <PageShell>
                <Section theme="dark" spacing="compact" className="!p-0">
                  <div className={styles.designSystem__heroCompose}>
                    <div className={styles.designSystem__heroBg} aria-hidden>
                      <ImagePlaceholder aspectRatio="16/9" />
                    </div>
                    <div className={styles.designSystem__heroOverlay} aria-hidden />
                    <SiteHeader variant="floating" overlayPosition="absolute" />
                    <div className={styles.designSystem__heroContent}>
                      <div className={styles.designSystem__heroCopy}>
                        <Eyebrow>FEITO PARA A PRÓXIMA VIAGEM</Eyebrow>
                        <h2 className={styles.designSystem__heroTitle}>Feito para uma aventura incrível</h2>
                      </div>
                      <SearchPanel catalog={demoCatalog} />
                    </div>
                  </div>
                </Section>
              </PageShell>
            </div>
          </section>

          {/* 8. COMPOSIÇÃO B — Listagem */}
          <section id="composicao-b" className={styles.designSystem__section}>
            <h2 className={styles.designSystem__sectionTitle}>Composição B — Listagem</h2>
            <p className={styles.designSystem__sectionLead}>
              Referência B (desktop/docs): SiteHeader solid, ResultsHeader, FilterSidebar + grid de VehicleCards
              listing + Pagination. No mobile real, filtros/ordenação usam BottomSheet.
            </p>
            <div className={`${styles.designSystem__composeFrame} ${styles.designSystem__listingCompose}`}>
              <SiteHeader variant="solid" favoritesCount={4} showMessages={false} showUser={false} />
              <div className={styles.designSystem__listingBody}>
                <FilterSidebar
                  onClearAll={() => {
                    setFuelFilter([]);
                  }}
                  clearAllLabel="Limpar"
                >
                  <ChipFilter
                    title="Marca e modelo"
                    options={MAKE_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    value={make ? [make] : []}
                    onValueChange={(values) => {
                      setMake(values[0]);
                    }}
                    onClear={() => {
                      setMake(undefined);
                    }}
                  />
                  <RangeFilter
                    title="Preço"
                    min={0}
                    max={300000}
                    step={5000}
                    value={priceFilter}
                    onValueChange={setPriceFilter}
                    histogram={fixturePriceHistogram}
                    onClear={() => {
                      setPriceFilter([0, 300000]);
                    }}
                  />
                  <YearRangeFilter minYear={2015} maxYear={2026} value={yearFilter} onValueChange={setYearFilter} />
                </FilterSidebar>

                <div className={styles.designSystem__listingResults}>
                  <ResultsHeader
                    title="Comprar um carro"
                    totalCount={248}
                    sort={sort}
                    onSortChange={setSort}
                    sortOptions={SORT_OPTIONS}
                    bodyType={bodyType}
                    onBodyTypeChange={setBodyType}
                  />
                  <div className={styles.designSystem__listingStack}>
                    {listingVehicles.map((vehicle) => (
                      <VehicleCard key={`compose-b-${vehicle.id}`} variant="listing" vehicle={vehicle} />
                    ))}
                  </div>
                  <Pagination page={listingPage} totalPages={12} onPageChange={setListingPage} />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ToastProvider>
  );
}
