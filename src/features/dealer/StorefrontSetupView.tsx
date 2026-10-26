'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react';

import type { MediaItem } from '@app-types/media';
import { MEDIA_PURPOSE } from '@app-types/media';
import {
  STOREFRONT_COVER_FOCUS,
  STOREFRONT_HERO_VARIANTS,
  STOREFRONT_PRIMARY_COLORS,
  type StorefrontCoverFocus,
  type StorefrontHeroVariant,
} from '@app-types/subscription';
import type { PublicStorefront } from '@app-types/vehicle';
import { getRootDomain, getSiteOrigin } from '@config/site';
import { AdminFormActionsSpacer, ConfirmDialog } from '@components/dashboard';
import { ImageUploader } from '@components/media';
import {
  Button,
  DeviceFrame,
  Field,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@components/ui';
import type { StorefrontSettingsRow, StoreRow } from '@lib/db';
import {
  discardStorefrontDraftAction,
  publishStorefrontSetupAction,
  saveStorefrontDraftAction,
} from '@server/onboarding/onboarding-actions';
import type { StorefrontDraftPayload } from '@server/onboarding/onboarding.validators';
import { buildStorefrontOrigin } from '@utils/tenant-host';
import { cn } from '@utils/cn';

import { StorefrontAbout } from '@features/storefront/components/StorefrontAbout';
import { StorefrontHeader } from '@features/storefront/components/StorefrontHeader';
import { StorefrontHero } from '@features/storefront/components/StorefrontHero';
import { storefrontBrandStyle } from '@features/storefront/lib/storefront-brand';
import { storefrontContent } from '@features/storefront/storefront.content';

import styles from './storefront-editor.module.css';

export type StorefrontSetupViewProps = {
  store: StoreRow;
  storefront: StorefrontSettingsRow | null;
};

type EditorStatus =
  | 'clean'
  | 'dirty'
  | 'saving'
  | 'draft_saved'
  | 'publishing'
  | 'published'
  | 'error';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
type MobilePane = 'edit' | 'preview';
type EditorTab = 'identidade' | 'aparencia' | 'comercial';

function isLocalHostUrl(value: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(value);
}

function urlToMediaItems(url: string | null | undefined, purpose: string): MediaItem[] {
  if (!url) {
    return [];
  }

  return [
    {
      id: `existing-${purpose}`,
      url,
      sortOrder: 0,
      isPrimary: true,
      status: 'ready',
    },
  ];
}

function mediaUrl(items: MediaItem[]): string {
  return items.find((item) => item.status !== 'error')?.url ?? '';
}

function parseDraft(raw: string | null | undefined): StorefrontDraftPayload | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StorefrontDraftPayload;
  } catch {
    return null;
  }
}

function buildPublishedSnapshot(
  store: StoreRow,
  storefront: StorefrontSettingsRow | null
): StorefrontDraftPayload {
  return {
    publicName: store.publicName,
    slug: store.slug,
    subdomain: store.subdomain ?? '',
    logoUrl: storefront?.logoUrl ?? '',
    coverImageUrl: storefront?.coverImageUrl ?? '',
    about: storefront?.about ?? store.institutionalInfo ?? '',
    tagline: storefront?.tagline ?? '',
    primaryColor: storefront?.primaryColor ?? STOREFRONT_PRIMARY_COLORS[0].value,
    heroVariant: storefront?.heroVariant === 'split' ? 'split' : 'integrated',
    coverFocus:
      storefront?.coverFocus === 'top' || storefront?.coverFocus === 'bottom'
        ? storefront.coverFocus
        : 'center',
    businessHoursJson: storefront?.businessHoursJson ?? '[]',
    socialInstagram: storefront?.socialInstagram ?? '',
    socialFacebook: storefront?.socialFacebook ?? '',
    whatsappNumber: storefront?.whatsappNumber ?? store.whatsapp ?? '',
    contactEmail: storefront?.contactEmail ?? store.email ?? '',
    contactPhone: storefront?.contactPhone ?? store.phone ?? '',
  };
}

function snapshotsEqual(a: StorefrontDraftPayload, b: StorefrontDraftPayload): boolean {
  return JSON.stringify(normalizeSnapshot(a)) === JSON.stringify(normalizeSnapshot(b));
}

function normalizeSnapshot(value: StorefrontDraftPayload): StorefrontDraftPayload {
  return {
    ...value,
    logoUrl: value.logoUrl || '',
    coverImageUrl: value.coverImageUrl || '',
    about: value.about || '',
    tagline: value.tagline || '',
    socialInstagram: value.socialInstagram || '',
    socialFacebook: value.socialFacebook || '',
    whatsappNumber: value.whatsappNumber || '',
    contactEmail: value.contactEmail || '',
    contactPhone: value.contactPhone || '',
    businessHoursJson: value.businessHoursJson || '[]',
  };
}

function statusLabel(status: EditorStatus): string {
  switch (status) {
    case 'clean':
      return 'Sem alterações';
    case 'dirty':
      return 'Alterações não publicadas';
    case 'saving':
      return 'Salvando…';
    case 'draft_saved':
      return 'Rascunho salvo';
    case 'publishing':
      return 'Publicando…';
    case 'published':
      return 'Publicado';
    case 'error':
      return 'Erro';
  }
}

function statusClass(status: EditorStatus): string {
  switch (status) {
    case 'dirty':
      return styles.editor__statusDirty;
    case 'saving':
      return styles.editor__statusSaving;
    case 'publishing':
      return styles.editor__statusPublishing;
    case 'draft_saved':
      return styles.editor__statusDraft;
    case 'published':
      return styles.editor__statusPublished;
    case 'error':
      return styles.editor__statusError;
    default:
      return '';
  }
}

function publicUrlPreview(
  slug: string,
  subdomain: string
): { path: string; host?: string; pathLabel: string; hostLabel?: string; isLocal: boolean } {
  const siteOrigin = getSiteOrigin();
  const root = getRootDomain();
  const path = `${siteOrigin}/lojas/${slug || '…'}`;
  const pathLabel = `/lojas/${slug || '…'}`;
  const host = subdomain ? buildStorefrontOrigin(subdomain, root) : undefined;
  const isLocal = isLocalHostUrl(path) || Boolean(host && isLocalHostUrl(host));

  return {
    path,
    host,
    pathLabel,
    hostLabel: host && !isLocalHostUrl(host) ? host.replace(/^https?:\/\//, '') : undefined,
    isLocal,
  };
}

export function StorefrontSetupView({ store, storefront }: StorefrontSetupViewProps) {
  const { toast } = useToast();
  const serverPublished = useMemo(
    () => buildPublishedSnapshot(store, storefront),
    [store, storefront]
  );
  const initialDraft = useMemo(
    () => parseDraft(storefront?.draftJson) ?? serverPublished,
    [storefront?.draftJson, serverPublished]
  );

  const [publishedBaseline, setPublishedBaseline] = useState(serverPublished);
  const [publicName, setPublicName] = useState(initialDraft.publicName);
  const [slug, setSlug] = useState(initialDraft.slug);
  const [subdomain, setSubdomain] = useState(initialDraft.subdomain);
  const [logoItems, setLogoItems] = useState<MediaItem[]>(() =>
    urlToMediaItems(initialDraft.logoUrl || null, 'logo')
  );
  const [coverItems, setCoverItems] = useState<MediaItem[]>(() =>
    urlToMediaItems(initialDraft.coverImageUrl || null, 'cover')
  );
  const [about, setAbout] = useState(initialDraft.about ?? '');
  const [tagline, setTagline] = useState(initialDraft.tagline ?? '');
  const [primaryColor, setPrimaryColor] = useState(initialDraft.primaryColor);
  const [heroVariant, setHeroVariant] = useState<StorefrontHeroVariant>(
    initialDraft.heroVariant
  );
  const [coverFocus, setCoverFocus] = useState<StorefrontCoverFocus>(initialDraft.coverFocus);
  const [hours, setHours] = useState(initialDraft.businessHoursJson);
  const [instagram, setInstagram] = useState(initialDraft.socialInstagram ?? '');
  const [facebook, setFacebook] = useState(initialDraft.socialFacebook ?? '');
  const [whatsapp, setWhatsapp] = useState(initialDraft.whatsappNumber ?? '');
  const [contactPhone, setContactPhone] = useState(initialDraft.contactPhone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<EditorStatus>(
    storefront?.draftJson ? 'draft_saved' : 'clean'
  );
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [mobilePane, setMobilePane] = useState<MobilePane>('edit');
  const [activeTab, setActiveTab] = useState<EditorTab>('identidade');
  const [pickMode, setPickMode] = useState(false);
  const [hasServerDraft, setHasServerDraft] = useState(Boolean(storefront?.draftJson));
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const coverSectionRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef<StorefrontDraftPayload>(initialDraft);

  const currentSnapshot = useMemo<StorefrontDraftPayload>(
    () => ({
      publicName,
      slug,
      subdomain,
      logoUrl: mediaUrl(logoItems),
      coverImageUrl: mediaUrl(coverItems),
      about,
      tagline,
      primaryColor,
      heroVariant,
      coverFocus,
      businessHoursJson: hours || '[]',
      socialInstagram: instagram,
      socialFacebook: facebook,
      whatsappNumber: whatsapp,
      contactEmail: store.email,
      contactPhone,
    }),
    [
      about,
      contactPhone,
      coverFocus,
      coverItems,
      facebook,
      heroVariant,
      hours,
      instagram,
      logoItems,
      primaryColor,
      publicName,
      slug,
      store.email,
      subdomain,
      tagline,
      whatsapp,
    ]
  );

  const isDirty = !snapshotsEqual(currentSnapshot, publishedBaseline);
  const addressChanged =
    currentSnapshot.slug !== publishedBaseline.slug ||
    currentSnapshot.subdomain !== publishedBaseline.subdomain;
  const busy = status === 'saving' || status === 'publishing';
  const uploading =
    logoItems.some((item) => item.status === 'uploading') ||
    coverItems.some((item) => item.status === 'uploading');

  useEffect(() => {
    if (status === 'saving' || status === 'publishing') {
      return;
    }

    if (isDirty) {
      if (status !== 'dirty') {
        setStatus('dirty');
      }
      return;
    }

    if (hasServerDraft && snapshotsEqual(currentSnapshot, lastSavedRef.current)) {
      if (status !== 'draft_saved') {
        setStatus('draft_saved');
      }
      return;
    }

    if (status === 'published') {
      return;
    }

    if (status !== 'clean') {
      setStatus('clean');
    }
  }, [currentSnapshot, hasServerDraft, isDirty, status]);

  useEffect(() => {
    if (!isDirty && !hasServerDraft) {
      return;
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasServerDraft, isDirty]);

  const previewStorefront = useMemo<PublicStorefront>(() => {
    let businessHours: PublicStorefront['businessHours'] = [];

    try {
      const parsed = JSON.parse(hours || '[]') as unknown;
      businessHours = Array.isArray(parsed) ? (parsed as PublicStorefront['businessHours']) : [];
    } catch {
      businessHours = [];
    }

    return {
      id: store.id,
      slug,
      name: publicName || store.publicName,
      city: store.city,
      state: store.state,
      neighborhood: store.neighborhood ?? undefined,
      vehicleCount: 0,
      verified: store.verified === 'true',
      subdomain: subdomain || null,
      logoUrl: mediaUrl(logoItems) || undefined,
      coverImageUrl: mediaUrl(coverItems) || undefined,
      tagline: tagline || undefined,
      about: about || undefined,
      primaryColor,
      heroVariant,
      coverFocus,
      whatsappNumber: whatsapp || undefined,
      contactPhone: contactPhone || undefined,
      contactEmail: store.email || undefined,
      socialInstagram: instagram || undefined,
      socialFacebook: facebook || undefined,
      businessHours,
      street: store.street ?? undefined,
      addressNumber: store.addressNumber ?? undefined,
      zipCode: store.zipCode ?? undefined,
      canonicalUrl: `/lojas/${slug}`,
      basePath: `/lojas/${slug}`,
    };
  }, [
    about,
    contactPhone,
    coverFocus,
    coverItems,
    facebook,
    heroVariant,
    hours,
    instagram,
    logoItems,
    primaryColor,
    publicName,
    slug,
    store,
    subdomain,
    tagline,
    whatsapp,
  ]);

  const urls = publicUrlPreview(slug, subdomain);
  const physicalAddress = [store.street, store.addressNumber, store.neighborhood, store.city, store.state]
    .filter(Boolean)
    .join(', ');

  function scrollPreviewTo(id: string) {
    const root = previewScrollRef.current;

    if (!root) {
      return;
    }

    const target = root.querySelector(`#${CSS.escape(id)}`);

    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 79.99rem)').matches) {
      setMobilePane('preview');
    }
  }

  function focusEditorField(fieldId: string) {
    window.requestAnimationFrame(() => {
      const el = document.getElementById(fieldId);

      if (el instanceof HTMLElement) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  function openEditorTarget(target: 'name' | 'cover' | 'about' | 'comercial') {
    setPickMode(false);
    setMobilePane('edit');

    if (target === 'comercial') {
      setActiveTab('comercial');
      focusEditorField('whatsapp');
      return;
    }

    setActiveTab('identidade');

    if (target === 'name') {
      focusEditorField('publicName');
      return;
    }

    if (target === 'about') {
      focusEditorField('about');
      return;
    }

    coverSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handlePreviewSurfaceClick(event: MouseEvent<HTMLDivElement>) {
    if (!pickMode) {
      return;
    }

    const hit = (event.target as HTMLElement).closest('[data-edit-target]');
    const target = hit?.getAttribute('data-edit-target');

    if (target === 'name' || target === 'cover' || target === 'about' || target === 'comercial') {
      event.preventDefault();
      event.stopPropagation();
      openEditorTarget(target);
    }
  }

  async function saveDraft() {
    if (uploading) {
      setError('Aguarde o término do upload das imagens');
      setStatus('error');
      return;
    }

    setStatus('saving');
    setError(null);

    const result = await saveStorefrontDraftAction({
      storeId: store.id,
      draft: currentSnapshot,
    });

    if (!result.ok) {
      setError(result.message);
      setStatus('error');
      toast({ title: 'Erro ao salvar rascunho', description: result.message, variant: 'error' });
      return;
    }

    lastSavedRef.current = currentSnapshot;
    setHasServerDraft(true);
    setStatus('draft_saved');
    toast({ title: 'Rascunho salvo', variant: 'success' });
  }

  async function publish() {
    if (uploading) {
      setError('Aguarde o término do upload das imagens');
      setStatus('error');
      return;
    }

    setStatus('publishing');
    setError(null);

    const result = await publishStorefrontSetupAction({
      storeId: store.id,
      ...currentSnapshot,
    });

    if (!result.ok) {
      setError(result.message);
      setStatus('error');
      toast({ title: 'Erro ao publicar', description: result.message, variant: 'error' });
      return;
    }

    lastSavedRef.current = currentSnapshot;
    setPublishedBaseline(currentSnapshot);
    setHasServerDraft(false);
    setStatus('published');
    toast({
      title: 'Vitrine publicada',
      description: 'As alterações já estão na vitrine pública.',
      variant: 'success',
    });
  }

  async function discard() {
    setError(null);

    if (hasServerDraft) {
      const result = await discardStorefrontDraftAction({ storeId: store.id });

      if (!result.ok) {
        setError(result.message);
        setStatus('error');
        toast({ title: 'Erro ao descartar', description: result.message, variant: 'error' });
        return;
      }
    }

    const baseline = publishedBaseline;
    setPublicName(baseline.publicName);
    setSlug(baseline.slug);
    setSubdomain(baseline.subdomain);
    setLogoItems(urlToMediaItems(baseline.logoUrl || null, 'logo'));
    setCoverItems(urlToMediaItems(baseline.coverImageUrl || null, 'cover'));
    setAbout(baseline.about ?? '');
    setTagline(baseline.tagline ?? '');
    setPrimaryColor(baseline.primaryColor);
    setHeroVariant(baseline.heroVariant);
    setCoverFocus(baseline.coverFocus);
    setHours(baseline.businessHoursJson);
    setInstagram(baseline.socialInstagram ?? '');
    setFacebook(baseline.socialFacebook ?? '');
    setWhatsapp(baseline.whatsappNumber ?? '');
    setContactPhone(baseline.contactPhone ?? '');
    lastSavedRef.current = baseline;
    setHasServerDraft(false);
    setStatus('clean');
    toast({ title: 'Alterações descartadas', variant: 'success' });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
  }

  const draftPreviewHref = '/vitrine?rascunho=1';
  const publishedPreviewHref = '/vitrine';
  const canOpenDraftPreview = hasServerDraft;
  const openPreviewHref = canOpenDraftPreview ? draftPreviewHref : publishedPreviewHref;

  const copy = storefrontContent;
  const stockHref = '#estoque';
  const homeHref = '#hero';
  const navItems = [
    { href: stockHref, label: copy.vehiclesNav },
    { href: '#sobre', label: copy.aboutNav },
  ];

  const previewInner = (
    <div
      style={storefrontBrandStyle(primaryColor)}
      className={cn(
        styles.editor__previewSurface,
        pickMode && styles.editor__previewSurfacePick
      )}
      data-preview-root
      onClick={handlePreviewSurfaceClick}
    >
      <div id="hero" className="relative">
        {pickMode ? (
          <>
            <button
              type="button"
              className={cn(styles.editor__hotspot, styles.editor__hotspotCover)}
              data-edit-target="cover"
              aria-label="Editar capa"
            />
            <button
              type="button"
              className={cn(styles.editor__hotspot, styles.editor__hotspotName)}
              data-edit-target="name"
              aria-label="Editar nome público"
            />
          </>
        ) : null}
        <StorefrontHero
          storefront={previewStorefront}
          headerSlot={
            <StorefrontHeader
              storefront={previewStorefront}
              homeHref={homeHref}
              navItems={navItems}
              whatsappHref={undefined}
              adminHref={undefined}
              behavior="overlay"
              sentinelId="storefront-hero-sentinel"
            />
          }
        />
      </div>
      <section id="estoque" className={styles.editor__catalogStub} aria-label="Catálogo">
        Catálogo de veículos — use &quot;Abrir vitrine&quot; para a prévia completa com estoque.
      </section>
      <div className="relative">
        {pickMode ? (
          <div className={styles.editor__aboutPickBar}>
            <button
              type="button"
              className={cn(styles.editor__pickToggle, styles.editor__pickToggleActive)}
              data-edit-target="about"
              onClick={(event) => {
                event.stopPropagation();
                openEditorTarget('about');
              }}
            >
              Editar descrição
            </button>
            <button
              type="button"
              className={cn(styles.editor__pickToggle, styles.editor__pickToggleActive)}
              data-edit-target="comercial"
              onClick={(event) => {
                event.stopPropagation();
                openEditorTarget('comercial');
              }}
            >
              Editar comercial
            </button>
          </div>
        ) : null}
        <StorefrontAbout storefront={previewStorefront} />
      </div>
    </div>
  );

  const actions = (
    <>
      <span
        className={cn(styles.editor__status, styles.editor__footerStatus, statusClass(status))}
        role="status"
      >
        {statusLabel(status)}
      </span>
      <AdminFormActionsSpacer />
      {(isDirty || hasServerDraft) && status !== 'clean' ? (
        <ConfirmDialog
          title="Descartar alterações?"
          description="O rascunho salvo e as edições locais voltarão à configuração publicada."
          confirmLabel="Descartar"
          tone="danger"
          action={() => discard()}
          trigger={
            <Button type="button" variant="ghost" disabled={busy}>
              Descartar
            </Button>
          }
        />
      ) : null}
      <Button
        type="button"
        variant="outline-accent"
        disabled={
          busy ||
          uploading ||
          (!isDirty && hasServerDraft && snapshotsEqual(currentSnapshot, lastSavedRef.current))
        }
        onClick={() => void saveDraft()}
      >
        {status === 'saving' ? 'Salvando…' : 'Salvar rascunho'}
      </Button>
      <Button type="button" variant="outline" asChild>
        <a href={openPreviewHref} target="_blank" rel="noopener noreferrer">
          {canOpenDraftPreview ? 'Abrir rascunho' : 'Abrir vitrine'}
        </a>
      </Button>
      {addressChanged ? (
        <ConfirmDialog
          title="Publicar com novo endereço?"
          description="Slug ou subdomínio mudaram. Links antigos podem ser redirecionados. A vitrine pública será atualizada."
          confirmLabel="Publicar"
          action={() => publish()}
          trigger={
            <Button type="button" disabled={busy || uploading}>
              {status === 'publishing' ? 'Publicando…' : 'Publicar alterações'}
            </Button>
          }
        />
      ) : (
        <Button
          type="button"
          disabled={busy || uploading || (!isDirty && !hasServerDraft)}
          onClick={() => void publish()}
        >
          {status === 'publishing' ? 'Publicando…' : 'Publicar alterações'}
        </Button>
      )}
    </>
  );

  return (
    <div className={styles.editor}>
      <header className={styles.editor__topBar}>
        <div className={styles.editor__topBarCopy}>
          <h1 className={styles.editor__topBarTitle}>Personalizar vitrine</h1>
          <p className={styles.editor__topBarDesc}>
            Identidade, aparência e dados comerciais — o preview usa os componentes reais.
          </p>
        </div>
        <div className={styles.editor__topBarMeta}>
          <span className={cn(styles.editor__status, statusClass(status))} role="status">
            {statusLabel(status)}
          </span>
          <p className={styles.editor__publicUrl} title={urls.isLocal ? undefined : urls.path}>
            {urls.isLocal ? (
              <>
                Endereço público:{' '}
                <span className={styles.editor__publicUrlStrong}>{urls.pathLabel}</span>
                {subdomain ? (
                  <>
                    {' '}
                    · subdomínio <span className={styles.editor__publicUrlStrong}>{subdomain}</span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <span className={styles.editor__publicUrlStrong}>
                  {urls.hostLabel ?? urls.path.replace(/^https?:\/\//, '')}
                </span>
              </>
            )}
          </p>
        </div>
      </header>

      <div className={styles.editor__mobileToggle} role="group" aria-label="Painel mobile">
        <button
          type="button"
          className={cn(
            styles.editor__mobileChip,
            mobilePane === 'edit' && styles.editor__mobileChipActive
          )}
          onClick={() => setMobilePane('edit')}
        >
          Editar
        </button>
        <button
          type="button"
          className={cn(
            styles.editor__mobileChip,
            mobilePane === 'preview' && styles.editor__mobileChipActive
          )}
          onClick={() => setMobilePane('preview')}
        >
          Visualizar
        </button>
      </div>

      <div className={styles.editor__workspace}>
        <form
          className={cn(
            styles.editor__form,
            mobilePane === 'preview' && styles.editor__paneHiddenMobile
          )}
          onSubmit={onSubmit}
        >
          {error ? <p className={styles.editor__alert}>{error}</p> : null}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EditorTab)}>
            <TabsList>
              <TabsTrigger value="identidade">Identidade</TabsTrigger>
              <TabsTrigger value="aparencia">Aparência</TabsTrigger>
              <TabsTrigger value="comercial">Comercial</TabsTrigger>
            </TabsList>

            <TabsContent value="identidade" className={styles.editor__tabBody}>
              <Field
                label="Nome público"
                name="publicName"
                id="publicName"
                required
                value={publicName}
                onChange={(e) => setPublicName(e.target.value)}
                disabled={busy}
              />
              <Field
                label="Tagline"
                name="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                disabled={busy}
              />
              <label className={styles.editor__label} htmlFor="about">
                Descrição
              </label>
              <textarea
                id="about"
                className={styles.editor__textarea}
                rows={5}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                disabled={busy}
              />
              <ImageUploader
                storeId={store.id}
                purpose={MEDIA_PURPOSE.STORE_LOGO}
                value={logoItems}
                onChange={setLogoItems}
                maxFiles={1}
                entityType="store"
                entityId={store.id}
                label="Logotipo"
                variant="logo"
                disabled={busy}
              />
              <div ref={coverSectionRef}>
                <ImageUploader
                  storeId={store.id}
                  purpose={MEDIA_PURPOSE.STORE_COVER}
                  value={coverItems}
                  onChange={setCoverItems}
                  maxFiles={1}
                  entityType="store"
                  entityId={store.id}
                  label="Capa"
                  variant="cover"
                  disabled={busy}
                />
                {mediaUrl(coverItems) ? (
                  <fieldset className={cn(styles.editor__fieldset, styles.editor__coverFocusInline)}>
                    <legend className={styles.editor__legend}>Enquadramento da capa</legend>
                    <div className={styles.editor__colorList}>
                      {STOREFRONT_COVER_FOCUS.map((focus) => {
                        const active = coverFocus === focus.id;

                        return (
                          <label
                            key={focus.id}
                            className={cn(
                              styles.editor__colorOption,
                              active && styles.editor__colorOptionActive
                            )}
                          >
                            <input
                              type="radio"
                              name="coverFocusInline"
                              value={focus.id}
                              className="sr-only"
                              checked={active}
                              onChange={() => setCoverFocus(focus.id)}
                              disabled={busy}
                            />
                            {focus.label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}
              </div>

              <details className={styles.editor__addressDetails}>
                <summary className={styles.editor__addressSummary}>Endereço da vitrine</summary>
                <div className={styles.editor__addressBody}>
                  <p className="text-xs text-text-muted">
                    Alterar slug ou subdomínio exige publicação e pode afetar links existentes.
                  </p>
                  <div className={styles.editor__formGrid}>
                    <Field
                      label="Slug"
                      name="slug"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      disabled={busy}
                    />
                    <Field
                      label="Subdomínio"
                      name="subdomain"
                      required
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div className={styles.editor__addressHint}>
                    {!urls.isLocal ? (
                      <>
                        <p>
                          Marketplace:{' '}
                          <span className={styles.editor__addressUrl}>{urls.path}</span>
                        </p>
                        {urls.host ? (
                          <p className="mt-1">
                            Subdomínio: <span className={styles.editor__addressUrl}>{urls.host}</span>
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p>
                        Em produção a vitrine ficará em{' '}
                        <span className={styles.editor__addressUrl}>{urls.pathLabel}</span>
                        {subdomain ? (
                          <>
                            {' '}
                            e no subdomínio{' '}
                            <span className={styles.editor__addressUrl}>{subdomain}</span>
                          </>
                        ) : null}
                        .
                      </p>
                    )}
                    {addressChanged ? (
                      <p className="mt-2 text-warning-fg">
                        Ao publicar, o endereço antigo receberá redirecionamento quando o slug mudar.
                      </p>
                    ) : null}
                  </div>
                </div>
              </details>
            </TabsContent>

            <TabsContent value="aparencia" className={styles.editor__tabBody}>
              <fieldset className={styles.editor__fieldset}>
                <legend className={styles.editor__legend}>Cor principal</legend>
                <div className={styles.editor__colorList}>
                  {STOREFRONT_PRIMARY_COLORS.map((color) => {
                    const active = primaryColor.toLowerCase() === color.value.toLowerCase();

                    return (
                      <label
                        key={color.id}
                        className={cn(
                          styles.editor__colorOption,
                          active && styles.editor__colorOptionActive
                        )}
                      >
                        <input
                          type="radio"
                          name="primaryColor"
                          value={color.value}
                          className="sr-only"
                          checked={active}
                          onChange={() => setPrimaryColor(color.value)}
                          disabled={busy}
                        />
                        <span
                          className={styles.editor__swatch}
                          style={{ backgroundColor: color.value }}
                          aria-hidden
                        />
                        {color.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className={styles.editor__fieldset}>
                <legend className={styles.editor__legend}>Modelo de hero</legend>
                <div className={styles.editor__heroList}>
                  {STOREFRONT_HERO_VARIANTS.map((variant) => {
                    const active = heroVariant === variant.id;

                    return (
                      <label
                        key={variant.id}
                        className={cn(
                          styles.editor__heroOption,
                          active && styles.editor__heroOptionActive
                        )}
                      >
                        <input
                          type="radio"
                          name="heroVariant"
                          value={variant.id}
                          className="sr-only"
                          checked={active}
                          onChange={() => setHeroVariant(variant.id)}
                          disabled={busy}
                        />
                        <span>
                          <strong>{variant.label}</strong>
                          <span className={styles.editor__heroHint}>{variant.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className={styles.editor__fieldset}>
                <legend className={styles.editor__legend}>Enquadramento da capa</legend>
                <div className={styles.editor__colorList}>
                  {STOREFRONT_COVER_FOCUS.map((focus) => {
                    const active = coverFocus === focus.id;

                    return (
                      <label
                        key={focus.id}
                        className={cn(
                          styles.editor__colorOption,
                          active && styles.editor__colorOptionActive
                        )}
                      >
                        <input
                          type="radio"
                          name="coverFocus"
                          value={focus.id}
                          className="sr-only"
                          checked={active}
                          onChange={() => setCoverFocus(focus.id)}
                          disabled={busy}
                        />
                        {focus.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </TabsContent>

            <TabsContent value="comercial" className={styles.editor__tabBody}>
              <div className={styles.editor__formGrid}>
                <Field
                  id="whatsapp"
                  label="WhatsApp"
                  name="whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  disabled={busy}
                />
                <Field
                  label="Telefone"
                  name="contactPhone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  disabled={busy}
                />
                <Field
                  label="Instagram"
                  name="instagram"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  disabled={busy}
                />
                <Field
                  label="Facebook"
                  name="facebook"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  disabled={busy}
                />
              </div>
              {physicalAddress ? (
                <p className={styles.editor__physicalAddress}>
                  Endereço físico da loja (somente leitura): {physicalAddress}
                </p>
              ) : null}
              <label className={styles.editor__label} htmlFor="hours">
                Horários (JSON)
              </label>
              <textarea
                id="hours"
                className={styles.editor__textarea}
                rows={3}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                disabled={busy}
                placeholder='[{"day":"seg-sex","open":"09:00","close":"18:00"}]'
              />
            </TabsContent>
          </Tabs>
        </form>

        <aside
          className={cn(
            styles.editor__preview,
            mobilePane === 'edit' && styles.editor__paneHiddenMobile,
            mobilePane === 'preview' && styles.editor__paneVisibleMobile
          )}
          aria-label="Pré-visualização da vitrine"
        >
          <div className={styles.editor__previewHead}>
            <p className={styles.editor__previewTitle}>Pré-visualização</p>
            <div className={styles.editor__previewTools}>
              <div className={styles.editor__anchors} role="group" aria-label="Seções">
                <button
                  type="button"
                  className={styles.editor__anchor}
                  onClick={() => scrollPreviewTo('hero')}
                >
                  Hero
                </button>
                <button
                  type="button"
                  className={styles.editor__anchor}
                  onClick={() => scrollPreviewTo('estoque')}
                >
                  Catálogo
                </button>
                <button
                  type="button"
                  className={styles.editor__anchor}
                  onClick={() => scrollPreviewTo('sobre')}
                >
                  Sobre
                </button>
              </div>
              <button
                type="button"
                className={cn(
                  styles.editor__pickToggle,
                  pickMode && styles.editor__pickToggleActive
                )}
                aria-pressed={pickMode}
                onClick={() => setPickMode((current) => !current)}
              >
                {pickMode ? 'Selecionando…' : 'Selecionar'}
              </button>
              <div className={styles.editor__deviceToggle} role="group" aria-label="Dispositivo">
                {(
                  [
                    ['desktop', 'Desktop'],
                    ['tablet', 'Tablet'],
                    ['mobile', 'Mobile'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      styles.editor__deviceChip,
                      previewDevice === id && styles.editor__deviceChipActive
                    )}
                    onClick={() => setPreviewDevice(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.editor__previewScroll} ref={previewScrollRef}>
            {previewDevice === 'mobile' ? (
              <div className={styles.editor__previewFrameMobile}>
                <DeviceFrame ariaLabel="Preview mobile da vitrine">{previewInner}</DeviceFrame>
              </div>
            ) : (
              <div
                className={cn(
                  styles.editor__previewFrame,
                  previewDevice === 'tablet'
                    ? styles.editor__previewFrameTablet
                    : styles.editor__previewFrameDesktop
                )}
              >
                {previewInner}
              </div>
            )}
          </div>
          <p className={styles.editor__previewHint}>
            {pickMode
              ? 'Clique em nome, capa ou sobre para abrir o campo correspondente. Desative Selecionar para navegar normalmente.'
              : 'O preview reflete o rascunho local. Publique para atualizar a vitrine pública.'}
          </p>
        </aside>
      </div>

      <footer className={styles.editor__footer}>{actions}</footer>
    </div>
  );
}
