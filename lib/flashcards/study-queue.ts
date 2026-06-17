// Hàng đợi ôn tập adaptive theo VÒNG (pure: không React, không DB).
//
// Vòng 1 gồm mọi thẻ. Mỗi thẻ được chấm "đã thuộc" hoặc "chưa thuộc":
//   - đã thuộc  → thẻ rời hàng đợi.
//   - chưa thuộc → thẻ dồn sang vòng kế, học lại sau.
// Hết thẻ trong vòng mà còn thẻ chưa thuộc ⇒ sang vòng mới. Lặp tới khi
// mọi thẻ đã thuộc. Toàn bộ hàm trả về STATE MỚI, không đột biến state cũ
// (để dùng trực tiếp làm React state).

export type StudyQueueState = {
  /** Vòng hiện tại, bắt đầu từ 1. */
  round: number;
  /** Thẻ còn lại trong vòng hiện tại; phần tử đầu là thẻ đang học. */
  queue: string[];
  /** Thẻ chưa thuộc, sẽ học lại ở vòng kế. */
  nextRound: string[];
  /** Thẻ đã thuộc (theo thứ tự được đánh dấu). */
  mastered: string[];
  /** Tổng số thẻ trong phiên. */
  total: number;
  /** Số thẻ thuộc ngay lần đầu (chấm đã thuộc khi còn ở vòng 1). */
  firstTryMastered: number;
};

export function createStudyQueue(cardIds: string[]): StudyQueueState {
  return {
    round: 1,
    queue: [...cardIds],
    nextRound: [],
    mastered: [],
    total: cardIds.length,
    firstTryMastered: 0,
  };
}

export function currentCardId(state: StudyQueueState): string | null {
  return state.queue[0] ?? null;
}

export function isComplete(state: StudyQueueState): boolean {
  return state.queue.length === 0 && state.nextRound.length === 0;
}

export function masteredCount(state: StudyQueueState): number {
  return state.mastered.length;
}

export function remainingThisRound(state: StudyQueueState): number {
  return state.queue.length;
}

export function progressRatio(state: StudyQueueState): number {
  if (state.total === 0) return 1;
  return state.mastered.length / state.total;
}

/** Chấm thẻ đang học là đã thuộc (`known = true`) hay chưa. Trả về state mới. */
export function rateCurrent(state: StudyQueueState, known: boolean): StudyQueueState {
  const cardId = currentCardId(state);
  if (cardId === null) return state;

  let queue = state.queue.slice(1);
  let nextRound = state.nextRound;
  let mastered = state.mastered;
  let firstTryMastered = state.firstTryMastered;
  let round = state.round;

  if (known) {
    mastered = [...mastered, cardId];
    if (round === 1) firstTryMastered += 1;
  } else {
    nextRound = [...nextRound, cardId];
  }

  // Hết vòng hiện tại nhưng còn thẻ chưa thuộc ⇒ mở vòng kế.
  if (queue.length === 0 && nextRound.length > 0) {
    round += 1;
    queue = nextRound;
    nextRound = [];
  }

  return { ...state, round, queue, nextRound, mastered, firstTryMastered };
}
