import { useRef, type HTMLAttributes } from "react";

type Direction = "prev" | "next";

/** Horizontal image gestures keep vertical page scrolling and pinch zoom native. */
export function useImageSwipe() {
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  const swiped = useRef(false);

  return (change: (direction: Direction) => void, enabled: boolean) => ({
    "data-image-carousel": true,
    style: { touchAction: enabled ? "pan-y pinch-zoom" : "auto" },
    onPointerDown(event) {
      swiped.current = false;
      start.current = null;
      if (!enabled || !event.isPrimary || event.pointerType === "mouse") return;
      if ((event.target as Element).closest("button, a, input")) return;
      start.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    },
    onPointerUp(event) {
      const origin = start.current;
      start.current = null;
      if (!enabled || !origin || origin.id !== event.pointerId) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy) * 1.5) return;
      swiped.current = true;
      change(dx < 0 ? "next" : "prev");
    },
    onPointerCancel() {
      start.current = null;
      swiped.current = false;
    },
    onClickCapture(event) {
      if (!swiped.current) return;
      swiped.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  } satisfies HTMLAttributes<HTMLDivElement> & { "data-image-carousel": boolean });
}
