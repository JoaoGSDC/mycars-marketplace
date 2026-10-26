'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react';

import type { VehicleGalleryImage } from '@app-types/vehicle';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@components/ui';
import { resolveMediaUrl } from '@utils/media-url';
import { cn } from '@utils/cn';

import { detailContent } from '../../marketplace.detail.content';
import styles from '../../detail.styles.module.css';

export type VehicleGalleryProps = {
  images: VehicleGalleryImage[];
  alt: string;
  /** Texto discreto quando não há fotos reais. */
  emptyLabel?: string;
};

type PinchState = {
  scale: number;
  x: number;
  y: number;
};

const INITIAL_TRANSFORM: PinchState = { scale: 1, x: 0, y: 0 };

export function VehicleGallery({ images, alt, emptyLabel }: VehicleGalleryProps) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [transform, setTransform] = useState<PinchState>(INITIAL_TRANSFORM);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<{
    startDist: number;
    startScale: number;
    startX: number;
    startY: number;
    midX: number;
    midY: number;
    mode: 'pinch' | 'pan' | null;
  } | null>(null);
  const copy = detailContent;

  const current = images[index];
  const mainUrl = current ? resolveMediaUrl(current, 'detail') : undefined;
  const hasImages = images.length > 0 && Boolean(mainUrl);

  const resetTransform = useCallback(() => {
    setTransform(INITIAL_TRANSFORM);
    pinchRef.current = null;
  }, []);

  function go(delta: number) {
    if (images.length === 0) {
      return;
    }

    setIndex((currentIndex) => (currentIndex + delta + images.length) % images.length);
    resetTransform();
  }

  useEffect(() => {
    if (!lightboxOpen) {
      resetTransform();
    }
  }, [lightboxOpen, resetTransform]);

  function distance(a: Touch, b: Touch) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;

    return Math.hypot(dx, dy);
  }

  function midpoint(a: Touch, b: Touch) {
    return {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
    };
  }

  function onLightboxTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      const [a, b] = [event.touches[0]!, event.touches[1]!];
      const mid = midpoint(a, b);
      pinchRef.current = {
        startDist: distance(a, b),
        startScale: transform.scale,
        startX: transform.x,
        startY: transform.y,
        midX: mid.x,
        midY: mid.y,
        mode: 'pinch',
      };
      return;
    }

    if (event.touches.length === 1 && transform.scale > 1) {
      const touch = event.touches[0]!;
      pinchRef.current = {
        startDist: 0,
        startScale: transform.scale,
        startX: transform.x,
        startY: transform.y,
        midX: touch.clientX,
        midY: touch.clientY,
        mode: 'pan',
      };
    }
  }

  function onLightboxTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    const session = pinchRef.current;

    if (!session) {
      return;
    }

    if (session.mode === 'pinch' && event.touches.length === 2) {
      event.preventDefault();
      const [a, b] = [event.touches[0]!, event.touches[1]!];
      const nextScale = Math.min(4, Math.max(1, session.startScale * (distance(a, b) / session.startDist)));
      const mid = midpoint(a, b);
      setTransform({
        scale: nextScale,
        x: session.startX + (mid.x - session.midX),
        y: session.startY + (mid.y - session.midY),
      });
      return;
    }

    if (session.mode === 'pan' && event.touches.length === 1 && transform.scale > 1) {
      event.preventDefault();
      const touch = event.touches[0]!;
      setTransform({
        scale: session.startScale,
        x: session.startX + (touch.clientX - session.midX),
        y: session.startY + (touch.clientY - session.midY),
      });
    }
  }

  function onLightboxTouchEnd() {
    pinchRef.current = null;

    if (transform.scale <= 1.05) {
      resetTransform();
    }
  }

  return (
    <div className={styles.gallery}>
      <div
        className={cn(styles.gallery__main, !hasImages && styles['gallery__main--empty'])}
        onTouchStart={(event) => {
          if (images.length < 2) {
            return;
          }

          const touch = event.changedTouches[0];
          swipeRef.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const start = swipeRef.current;
          swipeRef.current = null;

          if (!start || images.length < 2) {
            return;
          }

          const touch = event.changedTouches[0];
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;

          if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) {
            return;
          }

          go(dx < 0 ? 1 : -1);
        }}
      >
        {hasImages && mainUrl ? (
          <Image
            src={mainUrl}
            alt={alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 760px"
            className={styles.gallery__image}
          />
        ) : (
          <p className={styles.gallery__emptyLabel}>{emptyLabel ?? alt}</p>
        )}

        {images.length > 1 ? (
          <>
            <div className={cn(styles.gallery__nav, styles['gallery__nav--prev'])}>
              <IconButton
                type="button"
                variant="square-outline"
                size="sm"
                className={styles.gallery__navBtn}
                aria-label={copy.galleryPrev}
                icon={<ChevronLeft className="size-5" strokeWidth={1.5} />}
                onClick={() => go(-1)}
              />
            </div>
            <div className={cn(styles.gallery__nav, styles['gallery__nav--next'])}>
              <IconButton
                type="button"
                variant="square-outline"
                size="sm"
                className={styles.gallery__navBtn}
                aria-label={copy.galleryNext}
                icon={<ChevronRight className="size-5" strokeWidth={1.5} />}
                onClick={() => go(1)}
              />
            </div>
          </>
        ) : null}

        {hasImages ? (
          <div className={styles.gallery__toolbar}>
            {images.length > 1 ? (
              <span className={styles.gallery__counter}>
                {index + 1} / {images.length}
              </span>
            ) : null}
            <IconButton
              type="button"
              variant="square-outline"
              size="sm"
              className={styles.gallery__navBtn}
              aria-label={copy.galleryExpand}
              icon={<Expand className="size-4" strokeWidth={1.5} />}
              onClick={() => setLightboxOpen(true)}
            />
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className={styles.gallery__thumbs} role="list">
          {images.map((image, thumbIndex) => {
            const thumbUrl = resolveMediaUrl(image, 'card') ?? resolveMediaUrl(image, 'detail');

            return (
              <button
                key={image.id}
                type="button"
                role="listitem"
                className={cn(
                  styles.gallery__thumb,
                  thumbIndex === index && styles['gallery__thumb--active']
                )}
                aria-label={copy.galleryThumb(thumbIndex + 1)}
                aria-current={thumbIndex === index}
                onClick={() => setIndex(thumbIndex)}
              >
                {thumbUrl ? (
                  <Image
                    src={thumbUrl}
                    alt=""
                    fill
                    sizes="96px"
                    className={styles.gallery__thumbImage}
                  />
                ) : (
                  <span className={styles.gallery__emptyLabel}>{thumbIndex + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className={styles.gallery__lightbox}>
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div
            className={styles.gallery__lightboxStage}
            onTouchStart={onLightboxTouchStart}
            onTouchMove={onLightboxTouchMove}
            onTouchEnd={onLightboxTouchEnd}
            onDoubleClick={() => {
              if (transform.scale > 1) {
                resetTransform();
              } else {
                setTransform({ scale: 2, x: 0, y: 0 });
              }
            }}
          >
            <div
              className={styles.gallery__lightboxImage}
              style={{
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
              }}
            >
              {mainUrl ? (
                <Image
                  src={mainUrl}
                  alt={alt}
                  fill
                  sizes="100vw"
                  className={styles.gallery__image}
                  draggable={false}
                />
              ) : null}
            </div>
          </div>
          {images.length > 1 ? (
            <div className={styles.gallery__lightboxNav}>
              <IconButton
                type="button"
                variant="square-outline"
                size="sm"
                aria-label={copy.galleryPrev}
                icon={<ChevronLeft className="size-5" strokeWidth={1.5} />}
                onClick={() => go(-1)}
              />
              <p className="self-center text-sm text-text-muted">
                {index + 1} / {images.length}
              </p>
              <IconButton
                type="button"
                variant="square-outline"
                size="sm"
                aria-label={copy.galleryNext}
                icon={<ChevronRight className="size-5" strokeWidth={1.5} />}
                onClick={() => go(1)}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
