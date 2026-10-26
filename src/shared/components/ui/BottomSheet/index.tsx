'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import { cn } from '@utils/cn';

/**
 * Sheet inferior (mobile-first).
 * Desktop: preferir `Dialog` para overlays centralizados.
 *
 * - `height`: content | half | full
 * - `snapPoints` + `defaultSnap`: snaps opcionais (compatível com `height`)
 * - Teclado: `visualViewport` reduz max-height / aumenta padding do footer
 * - Drag: handle sempre; body só com `scrollTop === 0` e gesto para baixo
 */

export type BottomSheetHeight = 'content' | 'half' | 'full';

type DragHandlers = {
  begin: (event: ReactPointerEvent<HTMLElement>, fromBody?: boolean) => void;
  move: (event: ReactPointerEvent<HTMLElement>) => void;
  end: (event: ReactPointerEvent<HTMLElement>) => void;
};

type BottomSheetContextValue = {
  requestClose: () => void;
  bodyId: string;
  bodyRef: RefObject<HTMLDivElement | null>;
  registerDrag: (handlers: DragHandlers | null) => void;
  drag: DragHandlers;
};

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

function useBottomSheetContext() {
  return useContext(BottomSheetContext);
}

export type BottomSheetProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;

const heightClasses: Record<BottomSheetHeight, string> = {
  content: 'max-h-[min(90dvh,90%)]',
  half: 'h-[min(50dvh,50%)] max-h-[min(50dvh,50%)]',
  full: 'h-[min(92dvh,92%)] max-h-[min(92dvh,92%)]',
};

const SNAP_ORDER: BottomSheetHeight[] = ['content', 'half', 'full'];
const DISMISS_DISTANCE_PX = 112;
const DISMISS_VELOCITY = 0.55;
const SNAP_DISTANCE_PX = 72;

const noopDrag: DragHandlers = {
  begin: () => undefined,
  move: () => undefined,
  end: () => undefined,
};

export function BottomSheet({ onOpenChange, children, ...props }: BottomSheetProps) {
  const bodyId = useId();
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragHandlers>(noopDrag);

  const requestClose = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  const registerDrag = useCallback((handlers: DragHandlers | null) => {
    dragRef.current = handlers ?? noopDrag;
  }, []);

  const drag = useMemo<DragHandlers>(
    () => ({
      begin: (event, fromBody) => {
        dragRef.current.begin(event, fromBody);
      },
      move: (event) => {
        dragRef.current.move(event);
      },
      end: (event) => {
        dragRef.current.end(event);
      },
    }),
    []
  );

  const value = useMemo<BottomSheetContextValue>(
    () => ({
      requestClose,
      bodyId,
      bodyRef,
      registerDrag,
      drag,
    }),
    [requestClose, bodyId, registerDrag, drag]
  );

  return (
    <BottomSheetContext.Provider value={value}>
      <DialogPrimitive.Root onOpenChange={onOpenChange} {...props}>
        {children}
      </DialogPrimitive.Root>
    </BottomSheetContext.Provider>
  );
}

export function BottomSheetTrigger(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />;
}

export function BottomSheetClose(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close {...props} />;
}

export type BottomSheetContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /** Altura alvo do sheet. Default: `content`. Ignorado se `snapPoints` for informado. */
  height?: BottomSheetHeight;
  /** Pontos de snap. Default: `[height]`. */
  snapPoints?: BottomSheetHeight[];
  /** Snap inicial. Default: primeiro de `snapPoints` ou `height`. */
  defaultSnap?: BottomSheetHeight;
  /** Fecha ao tocar o backdrop. Default: `true`. */
  dismissOnBackdrop?: boolean;
  /** Permite arrastar para fechar / mudar snap. Default: `true`. */
  dragToDismiss?: boolean;
};

export function BottomSheetContent({
  className,
  children,
  height = 'content',
  snapPoints,
  defaultSnap,
  dismissOnBackdrop = true,
  dragToDismiss = true,
  onPointerDownCapture,
  style,
  ...props
}: BottomSheetContentProps) {
  const ctx = useBottomSheetContext();
  const dragSessionRef = useRef<{
    pointerId: number;
    startY: number;
    lastY: number;
    lastTs: number;
    velocity: number;
    active: boolean;
  } | null>(null);

  const points = useMemo(() => {
    const list = snapPoints?.length ? snapPoints : [height];
    return list.filter((point, index, arr) => arr.indexOf(point) === index);
  }, [snapPoints, height]);

  const initialSnap = defaultSnap && points.includes(defaultSnap) ? defaultSnap : points[0]!;
  const [activeSnap, setActiveSnap] = useState<BottomSheetHeight>(initialSnap);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setActiveSnap(initialSnap);
  }, [initialSnap]);

  const resetDrag = useCallback(() => {
    dragSessionRef.current = null;
    setDragging(false);
    setDragOffset(0);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      return;
    }

    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 48 ? inset : 0);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  function isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest(
        'input, textarea, select, button, a, [role="slider"], [data-bottom-sheet-no-drag], [data-radix-collection-item]'
      )
    );
  }

  const begin = useCallback(
    (event: ReactPointerEvent<HTMLElement>, fromBody = false) => {
      if (!dragToDismiss || event.button !== 0) {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      if (fromBody) {
        const body = ctx?.bodyRef.current;
        if (body && body.scrollTop > 0) {
          return;
        }
      }

      dragSessionRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        lastY: event.clientY,
        lastTs: performance.now(),
        velocity: 0,
        active: true,
      };
      setDragging(true);

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    },
    [ctx?.bodyRef, dragToDismiss]
  );

  const move = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const state = dragSessionRef.current;

    if (!state?.active || state.pointerId !== event.pointerId) {
      return;
    }

    const now = performance.now();
    const raw = event.clientY - state.startY;
    const dy = raw > 0 ? raw : raw * 0.25;
    const dt = Math.max(1, now - state.lastTs);
    state.velocity = (event.clientY - state.lastY) / dt;
    state.lastY = event.clientY;
    state.lastTs = now;
    setDragOffset(dy);
  }, []);

  const end = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const state = dragSessionRef.current;

      if (!state?.active || state.pointerId !== event.pointerId) {
        return;
      }

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }

      const offset = Math.max(0, event.clientY - state.startY);
      const velocity = state.velocity;
      const orderedPoints = SNAP_ORDER.filter((point) => points.includes(point));
      const upward = event.clientY - state.startY;

      if ((offset >= DISMISS_DISTANCE_PX || velocity >= DISMISS_VELOCITY) && upward > 0) {
        ctx?.requestClose();
        resetDrag();
        return;
      }

      if (upward > SNAP_DISTANCE_PX && orderedPoints.length > 1) {
        const currentOrdered = orderedPoints.indexOf(activeSnap);
        if (currentOrdered > 0) {
          setActiveSnap(orderedPoints[currentOrdered - 1]!);
        }
      } else if (upward < -SNAP_DISTANCE_PX && orderedPoints.length > 1) {
        const currentOrdered = orderedPoints.indexOf(activeSnap);
        if (currentOrdered >= 0 && currentOrdered < orderedPoints.length - 1) {
          setActiveSnap(orderedPoints[currentOrdered + 1]!);
        }
      }

      resetDrag();
    },
    [activeSnap, ctx, points, resetDrag]
  );

  useEffect(() => {
    if (!ctx) {
      return;
    }

    ctx.registerDrag({ begin, move, end });

    return () => {
      ctx.registerDrag(null);
    };
  }, [begin, ctx, end, move]);

  const overlayOpacity = dragging ? Math.max(0.2, 1 - Math.max(0, dragOffset) / 320) : 1;
  const handleExpanded = activeSnap === 'full';
  const maxHeightBase =
    activeSnap === 'full' ? '92dvh' : activeSnap === 'half' ? '50dvh' : '90dvh';

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-[var(--z-overlay)] bg-ink/40',
          'data-[state=open]:animate-[drawer-fade-in_var(--duration-normal)_var(--ease-out)]',
          'data-[state=closed]:animate-[drawer-fade-out_var(--duration-fast)_ease-in]'
        )}
        style={{
          opacity: overlayOpacity,
          transition:
            dragging || reducedMotion ? undefined : 'opacity var(--duration-normal) var(--ease-out)',
        }}
      />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          'fixed inset-x-0 bottom-0 z-[var(--z-modal)] flex w-full flex-col rounded-t-2xl border border-border border-b-0 bg-surface shadow-popover focus-visible:outline-none',
          'pb-[env(safe-area-inset-bottom,0px)]',
          'data-[state=open]:animate-[drawer-in-bottom_var(--duration-normal)_var(--ease-out)]',
          'data-[state=closed]:animate-[drawer-out-bottom_var(--duration-fast)_ease-in]',
          heightClasses[activeSnap],
          className
        )}
        style={{
          ...style,
          transform: dragOffset ? `translate3d(0, ${Math.max(0, dragOffset)}px, 0)` : undefined,
          maxHeight: keyboardInset ? `calc(${maxHeightBase} - ${keyboardInset}px)` : undefined,
          paddingBottom: keyboardInset
            ? `calc(env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)`
            : undefined,
          transition:
            dragging || reducedMotion
              ? undefined
              : 'transform var(--duration-normal) var(--ease-out), max-height var(--duration-normal) var(--ease-out)',
        }}
        onPointerDownCapture={onPointerDownCapture}
        onInteractOutside={(event) => {
          if (!dismissOnBackdrop) {
            event.preventDefault();
          }
        }}
        {...props}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2 active:cursor-grabbing"
          data-bottom-sheet-handle=""
          onPointerDown={(event) => {
            begin(event, false);
          }}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <div className="flex h-11 w-full items-start justify-center pt-1" aria-hidden>
            <div
              className={cn(
                'h-1 rounded-full bg-border transition-[width] duration-[var(--duration-fast)] ease-out',
                handleExpanded ? 'w-6' : 'w-10',
                dragging && 'w-12 bg-text-muted'
              )}
            />
          </div>
        </div>
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-3 flex size-11 items-center justify-center rounded-md text-text-muted hover:bg-surface-sunken hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
          aria-label="Fechar"
        >
          <X className="size-4" strokeWidth={1.5} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function BottomSheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2 px-6 pb-0 pt-1 pr-14', className)} {...props} />;
}

export function BottomSheetTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold text-text', className)} {...props} />;
}

export function BottomSheetDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn('text-sm text-text-muted', className)} {...props} />
  );
}

export function BottomSheetBody({ className, onPointerDown, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ctx = useBottomSheetContext();

  return (
    <div
      id={ctx?.bodyId}
      ref={ctx?.bodyRef}
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 [-webkit-overflow-scrolling:touch]',
        className
      )}
      onPointerDown={(event) => {
        if (ctx && event.currentTarget.scrollTop <= 0) {
          ctx.drag.begin(event, true);
        }
        onPointerDown?.(event);
      }}
      onPointerMove={(event) => {
        ctx?.drag.move(event);
      }}
      onPointerUp={(event) => {
        ctx?.drag.end(event);
      }}
      onPointerCancel={(event) => {
        ctx?.drag.end(event);
      }}
      {...props}
    />
  );
}

export function BottomSheetFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex shrink-0 gap-3 border-t border-border bg-surface p-4', className)}
      {...props}
    />
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      setReduced(media.matches);
    };

    onChange();
    media.addEventListener('change', onChange);

    return () => {
      media.removeEventListener('change', onChange);
    };
  }, []);

  return reduced;
}
