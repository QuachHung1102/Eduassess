"use client";

import { useEffect, useRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  flipped?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resetCardEffect(element: HTMLButtonElement) {
  element.dataset.interacting = "false";
  element.style.setProperty("--flashcard-rotate-x", "0deg");
  element.style.setProperty("--flashcard-rotate-y", "0deg");
  element.style.setProperty("--flashcard-glare-x", "50%");
  element.style.setProperty("--flashcard-glare-y", "50%");
  element.style.setProperty("--flashcard-background-x", "50%");
  element.style.setProperty("--flashcard-background-y", "50%");
  element.style.setProperty("--flashcard-glare-opacity", "0");
  element.style.setProperty("--flashcard-shine-opacity", "0.16");
}

function applyCardEffect(
  element: HTMLButtonElement,
  bounds: DOMRect,
  clientX: number,
  clientY: number
) {
  const xRatio = clamp((clientX - bounds.left) / bounds.width, 0, 1);
  const yRatio = clamp((clientY - bounds.top) / bounds.height, 0, 1);
  const rotateY = (xRatio - 0.5) * 18;
  const rotateX = (0.5 - yRatio) * 20;
  const distanceFromCenter = Math.min(1, Math.hypot(xRatio - 0.5, yRatio - 0.5) / 0.72);
  const shineOpacity = 0.3 + (1 - distanceFromCenter) * 0.42;

  element.dataset.interacting = "true";
  element.style.setProperty("--flashcard-rotate-x", `${rotateX.toFixed(2)}deg`);
  element.style.setProperty("--flashcard-rotate-y", `${rotateY.toFixed(2)}deg`);
  element.style.setProperty("--flashcard-glare-x", `${(xRatio * 100).toFixed(2)}%`);
  element.style.setProperty("--flashcard-glare-y", `${(yRatio * 100).toFixed(2)}%`);
  element.style.setProperty("--flashcard-background-x", `${(35 + xRatio * 30).toFixed(2)}%`);
  element.style.setProperty("--flashcard-background-y", `${(35 + yRatio * 30).toFixed(2)}%`);
  element.style.setProperty(
    "--flashcard-glare-opacity",
    `${(0.24 + (1 - distanceFromCenter) * 0.5).toFixed(3)}`
  );
  element.style.setProperty("--flashcard-shine-opacity", shineOpacity.toFixed(3));
}

export function InteractiveFlashcard({
  className,
  flipped = false,
  onPointerMove,
  onPointerEnter,
  onPointerLeave,
  onBlur,
  onFocus,
  type,
  ...props
}: Props) {
  // Cache reduced-motion một lần (không gọi matchMedia mỗi lần di chuột).
  const motionEnabledRef = useRef(true);
  // Bounds chỉ đọc lúc pointerenter, không đọc layout mỗi frame.
  const boundsRef = useRef<DOMRect | null>(null);
  // Gom ghi CSS var về một lần / frame.
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<{ el: HTMLButtonElement; x: number; y: number } | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      motionEnabledRef.current = !query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function scheduleEffect(element: HTMLButtonElement, clientX: number, clientY: number) {
    pendingRef.current = { el: element, x: clientX, y: clientY };
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const pending = pendingRef.current;
      if (!pending || !boundsRef.current) return;
      applyCardEffect(pending.el, boundsRef.current, pending.x, pending.y);
    });
  }

  return (
    <button
      {...props}
      type={type ?? "button"}
      className={className ? `${className} flashcard-holo-card` : "flashcard-holo-card"}
      data-interacting="false"
      data-flipped={flipped ? "true" : "false"}
      onPointerEnter={(event) => {
        if (motionEnabledRef.current) {
          boundsRef.current = event.currentTarget.getBoundingClientRect();
        }
        onPointerEnter?.(event);
      }}
      onPointerMove={(event) => {
        if (motionEnabledRef.current) {
          if (!boundsRef.current) {
            boundsRef.current = event.currentTarget.getBoundingClientRect();
          }
          scheduleEffect(event.currentTarget, event.clientX, event.clientY);
        }
        onPointerMove?.(event);
      }}
      onPointerLeave={(event) => {
        boundsRef.current = null;
        pendingRef.current = null;
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        resetCardEffect(event.currentTarget);
        onPointerLeave?.(event);
      }}
      onFocus={(event) => {
        event.currentTarget.dataset.interacting = "true";
        event.currentTarget.style.setProperty("--flashcard-glare-opacity", "0.34");
        event.currentTarget.style.setProperty("--flashcard-shine-opacity", "0.45");
        onFocus?.(event);
      }}
      onBlur={(event) => {
        resetCardEffect(event.currentTarget);
        onBlur?.(event);
      }}
    />
  );
}