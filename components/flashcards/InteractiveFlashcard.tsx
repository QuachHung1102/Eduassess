"use client";

import type { ButtonHTMLAttributes, PointerEvent } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  flipped?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function supportsInteractiveMotion() {
  if (typeof window === "undefined") {
    return false;
  }

  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

function updateCardEffect(element: HTMLButtonElement, event: PointerEvent<HTMLButtonElement>) {
  const bounds = element.getBoundingClientRect();
  const xRatio = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
  const yRatio = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
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
  element.style.setProperty("--flashcard-glare-opacity", `${(0.24 + (1 - distanceFromCenter) * 0.5).toFixed(3)}`);
  element.style.setProperty("--flashcard-shine-opacity", shineOpacity.toFixed(3));
}

export function InteractiveFlashcard({
  className,
  flipped = false,
  onPointerMove,
  onPointerLeave,
  onBlur,
  onFocus,
  type,
  ...props
}: Props) {
  return (
    <button
      {...props}
      type={type ?? "button"}
      className={className ? `${className} flashcard-holo-card` : "flashcard-holo-card"}
      data-interacting="false"
      data-flipped={flipped ? "true" : "false"}
      onPointerMove={(event) => {
        if (supportsInteractiveMotion()) {
          updateCardEffect(event.currentTarget, event);
        }

        onPointerMove?.(event);
      }}
      onPointerLeave={(event) => {
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