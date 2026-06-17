"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FaIcon } from "@/components/ui/FaIcon";
import { faTrophy, faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FlashcardCard } from "@/components/flashcards/FlashcardCard";
import {
  completeFlashcardSessionAction,
  startFlashcardSessionAction,
} from "@/lib/student/actions";
import { DIFFICULTY_LABEL, DIFFICULTY_COLOR } from "@/lib/constants/labels";
import {
  createStudyQueue,
  rateCurrent,
  currentCardId,
  isComplete,
  masteredCount,
  remainingThisRound,
  progressRatio,
  type StudyQueueState,
} from "@/lib/flashcards/study-queue";

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

const DIFFICULTY_SKIN: Record<Props["difficulty"], string> = {
  EASY: "flashcard-rarity-easy",
  MEDIUM: "flashcard-rarity-medium",
  HARD: "flashcard-rarity-hard",
};

const MUTED = "color-mix(in srgb, var(--foreground) 55%, transparent)";
const MUTED_SOFT = "color-mix(in srgb, var(--foreground) 45%, transparent)";

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
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [queue, setQueue] = useState<StudyQueueState>(() => createStudyQueue([]));

  const total = cards.length;
  const showcaseCard = cards[0];
  const cardMap = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

  const toggleFlip = useCallback(() => setFlipped((value) => !value), []);

  function handleStart() {
    startTransition(async () => {
      const { sessionId: nextSessionId } = await startFlashcardSessionAction(setId);
      const ids = shuffleCards(cards).map((card) => card.id);
      setQueue(createStudyQueue(ids));
      setSessionId(nextSessionId);
      setStarted(true);
      setFlipped(false);
      setCompleted(false);
    });
  }

  const handleRate = useCallback(
    (known: boolean) => {
      const next = rateCurrent(queue, known);
      setQueue(next);
      setFlipped(false);
      if (isComplete(next)) {
        startTransition(async () => {
          if (sessionId) await completeFlashcardSessionAction(sessionId);
          setCompleted(true);
        });
      }
    },
    [queue, sessionId],
  );

  function handleRestart() {
    setStarted(false);
    setSessionId(null);
    setFlipped(false);
    setCompleted(false);
    setQueue(createStudyQueue([]));
  }

  // Phím tắt: Space lật thẻ; khi đã lật, 1 = chưa thuộc, 2 = đã thuộc.
  useEffect(() => {
    if (!started || completed) return;
    function onKey(event: KeyboardEvent) {
      if (event.code === "Space") {
        event.preventDefault();
        toggleFlip();
      } else if (flipped && event.key === "1") {
        handleRate(false);
      } else if (flipped && event.key === "2") {
        handleRate(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, completed, flipped, toggleFlip, handleRate]);

  if (completed) {
    const summary = [
      { label: "Tổng thẻ", value: total },
      { label: "Thuộc ngay lần đầu", value: queue.firstTryMastered },
      { label: "Số vòng", value: queue.round },
    ];
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <FaIcon icon={faTrophy} className="text-5xl text-yellow-500" />
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Hoàn thành!
          </h2>
          <p className="mt-2 text-sm" style={{ color: MUTED }}>
            Bạn đã nắm hết {total} thẻ trong bộ “{title}”.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {summary.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl px-5 py-3"
              style={{ backgroundColor: "var(--surface-strong)", border: "1.5px solid var(--border-soft)" }}
            >
              <div className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                {item.value}
              </div>
              <div className="text-xs" style={{ color: MUTED }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRestart}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--primary)" }}
          >
            Ôn lại
          </button>
          <button
            onClick={() => router.push("/student/flashcards")}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-75"
            style={{ border: "1.5px solid var(--border-soft)", color: "var(--foreground)" }}
          >
            Về danh sách
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="grid gap-8 py-6 lg:grid-cols-[minmax(0,300px),minmax(0,1fr)] lg:items-center">
        <div className="flex justify-center lg:justify-start">
          <FlashcardCard
            imageUrl={showcaseCard?.imageUrl ?? null}
            alt={title}
            overlayChip="Nhấn để bắt đầu"
            onClick={handleStart}
            disabled={isPending || total === 0}
            aria-label={`Bắt đầu học bộ flashcard ${title}`}
            className={`flashcard-shell flashcard-shell-study ${DIFFICULTY_SKIN[difficulty]} w-full max-w-50 sm:max-w-60 md:max-w-70 lg:max-w-80 text-left disabled:cursor-progress disabled:opacity-90`}
            priority
          />
        </div>

        <div
          className="rounded-3xl p-6"
          style={{
            backgroundColor: "var(--surface-strong)",
            border: "1.5px solid var(--border-soft)",
          }}
        >
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            {title}
          </h2>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className={`rounded-full px-3 py-1.5 ${DIFFICULTY_COLOR[difficulty]}`}>
              {DIFFICULTY_LABEL[difficulty]}
            </span>
            <span
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: "var(--surface-muted)", color: "var(--primary-dark)" }}
            >
              {total} thẻ
            </span>
            <span
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: "var(--surface-muted)", color: "var(--primary-dark)" }}
            >
              {totalSessions} lượt ôn
            </span>
          </div>

          <p className="mt-4 text-sm leading-7" style={{ color: "color-mix(in srgb, var(--foreground) 65%, transparent)" }}>
            Nhìn ảnh mặt trước, tự nhớ lại kiến thức rồi lật thẻ để xem đáp án. Mỗi thẻ tự chấm{" "}
            <strong style={{ color: "var(--foreground)" }}>đã thuộc</strong> hoặc{" "}
            <strong style={{ color: "var(--foreground)" }}>chưa thuộc</strong> — thẻ chưa thuộc sẽ
            được lặp lại tới khi bạn nắm hết.
          </p>

          <button
            onClick={handleStart}
            disabled={isPending || total === 0}
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {isPending ? "Đang tải..." : "Bắt đầu ôn tập"}
          </button>
        </div>
      </div>
    );
  }

  const currentId = currentCardId(queue);
  const current = currentId ? cardMap.get(currentId) : undefined;
  if (!current) return null;

  const masteredN = masteredCount(queue);
  const progress = progressRatio(queue) * 100;

  return (
    <div className="mx-auto flex w-full max-w-85 sm:max-w-95 md:max-w-105 lg:max-w-120 xl:max-w-130 flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-sm font-medium" style={{ color: MUTED }}>
          {masteredN}/{total}
        </span>
        <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: "var(--surface-muted)" }}>
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: "var(--primary)" }}
          />
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: "var(--surface-muted)", color: "var(--primary-dark)" }}
        >
          Vòng {queue.round} · còn {remainingThisRound(queue)}
        </span>
      </div>

      <div className="flex justify-center">
        <FlashcardCard
          imageUrl={current.imageUrl}
          alt={title}
          caption={current.caption}
          overlayChip={DIFFICULTY_LABEL[difficulty]}
          captionHint="Nhấn vào thẻ để quay lại mặt trước"
          flipped={flipped}
          onClick={toggleFlip}
          className={`flashcard-shell flashcard-shell-study ${DIFFICULTY_SKIN[difficulty]} w-full max-w-55 sm:max-w-65 md:max-w-75 lg:max-w-85 xl:max-w-90 text-left transition-transform duration-200 hover:-translate-y-1`}
          loading="eager"
        />
      </div>

      {!flipped ? (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={toggleFlip}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--surface-muted)", color: "var(--primary-dark)" }}
          >
            Lật thẻ
          </button>
          <p className="text-xs" style={{ color: MUTED_SOFT }}>
            Phím tắt: <strong>Space</strong> lật thẻ
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="grid w-full grid-cols-2 gap-3">
            <button
              onClick={() => handleRate(false)}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
              style={{ border: "1.5px solid rgba(220,38,38,0.4)", color: "#dc2626", backgroundColor: "rgba(220,38,38,0.06)" }}
            >
              <FaIcon icon={faXmark} /> Chưa thuộc
            </button>
            <button
              onClick={() => handleRate(true)}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#16a34a" }}
            >
              <FaIcon icon={faCheck} /> Đã thuộc
            </button>
          </div>
          <p className="text-xs" style={{ color: MUTED_SOFT }}>
            Phím tắt: <strong>1</strong> chưa thuộc · <strong>2</strong> đã thuộc
          </p>
        </div>
      )}
    </div>
  );
}
