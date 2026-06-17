import { describe, expect, it } from "vitest";
import {
  createStudyQueue,
  rateCurrent,
  currentCardId,
  isComplete,
  masteredCount,
  remainingThisRound,
  progressRatio,
} from "@/lib/flashcards/study-queue";

describe("createStudyQueue", () => {
  it("bắt đầu ở vòng 1 với toàn bộ thẻ, thẻ hiện tại là thẻ đầu", () => {
    const s = createStudyQueue(["a", "b", "c"]);
    expect(s.round).toBe(1);
    expect(s.total).toBe(3);
    expect(currentCardId(s)).toBe("a");
    expect(masteredCount(s)).toBe(0);
    expect(remainingThisRound(s)).toBe(3);
    expect(isComplete(s)).toBe(false);
  });

  it("bộ rỗng ⇒ hoàn thành ngay, không có thẻ hiện tại", () => {
    const s = createStudyQueue([]);
    expect(isComplete(s)).toBe(true);
    expect(currentCardId(s)).toBeNull();
    expect(s.total).toBe(0);
  });
});

describe("rateCurrent — đã thuộc", () => {
  it("đã thuộc ⇒ thẻ rời hàng đợi, sang thẻ kế, tính thuộc-lần-đầu ở vòng 1", () => {
    const s0 = createStudyQueue(["a", "b"]);
    const s1 = rateCurrent(s0, true);
    expect(currentCardId(s1)).toBe("b");
    expect(masteredCount(s1)).toBe(1);
    expect(s1.firstTryMastered).toBe(1);
    expect(s1.round).toBe(1);
    // pure: state cũ không bị đột biến
    expect(currentCardId(s0)).toBe("a");
    expect(masteredCount(s0)).toBe(0);
  });

  it("thuộc hết ngay vòng 1 ⇒ hoàn thành, vẫn vòng 1, thuộc-lần-đầu = tổng", () => {
    let s = createStudyQueue(["a", "b", "c"]);
    s = rateCurrent(s, true);
    s = rateCurrent(s, true);
    s = rateCurrent(s, true);
    expect(isComplete(s)).toBe(true);
    expect(masteredCount(s)).toBe(3);
    expect(s.firstTryMastered).toBe(3);
    expect(s.round).toBe(1);
    expect(currentCardId(s)).toBeNull();
    expect(progressRatio(s)).toBe(1);
  });
});

describe("rateCurrent — chưa thuộc ⇒ lặp vòng sau", () => {
  it("thẻ chưa thuộc quay lại ở vòng 2 sau khi hết vòng 1", () => {
    let s = createStudyQueue(["a", "b"]);
    s = rateCurrent(s, false); // a chưa thuộc
    expect(currentCardId(s)).toBe("b");
    expect(s.round).toBe(1);
    s = rateCurrent(s, true); // b đã thuộc ⇒ hết vòng 1 ⇒ vòng 2 với [a]
    expect(s.round).toBe(2);
    expect(currentCardId(s)).toBe("a");
    expect(isComplete(s)).toBe(false);
    expect(masteredCount(s)).toBe(1);
  });

  it("thuộc ở vòng 2 KHÔNG tính là thuộc-lần-đầu", () => {
    let s = createStudyQueue(["a"]);
    s = rateCurrent(s, false); // a chưa thuộc ⇒ vòng 2 với [a]
    expect(s.round).toBe(2);
    expect(currentCardId(s)).toBe("a");
    s = rateCurrent(s, true); // giờ thuộc
    expect(isComplete(s)).toBe(true);
    expect(masteredCount(s)).toBe(1);
    expect(s.firstTryMastered).toBe(0);
  });
});

describe("progressRatio phản ánh đã thuộc / tổng", () => {
  it("1/4 thẻ thuộc ⇒ 0.25", () => {
    let s = createStudyQueue(["a", "b", "c", "d"]);
    s = rateCurrent(s, true);
    expect(progressRatio(s)).toBeCloseTo(0.25);
  });
});

describe("không kẹt vòng lặp vô hạn", () => {
  it("chưa thuộc nhiều vòng rồi cũng kết thúc khi cuối cùng thuộc", () => {
    let s = createStudyQueue(["a"]);
    s = rateCurrent(s, false); // → vòng 2
    s = rateCurrent(s, false); // → vòng 3
    s = rateCurrent(s, false); // → vòng 4
    expect(isComplete(s)).toBe(false);
    expect(s.round).toBe(4);
    s = rateCurrent(s, true);
    expect(isComplete(s)).toBe(true);
  });
});
