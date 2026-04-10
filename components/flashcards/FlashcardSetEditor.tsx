"use client";

import { CldImage, CldUploadWidget } from "next-cloudinary";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { InteractiveFlashcard } from "@/components/flashcards/InteractiveFlashcard";
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
  const [captions, setCaptions] = useState<Record<string, string>>(
    Object.fromEntries(cards.map((card) => [card.id, card.caption ?? ""]))
  );
  const [draftCaption, setDraftCaption] = useState("");
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const sortedCards = useMemo(
    () => [...localCards].sort((leftCard, rightCard) => leftCard.order - rightCard.order),
    [localCards]
  );

  useEffect(() => {
    setLocalCards(cards);
    setCaptions(Object.fromEntries(cards.map((card) => [card.id, card.caption ?? ""])));
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
      showFeedback("error", "Hay tai anh len truoc khi tao the");
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
          showFeedback("error", result.error ?? "Khong the them the");
          return;
        }

        if (result?.card) {
          setLocalCards((current) => [...current, result.card]);
          setCaptions((current) => ({
            ...current,
            [result.card.id]: result.card.caption ?? "",
          }));
          setFlippedCards((current) => ({
            ...current,
            [result.card.id]: false,
          }));
        }

        clearDraftCard();
        showFeedback("success", "Da them the moi");
        router.refresh();
      } catch (error) {
        showFeedback("error", error instanceof Error ? error.message : "Upload that bai");
      }
    });
  }

  function handleRemove(cardId: string) {
    if (readOnly) return;
    if (!window.confirm("Xoa the nay?")) return;

    startTransition(async () => {
      const result =
        role === "teacher"
          ? await removeCardFromFlashcardSetAction(cardId, setId)
          : await adminRemoveCardFromFlashcardSetAction(cardId, setId);

      if (result && "error" in result) {
        showFeedback("error", result.error ?? "Khong the xoa the");
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
      setCaptions((current) => {
        const next = { ...current };
        delete next[cardId];
        return next;
      });
      setFlippedCards((current) => {
        const next = { ...current };
        delete next[cardId];
        return next;
      });

      showFeedback("success", "Da xoa the");
      router.refresh();
    });
  }

  function handleSaveCaption(cardId: string) {
    if (readOnly) return;
    startTransition(async () => {
      const result =
        role === "teacher"
          ? await updateCardInFlashcardSetAction(cardId, setId, { caption: captions[cardId] ?? "" })
          : await adminUpdateCardInFlashcardSetAction(cardId, setId, { caption: captions[cardId] ?? "" });

      if (result && "error" in result) {
        showFeedback("error", result.error ?? "Khong the luu caption");
        return;
      }

      setLocalCards((current) =>
        current.map((card) =>
          card.id === cardId
            ? {
                ...card,
                caption: (captions[cardId] ?? "").trim() || null,
              }
            : card
        )
      );

      showFeedback("success", "Da luu chu thich");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_1fr]">

      {/* Left: form panel (sticky) */}
      <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Them the moi</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {readOnly
              ? "Bo the chia se - chi xem, khong chinh sua."
              : "Mat truoc la anh, mat sau la caption. Tai anh len roi bam tao the."}
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
              Muon tao bo the rieng, hay dung nut <strong>Tao bo flashcard</strong>.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Caption mat sau
                </label>
                <textarea
                  value={draftCaption}
                  onChange={(event) => setDraftCaption(event.target.value)}
                  rows={4}
                  placeholder="Goi y, giai thich ngan, hoac ghi nho nhanh..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {pendingUpload ? (
                <div className="overflow-hidden rounded-2xl border border-sky-200 bg-sky-50">
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-sky-800">Anh da san sang</p>
                      <p className="text-xs text-sky-600">Bam Tao the moi de luu vao he thong</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearDraftCard}
                      disabled={isPending}
                      className="shrink-0 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                    >
                      Bo
                    </button>
                  </div>
                  <div className="border-t border-sky-200">
                    <CldImage
                      src={pendingUpload.imageUrl}
                      alt="Anh flashcard cho tao"
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
                    showFeedback("error", "Khong lay duoc duong dan anh sau khi upload");
                    return;
                  }

                  setPendingUpload({ imageUrl });
                  showFeedback("success", "Anh da tai len. Bam Tao the moi de luu.");
                }}
                onError={(error) => {
                  const message =
                    typeof error === "string"
                      ? error
                      : error && "statusText" in error && typeof error.statusText === "string"
                        ? error.statusText
                        : "Upload that bai";
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
                    {pendingUpload ? "Chon anh khac" : "Chon anh va tai len"}
                  </button>
                )}
              </CldUploadWidget>

              <button
                type="button"
                onClick={handleAddCard}
                disabled={isPending || !pendingUpload}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Dang tao the..." : "Tao the moi"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: card list panel */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Danh sach the</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {localCards.length} the
          </span>
        </div>

        <div className="p-5">
          {localCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-6 py-16 text-center">
              <p className="text-sm font-medium text-slate-400">Chua co the nao</p>
              <p className="mt-1 text-xs text-slate-400">Tai anh dau tien o bang ben trai de bat dau.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {sortedCards.map((card) => (
                <div key={card.id} className="flex flex-col gap-3">
                  <InteractiveFlashcard
                    onClick={() => toggleCard(card.id)}
                    flipped={!!flippedCards[card.id]}
                    className="flashcard-shell text-left transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div className="flashcard-flip-stage">
                      <div className="flashcard-flip-inner">
                        <div className="flashcard-face flashcard-face-front">
                          <div className="flashcard-head">
                            <div>
                              <p className="flashcard-kicker">Flash Card</p>
                              <p className="flashcard-title">The {card.order}</p>
                            </div>
                            <span className="flashcard-chip flashcard-chip-front">Front</span>
                          </div>
                          <div className="flashcard-nameplate">The {card.order}</div>
                          <div className="flashcard-panel flashcard-media">
                            <CldImage
                              src={card.imageUrl}
                              alt={`Flashcard ${card.order}`}
                              width={1000}
                              height={1400}
                              crop="fill"
                              className="h-full w-full object-cover"
                            />
                            <div className="flashcard-overlay-chip">Tap to flip</div>
                          </div>
                        </div>

                        <div className="flashcard-face flashcard-face-back flashcard-face-rear">
                          <div className="flashcard-head">
                            <div>
                              <p className="flashcard-kicker">Flash Card</p>
                              <p className="flashcard-title">Mat sau the {card.order}</p>
                            </div>
                            <span className="flashcard-chip flashcard-chip-back">Back</span>
                          </div>
                          <div className="flashcard-nameplate">The {card.order}</div>
                          <div className="flashcard-panel flashcard-copy-panel">
                            <p className="flashcard-copy-label">Caption mat sau</p>
                            <div className="flashcard-copy">
                              {(captions[card.id] ?? "").trim() || "Chua co caption cho mat sau cua the nay."}
                            </div>
                            <p className="flashcard-copy-hint">Nhan de quay lai mat truoc</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </InteractiveFlashcard>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Caption</span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemove(card.id)}
                          disabled={isPending}
                          className="rounded-full px-2 py-0.5 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        >
                          Xoa the
                        </button>
                      )}
                    </div>
                    <textarea
                      value={captions[card.id] ?? ""}
                      onChange={(event) =>
                        setCaptions((current) => ({
                          ...current,
                          [card.id]: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Chua co caption..."
                      disabled={readOnly}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-default disabled:bg-slate-50"
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleSaveCaption(card.id)}
                        disabled={isPending}
                        className="mt-2 w-full rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                      >
                        Luu caption
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}