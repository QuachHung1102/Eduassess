"use client";

import { CldImage } from "next-cloudinary";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { InteractiveFlashcard } from "@/components/flashcards/InteractiveFlashcard";
import {
  completeFlashcardSessionAction,
  startFlashcardSessionAction,
} from "@/lib/student/actions";

type Card = {
  id: string;
  imageUrl: string;
  caption: string | null;
  order: number;
};

type Props = {
  setId: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  cards: Card[];
  totalSessions: number;
};

const DIFFICULTY_LABEL: Record<Props["difficulty"], string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

const DIFFICULTY_COLOR: Record<Props["difficulty"], string> = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD: "bg-red-100 text-red-700",
};

const DIFFICULTY_SKIN: Record<Props["difficulty"], string> = {
  EASY: "flashcard-rarity-easy",
  MEDIUM: "flashcard-rarity-medium",
  HARD: "flashcard-rarity-hard",
};

function shuffleCards(cards: Card[]) {
  const next = [...cards];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function FlashcardStudyClient({ setId, title, difficulty, cards, totalSessions }: Props) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [studyCards, setStudyCards] = useState(cards);

  const total = studyCards.length;
  const current = studyCards[currentIndex];
  const showcaseCard = cards[0];
  const progress = useMemo(() => ((currentIndex + 1) / total) * 100, [currentIndex, total]);

  function handleStart() {
    startTransition(async () => {
      const { sessionId: nextSessionId } = await startFlashcardSessionAction(setId);
      setStudyCards(shuffleCards(cards));
      setSessionId(nextSessionId);
      setStarted(true);
      setCurrentIndex(0);
      setFlipped(false);
      setCompleted(false);
    });
  }

  function handleNext() {
    if (currentIndex < total - 1) {
      setCurrentIndex((value) => value + 1);
      setFlipped(false);
      return;
    }

    startTransition(async () => {
      if (sessionId) {
        await completeFlashcardSessionAction(sessionId);
      }
      setCompleted(true);
    });
  }

  function handlePrev() {
    if (currentIndex === 0) return;
    setCurrentIndex((value) => value - 1);
    setFlipped(false);
  }

  function handleRestart() {
    setStarted(false);
    setSessionId(null);
    setCurrentIndex(0);
    setFlipped(false);
    setCompleted(false);
    setStudyCards(cards);
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900">Hoàn thành!</h2>
        <p className="text-gray-500">Bạn đã ôn xong {total} thẻ trong bộ “{title}”.</p>
        <div className="flex gap-3">
          <button
            onClick={handleRestart}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Ôn lại
          </button>
          <button
            onClick={() => router.push("/student/flashcards")}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="grid gap-8 py-6 lg:grid-cols-[minmax(0,300px),minmax(0,1fr)] lg:items-center">
        <div className="flex justify-center lg:justify-start">
          <InteractiveFlashcard
            onClick={handleStart}
            disabled={isPending}
            className={`flashcard-shell flashcard-shell-study ${DIFFICULTY_SKIN[difficulty]} w-full max-w-80 text-left disabled:cursor-progress disabled:opacity-90`}
            aria-label={`Bắt đầu học bộ flashcard ${title}`}
          >
            <div className="flashcard-face">
              <div className="flashcard-head">
                <div>
                  <p className="flashcard-kicker">Showcase Deck</p>
                  <p className="flashcard-title">{title}</p>
                </div>
                <span className="flashcard-chip flashcard-chip-front">{DIFFICULTY_LABEL[difficulty]}</span>
              </div>

              <div className="flashcard-nameplate">Bấm vào card để bắt đầu</div>

              <div className="flashcard-panel flashcard-media">
                {showcaseCard ? (
                  <CldImage
                    src={showcaseCard.imageUrl}
                    alt={title}
                    width={756}
                    height={1056}
                    crop="fill"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-slate-200 text-sm font-semibold text-slate-500">
                    Flashcard Preview
                  </div>
                )}
                <div className="flashcard-overlay-chip">Starter Preview</div>
              </div>
            </div>
          </InteractiveFlashcard>
        </div>

        <div className="rounded-4xl border border-slate-200/80 bg-white/88 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Showcase Study Mode
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Bộ thẻ này được trình bày theo phong cách trading card để việc ôn tập trực quan hơn. Mỗi thẻ có mặt trước là hình ảnh ghi nhớ và mặt sau là caption ngắn để tự kiểm tra kiến thức.
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
            <span className={`rounded-full px-3 py-1.5 ${DIFFICULTY_COLOR[difficulty]}`}>{DIFFICULTY_LABEL[difficulty]}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">{total} thẻ</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">{totalSessions} lượt ôn</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">Front ảnh · Back caption</span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Visual Cue</p>
              <p className="mt-2 text-sm leading-6 text-emerald-950">Nhìn ảnh trước, tự nhớ lại khái niệm rồi mới lật sang mặt sau.</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Recall Loop</p>
              <p className="mt-2 text-sm leading-6 text-amber-950">Học tốt nhất khi tự đoán đáp án trước khi xem caption xác nhận.</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">Session Mode</p>
              <p className="mt-2 text-sm leading-6 text-sky-950">Các thẻ sẽ được xáo trộn để tránh học thuộc thứ tự cố định.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleStart}
              disabled={isPending}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              {isPending ? "Đang tải..." : "Bắt đầu ôn tập"}
            </button>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Nhấn vào card hoặc nút để vào phiên học</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-sm text-gray-500">
          {currentIndex + 1} / {total}
        </span>
        <div className="h-2 flex-1 rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLOR[difficulty]}`}>
          {DIFFICULTY_LABEL[difficulty]}
        </span>
      </div>

      <div className="flex justify-center">
        <InteractiveFlashcard
          onClick={() => setFlipped((value) => !value)}
          flipped={flipped}
          className={`flashcard-shell flashcard-shell-study ${DIFFICULTY_SKIN[difficulty]} w-full max-w-85 text-left transition-transform duration-200 hover:-translate-y-1`}
        >
          <div className="flashcard-flip-stage">
            <div className="flashcard-flip-inner">
              <div className="flashcard-face flashcard-face-front">
                <div className="flashcard-head">
                  <div>
                    <p className="flashcard-kicker">Flash Card</p>
                    <p className="flashcard-title">{title}</p>
                  </div>
                  <span className="flashcard-chip flashcard-chip-front">Front</span>
                </div>

                <div className="flashcard-nameplate">{title}</div>

                <div className="flashcard-panel flashcard-media">
                  <CldImage
                    src={current.imageUrl}
                    alt={title}
                    width={756}
                    height={1056}
                    crop="fill"
                    className="h-full w-full object-cover"
                  />
                  <div className="flashcard-overlay-chip">{DIFFICULTY_LABEL[difficulty]}</div>
                </div>
              </div>

              <div className="flashcard-face flashcard-face-back flashcard-face-rear">
                <div className="flashcard-head">
                  <div>
                    <p className="flashcard-kicker">Flash Card</p>
                    <p className="flashcard-title">{title}</p>
                  </div>
                  <span className="flashcard-chip flashcard-chip-back">Back</span>
                </div>

                <div className="flashcard-nameplate">{title}</div>

                <div className="flashcard-panel flashcard-copy-panel">
                  <p className="flashcard-copy-label">Caption mặt sau</p>
                  <div className="flashcard-copy">
                    {current.caption?.trim() ? current.caption : "Thẻ này chưa có caption."}
                  </div>

                  <p className="flashcard-copy-hint">Nhấn vào thẻ để quay lại mặt trước</p>
                </div>
              </div>
            </div>
          </div>
        </InteractiveFlashcard>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Trước
        </button>

        {!flipped ? (
          <button
            onClick={() => setFlipped(true)}
            className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            Lật thẻ
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {currentIndex === total - 1 ? (isPending ? "Đang lưu..." : "Hoàn thành ✓") : "Tiếp theo →"}
          </button>
        )}
      </div>
    </div>
  );
}
