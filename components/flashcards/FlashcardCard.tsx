"use client";

import { CldImage } from "next-cloudinary";
import { InteractiveFlashcard } from "./InteractiveFlashcard";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** URL ảnh Cloudinary. null → hiện placeholder */
  imageUrl: string | null;
  alt: string;
  /** Chip text hiển thị đè lên ảnh mặt trước */
  overlayChip?: string;
  /**
   * undefined → single face (không lật)
   * string | null → flip card (mặt trước ảnh, mặt sau caption)
   */
  caption?: string | null;
  /** Trạng thái lật (chỉ dùng khi caption được cung cấp) */
  flipped?: boolean;
  /** Hiển thị khi caption rỗng */
  captionFallback?: string;
  /** Gợi ý ở dưới mặt sau */
  captionHint?: string;
  /** True → eager + priority cho LCP */
  priority?: boolean;
  loading?: "eager" | "lazy";
  imageWidth?: number;
  imageHeight?: number;
};

export function FlashcardCard({
  imageUrl,
  alt,
  overlayChip,
  caption,
  flipped,
  captionFallback = "Thẻ này chưa có caption.",
  captionHint,
  priority,
  loading,
  imageWidth = 756,
  imageHeight = 1056,
  ...buttonProps
}: Props) {
  const flippable = caption !== undefined;

  const imagePanel = (
    <div className="flashcard-panel flashcard-media">
      {imageUrl ? (
        <CldImage
          src={imageUrl}
          alt={alt}
          width={imageWidth}
          height={imageHeight}
          crop="fill"
          className="h-full w-full object-cover"
          loading={priority ? "eager" : (loading ?? "lazy")}
          priority={priority}
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-slate-200 text-sm font-semibold text-slate-500">
          Flashcard Preview
        </div>
      )}
      {overlayChip && <div className="flashcard-overlay-chip">{overlayChip}</div>}
    </div>
  );

  return (
    <InteractiveFlashcard flipped={flipped} {...buttonProps}>
      {flippable ? (
        <div className="flashcard-flip-stage">
          <div className="flashcard-flip-inner">
            <div className="flashcard-face flashcard-face-front flashcard-face-fill">
              {imagePanel}
            </div>
            <div className="flashcard-face flashcard-face-back flashcard-face-rear flashcard-face-fill">
              <div className="flashcard-panel flashcard-copy-panel flashcard-copy-panel-center">
                <p className="flashcard-copy-label">Caption</p>
                <div className="flashcard-copy">
                  {caption?.trim() || captionFallback}
                </div>
                {captionHint && <p className="flashcard-copy-hint">{captionHint}</p>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flashcard-face flashcard-face-fill">
          {imagePanel}
        </div>
      )}
    </InteractiveFlashcard>
  );
}
