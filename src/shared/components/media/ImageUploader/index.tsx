'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Star, Trash2, Upload } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type DragEvent,
} from 'react';

import type { MediaItem, MediaPurpose } from '@app-types/media';
import { MEDIA_PURPOSE } from '@app-types/media';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  IconButton,
  useToast,
} from '@components/ui';
import { deleteMediaAssetAction, uploadMediaAction } from '@server/media/media-actions';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

const DROP_ANIMATION: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.45',
      },
    },
  }),
};

const ACCEPT = 'image/jpeg,image/png,image/webp';

const CLIENT_MAX_BYTES: Record<MediaPurpose, number> = {
  [MEDIA_PURPOSE.VEHICLE_PHOTO]: 8 * 1024 * 1024,
  [MEDIA_PURPOSE.STORE_LOGO]: 2 * 1024 * 1024,
  [MEDIA_PURPOSE.STORE_COVER]: 8 * 1024 * 1024,
};

export type ImageUploaderVariant = 'default' | 'logo' | 'cover' | 'gallery';

export type ImageUploaderProps = {
  storeId: string;
  purpose: MediaPurpose;
  value: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  entityType?: string;
  entityId?: string;
  label?: string;
  className?: string;
  /**
   * `logo` / `cover`: dropzone só quando vazio; com imagem, miniatura + substituir/remover.
   * `gallery`: thumbs + preview grande + dropzone textual.
   */
  variant?: ImageUploaderVariant;
};

function createLocalId(): string {
  return `local-${crypto.randomUUID()}`;
}

function isAllowedFile(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
}

function mediaSrc(item: MediaItem): string {
  return item.detailUrl || item.previewUrl || item.cardUrl || item.url;
}

function mediaThumbSrc(item: MediaItem): string {
  return item.previewUrl || item.cardUrl || item.url;
}

type SortableThumbProps = {
  item: MediaItem;
  index: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onRemove: () => void;
};

function SortableThumb({
  item,
  index,
  selected,
  disabled,
  onSelect,
  onRemove,
}: SortableThumbProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const src = mediaThumbSrc(item);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        styles.uploader__item,
        styles.uploader__itemGallery,
        item.isPrimary && styles.uploader__itemPrimary,
        selected && styles.uploader__itemSelected,
        isDragging && styles.uploader__itemDragging
      )}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        className={styles.uploader__thumbHit}
        aria-label={`Selecionar foto ${index + 1}. Segure e arraste para reordenar.`}
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => {
          if (!isDragging) {
            onSelect();
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={item.alt || `Foto ${index + 1}`}
          className={styles.uploader__thumb}
          draggable={false}
        />
        <span className={styles.uploader__dragHandle} aria-hidden>
          <GripVertical className="size-3.5" strokeWidth={1.5} />
        </span>
      </button>
      {item.isPrimary ? <span className={styles.uploader__badge}>Principal</span> : null}
      {item.status === 'uploading' ? (
        <div className={styles.uploader__progress} aria-hidden>
          <div
            className={styles.uploader__progressBar}
            style={{ width: `${item.progress ?? 10}%` }}
          />
        </div>
      ) : null}
      <div className={styles.uploader__overlay}>
        <IconButton
          type="button"
          size="sm"
          variant="circle-dark"
          className={styles.uploader__overlayBtn}
          aria-label={`Remover foto ${index + 1}`}
          disabled={disabled}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemove()}
          icon={<Trash2 className="size-3.5" strokeWidth={1.5} />}
        />
      </div>
    </li>
  );
}

function GalleryThumbPreview({ item, index }: { item: MediaItem; index: number }) {
  const src = mediaThumbSrc(item);

  return (
    <div
      className={cn(
        styles.uploader__item,
        styles.uploader__itemGallery,
        styles.uploader__itemOverlay
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={item.alt || `Foto ${index + 1}`}
        className={styles.uploader__thumb}
        draggable={false}
      />
      {item.isPrimary ? <span className={styles.uploader__badge}>Principal</span> : null}
      <span className={styles.uploader__dragHandle} aria-hidden>
        <GripVertical className="size-3.5" strokeWidth={1.5} />
      </span>
    </div>
  );
}

export function ImageUploader({
  storeId,
  purpose,
  value,
  onChange,
  maxFiles = purpose === MEDIA_PURPOSE.VEHICLE_PHOTO ? 20 : 1,
  disabled = false,
  entityType,
  entityId,
  label = 'Imagens',
  className,
  variant = 'default',
}: ImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const { toast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSortId, setActiveSortId] = useState<string | null>(null);
  const single = maxFiles === 1;
  const sortSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
  const compact = variant === 'logo' || variant === 'cover';
  const gallery = variant === 'gallery';
  const readyItem = value.find((item) => item.status !== 'error');
  const readyCount = value.filter((item) => item.status === 'ready').length;
  const showSecondaryDropzone = gallery && value.length > 0 && value.length < maxFiles;
  const showDropzone =
    ((!compact || !readyItem) && !(gallery && value.length > 0)) || false;
  const maxMb = Math.round(CLIENT_MAX_BYTES[purpose] / (1024 * 1024));
  const lightboxItem = lightboxId ? value.find((item) => item.id === lightboxId) : null;

  const selectedItem =
    value.find((item) => item.id === selectedId) ??
    value.find((item) => item.isPrimary) ??
    value[0] ??
    null;
  const selectedIndex = selectedItem
    ? value.findIndex((item) => item.id === selectedItem.id)
    : -1;

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    if (!value.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, value]);

  function commit(next: MediaItem[]) {
    valueRef.current = next;
    onChange(next);
  }

  function updateItem(id: string, patch: Partial<MediaItem>) {
    commit(valueRef.current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function uploadFile(file: File, localId: string) {
    updateItem(localId, { status: 'uploading', progress: 15, errorMessage: undefined });

    const formData = new FormData();
    formData.set('storeId', storeId);
    formData.set('purpose', purpose);
    formData.set('file', file);

    if (entityType) {
      formData.set('entityType', entityType);
    }

    if (entityId) {
      formData.set('entityId', entityId);
    }

    updateItem(localId, { progress: 45 });

    const result = await uploadMediaAction(formData);

    if (!result.ok) {
      updateItem(localId, {
        status: 'error',
        progress: 0,
        errorMessage: result.message,
      });
      toast({ title: 'Falha no upload', description: result.message, variant: 'error' });
      return;
    }

    updateItem(localId, {
      id: result.data.assetId,
      url: result.data.url,
      cardUrl: result.data.cardUrl,
      detailUrl: result.data.detailUrl,
      storageKey: result.data.storageKey,
      width: result.data.width,
      height: result.data.height,
      mimeType: result.data.mimeType,
      status: 'ready',
      progress: 100,
      errorMessage: undefined,
    });
    setSelectedId(result.data.assetId);
  }

  async function enqueueFiles(files: FileList | File[]) {
    if (disabled) {
      return;
    }

    const list = Array.from(files);
    const remaining = maxFiles - valueRef.current.filter((item) => item.status !== 'error').length;

    if (remaining <= 0) {
      toast({ title: `Limite de ${maxFiles} imagem(ns)`, variant: 'error' });
      return;
    }

    const accepted = list.slice(0, remaining);
    const nextItems: MediaItem[] = [...valueRef.current];

    for (const file of accepted) {
      if (!isAllowedFile(file)) {
        toast({ title: `${file.name}: formato inválido`, variant: 'error' });
        continue;
      }

      if (file.size > CLIENT_MAX_BYTES[purpose]) {
        toast({
          title: `${file.name}: arquivo muito grande`,
          description: `Máximo ${Math.round(CLIENT_MAX_BYTES[purpose] / (1024 * 1024))} MB`,
          variant: 'error',
        });
        continue;
      }

      if (single) {
        for (const existing of nextItems) {
          if (existing.previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(existing.previewUrl);
          }
        }
      }

      const localId = createLocalId();
      const previewUrl = URL.createObjectURL(file);
      const item: MediaItem = {
        id: localId,
        url: previewUrl,
        previewUrl,
        sortOrder: single ? 0 : nextItems.length,
        isPrimary: single || nextItems.length === 0,
        status: 'uploading',
        progress: 5,
      };

      if (single) {
        nextItems.splice(0, nextItems.length, item);
      } else {
        nextItems.push(item);
      }

      commit([...nextItems]);
      setSelectedId(localId);
      void uploadFile(file, localId);
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) {
      void enqueueFiles(event.target.files);
    }

    event.target.value = '';
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);

    if (event.dataTransfer.files?.length) {
      void enqueueFiles(event.dataTransfer.files);
    }
  }

  function setPrimary(id: string) {
    commit(
      valueRef.current.map((item) => ({
        ...item,
        isPrimary: item.id === id,
      }))
    );
  }

  function moveItem(id: string, direction: -1 | 1) {
    const current = valueRef.current;
    const index = current.findIndex((item) => item.id === id);

    if (index < 0) {
      return;
    }

    const target = index + direction;

    if (target < 0 || target >= current.length) {
      return;
    }

    const next = [...current];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed!);
    commit(next.map((item, sortOrder) => ({ ...item, sortOrder })));
  }

  function reorderByDrag(activeId: string, overId: string) {
    const current = valueRef.current;
    const from = current.findIndex((item) => item.id === activeId);
    const to = current.findIndex((item) => item.id === overId);

    if (from < 0 || to < 0 || from === to) {
      return;
    }

    commit(arrayMove(current, from, to).map((item, sortOrder) => ({ ...item, sortOrder })));
  }

  function onSortDragStart(event: DragStartEvent) {
    setActiveSortId(String(event.active.id));
  }

  function onSortDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveSortId(null);

    if (!over || active.id === over.id) {
      return;
    }

    reorderByDrag(String(active.id), String(over.id));
  }

  function onSortDragCancel() {
    setActiveSortId(null);
  }

  async function removeItem(item: MediaItem) {
    if (item.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.previewUrl);
    }

    const next = valueRef.current
      .filter((entry) => entry.id !== item.id)
      .map((entry, sortOrder) => ({ ...entry, sortOrder }));

    if (next.length > 0 && !next.some((entry) => entry.isPrimary)) {
      next[0] = { ...next[0]!, isPrimary: true };
    }

    commit(next);

    if (selectedId === item.id) {
      setSelectedId(next[0]?.id ?? null);
    }

    if (!item.id.startsWith('local-') && item.storageKey) {
      const result = await deleteMediaAssetAction(storeId, item.id);

      if (!result.ok) {
        toast({
          title: 'Arquivo removido da lista',
          description: 'Não foi possível apagar o objeto remoto agora',
          variant: 'error',
        });
      }
    }
  }

  async function retryItem(item: MediaItem) {
    if (!item.previewUrl) {
      return;
    }

    const response = await fetch(item.previewUrl);
    const blob = await response.blob();
    const file = new File([blob], 'retry.webp', { type: blob.type || 'image/jpeg' });
    await uploadFile(file, item.id);
  }

  const fileInput = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept={ACCEPT}
      multiple={!single}
      className="sr-only"
      disabled={disabled}
      onChange={onInputChange}
    />
  );

  const dragHandlers = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop,
  };

  if (compact && readyItem) {
    const src = mediaThumbSrc(readyItem);

    return (
      <div
        className={cn(
          styles.uploader,
          styles.uploader__compact,
          variant === 'cover' && styles.uploader__compactCover,
          className
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-text">{label}</p>
          <p className={styles.uploader__limits}>JPEG/PNG/WebP · até {maxMb} MB</p>
        </div>
        <div className={styles.uploader__compactRow}>
          <div className={styles.uploader__compactPreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className={
                variant === 'cover' ? styles.uploader__coverThumb : styles.uploader__logoThumb
              }
            />
            {readyItem.status === 'uploading' ? (
              <div className={styles.uploader__progress} aria-hidden>
                <div
                  className={styles.uploader__progressBar}
                  style={{ width: `${readyItem.progress ?? 10}%` }}
                />
              </div>
            ) : null}
          </div>
          <div className={styles.uploader__compactActions}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              Substituir
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => void removeItem(readyItem)}
            >
              Remover
            </Button>
            {readyItem.status === 'error' ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => void retryItem(readyItem)}
              >
                Tentar de novo
              </Button>
            ) : null}
            {readyItem.status === 'error' ? (
              <p className={styles.uploader__error}>{readyItem.errorMessage ?? 'Erro no upload'}</p>
            ) : null}
          </div>
          {fileInput}
        </div>
      </div>
    );
  }

  if (gallery) {
    return (
      <div className={cn(styles.uploader, styles.uploader__gallery, className)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-sm font-medium text-text">{label}</p>
            <p className={styles.uploader__count} aria-live="polite">
              {readyCount} de {maxFiles}
              {value.some((item) => item.status === 'uploading') ? ' · enviando…' : ''}
            </p>
          </div>
          <p className={styles.uploader__limits}>
            JPEG/PNG/WebP · até {maxMb} MB · máx. {maxFiles}
          </p>
        </div>

        {showDropzone ? (
          <label
            htmlFor={inputId}
            className={cn(
              styles.uploader__dropzone,
              styles.uploader__dropzoneGallery,
              dragging && styles.uploader__dropzoneActive,
              disabled && styles.uploader__dropzoneDisabled
            )}
            {...dragHandlers}
          >
            <ImagePlus className="size-6 text-text-muted" strokeWidth={1.5} />
            <span className={styles.uploader__hint}>
              Arraste imagens ou use o botão para selecionar
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-accent-strong">
              <Upload className="size-3.5" strokeWidth={1.5} />
              Enviar arquivos
            </span>
            {fileInput}
          </label>
        ) : (
          <div className={styles.uploader__gallerySplit}>
            <div className={styles.uploader__galleryThumbs}>
              <DndContext
                sensors={sortSensors}
                collisionDetection={closestCenter}
                onDragStart={onSortDragStart}
                onDragEnd={onSortDragEnd}
                onDragCancel={onSortDragCancel}
              >
                <SortableContext
                  items={value.map((item) => item.id)}
                  strategy={rectSortingStrategy}
                >
                  <ul
                    className={cn(styles.uploader__grid, styles.uploader__gridGallery)}
                    aria-label="Fotografias — arraste para reordenar"
                  >
                    {value.map((item, index) => (
                      <SortableThumb
                        key={item.id}
                        item={item}
                        index={index}
                        selected={selectedItem?.id === item.id}
                        disabled={disabled}
                        onSelect={() => setSelectedId(item.id)}
                        onRemove={() => void removeItem(item)}
                      />
                    ))}
                  </ul>
                </SortableContext>
                <DragOverlay dropAnimation={DROP_ANIMATION} zIndex={80}>
                  {activeSortId
                    ? (() => {
                        const activeItem = value.find((item) => item.id === activeSortId);
                        const activeIndex = value.findIndex((item) => item.id === activeSortId);

                        if (!activeItem) {
                          return null;
                        }

                        return (
                          <GalleryThumbPreview item={activeItem} index={Math.max(0, activeIndex)} />
                        );
                      })()
                    : null}
                </DragOverlay>
              </DndContext>
              <p className={styles.uploader__sortHint}>
                Segure e arraste as fotos para definir a ordem no anúncio.
              </p>

              {showSecondaryDropzone ? (
                <div className={styles.uploader__galleryAdd}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={styles.uploader__galleryAddBtn}
                    disabled={disabled}
                    onClick={() => inputRef.current?.click()}
                  >
                    <Upload className="size-3.5" strokeWidth={1.5} />
                    Adicionar fotos
                  </Button>
                  <label
                    htmlFor={inputId}
                    className={cn(
                      styles.uploader__dropzoneInline,
                      styles.uploader__galleryDropzone,
                      dragging && styles.uploader__dropzoneActive,
                      disabled && styles.uploader__dropzoneDisabled
                    )}
                    {...dragHandlers}
                  >
                    Ou arraste arquivos aqui
                  </label>
                  {fileInput}
                </div>
              ) : (
                fileInput
              )}
            </div>

            <div className={styles.uploader__galleryPreview}>
              <div className={styles.uploader__galleryPreviewFrame}>
                {selectedItem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaSrc(selectedItem)}
                    alt={selectedItem.alt || 'Pré-visualização'}
                    className={styles.uploader__galleryPreviewImg}
                  />
                ) : (
                  <p className={styles.uploader__galleryPreviewEmpty}>
                    Selecione uma miniatura para visualizar.
                  </p>
                )}
              </div>

              {selectedItem ? (
                <div className={styles.uploader__galleryPreviewActions}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled || selectedIndex <= 0}
                    onClick={() => moveItem(selectedItem.id, -1)}
                  >
                    <ChevronLeft className="size-3.5" strokeWidth={1.5} aria-hidden />
                    Mover
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled || selectedIndex < 0 || selectedIndex >= value.length - 1}
                    onClick={() => moveItem(selectedItem.id, 1)}
                  >
                    Mover
                    <ChevronRight className="size-3.5" strokeWidth={1.5} aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedItem.isPrimary ? 'primary' : 'outline-accent'}
                    disabled={disabled || selectedItem.status !== 'ready'}
                    onClick={() => setPrimary(selectedItem.id)}
                  >
                    <Star className="size-3.5" strokeWidth={1.5} aria-hidden />
                    {selectedItem.isPrimary ? 'Principal' : 'Definir principal'}
                  </Button>
                  {selectedItem.status === 'error' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => void retryItem(selectedItem)}
                    >
                      Tentar de novo
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => void removeItem(selectedItem)}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.5} aria-hidden />
                    Remover
                  </Button>
                </div>
              ) : null}

              {selectedItem?.status === 'error' ? (
                <p className={styles.uploader__error}>
                  {selectedItem.errorMessage ?? 'Erro no upload'}
                </p>
              ) : null}
            </div>
          </div>
        )}

        <Dialog open={Boolean(lightboxItem)} onOpenChange={(open) => !open && setLightboxId(null)}>
          <DialogContent className={styles.uploader__lightbox}>
            <DialogHeader>
              <DialogTitle>Fotografia</DialogTitle>
            </DialogHeader>
            {lightboxItem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaSrc(lightboxItem)}
                alt={lightboxItem.alt || 'Fotografia ampliada'}
                className={styles.uploader__lightboxImage}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div
      className={cn(
        styles.uploader,
        single && styles.uploader__single,
        compact && styles.uploader__compact,
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-sm font-medium text-text">{label}</p>
          {!compact ? (
            <p className={styles.uploader__count} aria-live="polite">
              {readyCount} de {maxFiles}
              {value.some((item) => item.status === 'uploading') ? ' · enviando…' : ''}
            </p>
          ) : null}
        </div>
        <p className={styles.uploader__limits}>
          JPEG/PNG/WebP · até {maxMb} MB{compact ? '' : ` · máx. ${maxFiles}`}
        </p>
      </div>

      {showDropzone ? (
        <label
          htmlFor={inputId}
          className={cn(
            styles.uploader__dropzone,
            compact && styles.uploader__dropzoneCompact,
            dragging && styles.uploader__dropzoneActive,
            disabled && styles.uploader__dropzoneDisabled
          )}
          {...dragHandlers}
        >
          <ImagePlus className="size-6 text-text-muted" strokeWidth={1.5} />
          <span className={styles.uploader__hint}>
            Arraste imagens ou use o botão para selecionar
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-accent-strong">
            <Upload className="size-3.5" strokeWidth={1.5} />
            Enviar arquivos
          </span>
          {fileInput}
        </label>
      ) : null}

      {!compact && value.length > 0 ? (
        <ul className={styles.uploader__grid}>
          {value.map((item, index) => {
            const src = mediaThumbSrc(item);

            return (
              <li
                key={item.id}
                className={cn(
                  styles.uploader__item,
                  item.isPrimary && styles.uploader__itemPrimary
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={item.alt || `Foto ${index + 1}`}
                  className={styles.uploader__thumb}
                />
                {item.isPrimary ? <span className={styles.uploader__badge}>Principal</span> : null}
                {item.status === 'uploading' ? (
                  <div className={styles.uploader__progress} aria-hidden>
                    <div
                      className={styles.uploader__progressBar}
                      style={{ width: `${item.progress ?? 10}%` }}
                    />
                  </div>
                ) : null}
                {item.status === 'error' ? (
                  <p className={styles.uploader__error}>{item.errorMessage ?? 'Erro no upload'}</p>
                ) : null}
                <div className={styles.uploader__overlay}>
                  {!single ? (
                    <>
                      <IconButton
                        type="button"
                        size="sm"
                        variant="circle-dark"
                        className={styles.uploader__overlayBtn}
                        aria-label={`Mover foto ${index + 1} para a esquerda`}
                        disabled={disabled || index === 0}
                        onClick={() => moveItem(item.id, -1)}
                        icon={<ChevronLeft className="size-3.5" strokeWidth={1.5} />}
                      />
                      <IconButton
                        type="button"
                        size="sm"
                        variant="circle-dark"
                        className={styles.uploader__overlayBtn}
                        aria-label={`Mover foto ${index + 1} para a direita`}
                        disabled={disabled || index === value.length - 1}
                        onClick={() => moveItem(item.id, 1)}
                        icon={<ChevronRight className="size-3.5" strokeWidth={1.5} />}
                      />
                      <IconButton
                        type="button"
                        size="sm"
                        variant="circle-dark"
                        className={styles.uploader__overlayBtn}
                        aria-label={`Definir foto ${index + 1} como principal`}
                        disabled={disabled || item.status !== 'ready'}
                        onClick={() => setPrimary(item.id)}
                        icon={<Star className="size-3.5" strokeWidth={1.5} />}
                      />
                    </>
                  ) : null}
                  {item.status === 'error' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => void retryItem(item)}
                    >
                      Tentar de novo
                    </Button>
                  ) : null}
                  <IconButton
                    type="button"
                    size="sm"
                    variant="circle-dark"
                    className={styles.uploader__overlayBtn}
                    aria-label={`Remover foto ${index + 1}`}
                    disabled={disabled}
                    onClick={() => void removeItem(item)}
                    icon={<Trash2 className="size-3.5" strokeWidth={1.5} />}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!showDropzone ? fileInput : null}

      <Dialog open={Boolean(lightboxItem)} onOpenChange={(open) => !open && setLightboxId(null)}>
        <DialogContent className={styles.uploader__lightbox}>
          <DialogHeader>
            <DialogTitle>Fotografia</DialogTitle>
          </DialogHeader>
          {lightboxItem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc(lightboxItem)}
              alt={lightboxItem.alt || 'Fotografia ampliada'}
              className={styles.uploader__lightboxImage}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
