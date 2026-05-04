"use client";

import { CldImage, CldUploadWidget } from "next-cloudinary";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FaIcon } from "@/components/ui/FaIcon";
import { faXmark, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FlashcardCard } from "@/components/flashcards/FlashcardCard";
import {
  addCardToFlashcardSetAction,
  removeCardFromFlashcardSetAction,
  updateCardInFlashcardSetAction,
} from "@/lib/teacher/actions/flashcard";
import {
  adminAddCardToFlashcardSetAction,
  adminRemoveCardFromFlashcardSetAction,
  adminUpdateCardInFlashcardSetAction,
} from "@/lib/admin/flashcard-actions";

type Card = {
  id: string;
  order: number;
  imageUrl: string;
  caption: string | null;
};

type Props = {
  setId: string;
  role: "teacher" | "admin";
  cards: Card[];
  readOnly?: boolean;
};

type PendingUpload = {
  imageUrl: string;
};

export function FlashcardSetEditor({ setId, role, cards, readOnly = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [localCards, setLocalCards] = useState(cards);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [editingCard, setEditingCard] = useState<{ id: string; caption: string } | null>(null);
  const [draftCaption, setDraftCaption] = useState("");
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const sortedCards = useMemo(
    () => [...localCards].sort((leftCard, rightCard) => leftCard.order - rightCard.order),
    [localCards]
  );

  useEffect(() => {
    setLocalCards(cards);
  }, [cards]);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    window.setTimeout(() => setFeedback(null), 3000);
  }

  function toggleCard(cardId: string) {
    setFlippedCards((current) => ({
      ...current,
      [cardId]: !current[cardId],
    }));
  }

  function clearDraftCard() {
    setDraftCaption("");
    setPendingUpload(null);
  }

  function handleAddCard() {
    if (!pendingUpload?.imageUrl) {
      showFeedback("error", "Hãy tải ảnh lên trước khi tạo thẻ");
      return;
    }

    const caption = draftCaption.trim();
    const imageUrl = pendingUpload.imageUrl;

    startTransition(async () => {
      try {
        const result =
          role === "teacher"
            ? await addCardToFlashcardSetAction(setId, imageUrl, caption || null)
            : await adminAddCardToFlashcardSetAction(setId, imageUrl, caption || null);

        if (result && "error" in result) {
          showFeedback("error", result.error ?? "Không thể thêm thẻ");
          return;
        }

        if (result?.card) {
          setLocalCards((current) => [...current, result.card]);
          setFlippedCards((current) => ({
            ...current,
            [result.card.id]: false,
          }));
        }

        clearDraftCard();
        showFeedback("success", "Đã thêm thẻ mới");
        router.refresh();
      } catch (error) {
        showFeedback("error", error instanceof Error ? error.message : "Upload thất bại");
      }
    });
  }

  function handleRemove(cardId: string) {
    if (readOnly) return;
    if (!window.confirm("Xóa thẻ này?")) return;

    startTransition(async () => {
      const result =
        role === "teacher"
          ? await removeCardFromFlashcardSetAction(cardId, setId)
          : await adminRemoveCardFromFlashcardSetAction(cardId, setId);

      if (result && "error" in result) {
        showFeedback("error", result.error ?? "Không thể xóa thẻ");
        return;
      }

      setLocalCards((current) =>
        current
          .filter((card) => card.id !== cardId)
          .map((card, index) => ({
            ...card,
            order: index + 1,
          }))
      );
      setFlippedCards((current) => {
        const next = { ...current };
        delete next[cardId];
        return next;
      });

      showFeedback("success", "Đã xóa thẻ");
      router.refresh();
    });
  }

  function handleSaveCaption() {
    if (!editingCard || readOnly) return;
    const { id: cardId, caption } = editingCard;
    startTransition(async () => {
      const result =
        role === "teacher"
          ? await updateCardInFlashcardSetAction(cardId, setId, { caption: caption.trim() })
          : await adminUpdateCardInFlashcardSetAction(cardId, setId, { caption: caption.trim() });

      if (result && "error" in result) {
        showFeedback("error", result.error ?? "Không thể lưu caption");
        return;
      }

      setLocalCards((current) =>
        current.map((card) =>
          card.id === cardId ? { ...card, caption: caption.trim() || null } : card
        )
      );

      setEditingCard(null);
      showFeedback("success", "Đã lưu chú thích");
      router.refresh();
    });
  }

  return (
    <>
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_1fr]">

      {/* Left: form panel (sticky) */}
      <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Thêm thẻ mới</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {readOnly
              ? "Bộ thẻ chia sẻ - chỉ xem, không chỉnh sửa."
              : "Mặt trước là ảnh, mặt sau là caption. Tải ảnh lên rồi bấm tạo thẻ."}
          </p>
        </div>

        <div className="px-5 py-4">
          {feedback ? (
            <div
              className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
                feedback.type === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          {readOnly ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Muốn tạo bộ thẻ riêng, hãy dùng nút <strong>Tạo bộ flashcard</strong>.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Caption mặt sau
                </label>
                <textarea
                  value={draftCaption}
                  onChange={(event) => setDraftCaption(event.target.value)}
                  rows={4}
                  placeholder="Gợi ý, giải thích ngắn, hoặc ghi nhớ nhanh..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {pendingUpload ? (
                <div className="overflow-hidden rounded-2xl border border-sky-200 bg-sky-50">
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-sky-800">Ảnh đã sẵn sàng</p>
                      <p className="text-xs text-sky-600">Bấm Tạo thẻ mới để lưu vào hệ thống</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearDraftCard}
                      disabled={isPending}
                      className="shrink-0 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                    >
                      Bỏ
                    </button>
                  </div>
                  <div className="border-t border-sky-200">
                    <CldImage
                      src={pendingUpload.imageUrl}
                      alt="Ảnh flashcard chờ tạo"
                      width={1000}
                      height={1400}
                      crop="fill"
                      className="h-auto w-full object-cover"
                    />
                  </div>
                </div>
              ) : null}

              <CldUploadWidget
                config={{
                  cloud: {
                    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
                    apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
                  },
                }}
                signatureEndpoint="/api/upload"
                options={{
                  folder: "flashcards",
                  multiple: false,
                  maxFiles: 1,
                  resourceType: "image",
                  clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "gif"],
                  maxFileSize: 5_000_000,
                }}
                onSuccess={(result) => {
                  const info = typeof result.info === "object" && result.info !== null ? result.info : null;
                  const imageUrl =
                    info && "secure_url" in info && typeof info.secure_url === "string" ? info.secure_url : null;

                  if (!imageUrl) {
                    showFeedback("error", "Không lấy được đường dẫn ảnh sau khi upload");
                    return;
                  }

                  setPendingUpload({ imageUrl });
                  showFeedback("success", "Ảnh đã tải lên. Bấm Tạo thẻ mới để lưu.");
                }}
                onError={(error) => {
                  const message =
                    typeof error === "string"
                      ? error
                      : error && "statusText" in error && typeof error.statusText === "string"
                        ? error.statusText
                        : "Upload thất bại";
                  showFeedback("error", message);
                }}
              >
                {({ open }) => (
                  <button
                    type="button"
                    onClick={() => open()}
                    disabled={isPending}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingUpload ? "Chọn ảnh khác" : "Chọn ảnh và tải lên"}
                  </button>
                )}
              </CldUploadWidget>

              <button
                type="button"
                onClick={handleAddCard}
                disabled={isPending || !pendingUpload}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Đang tạo thẻ..." : "Tạo thẻ mới"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: card list panel */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Danh sách thẻ</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {localCards.length} thẻ
          </span>
        </div>

        <div className="p-5">
          {localCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-6 py-16 text-center">
              <p className="text-sm font-medium text-slate-400">Chưa có thẻ nào</p>
              <p className="mt-1 text-xs text-slate-400">Tải ảnh đầu tiên ở bảng bên trái để bắt đầu.</p>
            </div>
          ) : (
            <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 280px))" }}>
              {sortedCards.map((card) => (
                <div key={card.id} className="relative group w-full max-w-85 mx-auto">
                  <FlashcardCard
                    imageUrl={card.imageUrl}
                    alt={`Flashcard ${card.order}`}
                    caption={card.caption}
                    overlayChip="Nhấn để lật"
                    captionFallback="Chưa có caption cho mặt sau của thẻ này."
                    captionHint="Nhấn để lật"
                    flipped={!!flippedCards[card.id]}
                    onClick={() => toggleCard(card.id)}
                    className="flashcard-shell text-left transition-transform duration-200 hover:-translate-y-1"
                    imageWidth={1000}
                    imageHeight={1400}
                  />

                  {!readOnly && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title="Chỉnh sửa caption"
                        onClick={(e) => { e.stopPropagation(); setEditingCard({ id: card.id, caption: card.caption ?? "" }); }}
                        disabled={isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur-sm hover:bg-white hover:text-blue-600 transition-colors disabled:opacity-50"
                      >
                        <FaIcon icon={faPen} className="text-[11px]" />
                      </button>
                      <button
                        type="button"
                        title="Xóa thẻ"
                        onClick={(e) => { e.stopPropagation(); handleRemove(card.id); }}
                        disabled={isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur-sm hover:bg-white hover:text-rose-600 transition-colors disabled:opacity-50"
                      >
                        <FaIcon icon={faTrash} className="text-[11px]" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Edit card modal */}
      {editingCard && (() => {
        const card = localCards.find((c) => c.id === editingCard.id);
        if (!card) return null;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingCard(null)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
              className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Chỉnh sửa thẻ #{card.order}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Chỉnh caption cho mặt sau của thẻ</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <FaIcon icon={faXmark} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Image preview */}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <CldImage
                    src={card.imageUrl}
                    alt={`Flashcard ${card.order}`}
                    width={600}
                    height={400}
                    crop="fill"
                    className="h-40 w-full object-cover"
                  />
                </div>

                {/* Caption textarea */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Caption mặt sau
                  </label>
                  <textarea
                    value={editingCard.caption}
                    onChange={(e) =>
                      setEditingCard((prev) => (prev ? { ...prev, caption: e.target.value } : null))
                    }
                    rows={4}
                    placeholder="Gợi ý, giải thích ngắn, hoặc ghi nhớ nhanh..."
                    autoFocus
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveCaption}
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}