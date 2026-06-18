"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { FaIcon } from "@/components/ui/FaIcon";
import { faVolumeHigh, faVolumeXmark } from "@fortawesome/free-solid-svg-icons";
import { getUnreadCountAction } from "@/lib/notifications/actions";

const KEY = "notify-sound";
const EVENT = "notify-sound-change";
const POLL_MS = 25_000;

/** Tiếng "ding" tổng hợp bằng Web Audio (không cần file). */
function playDing() {
  const Ctx = window.AudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
  osc.start();
  osc.stop(ctx.currentTime + 0.42);
  osc.onended = () => ctx.close();
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}
function readEnabled() {
  return typeof window === "undefined" ? true : localStorage.getItem(KEY) !== "off";
}

/** Poll số thông báo chưa đọc; khi tăng ⇒ phát âm thanh. Toggle lưu localStorage. */
export function NotificationSound({ initialCount }: { initialCount: number }) {
  const enabled = useSyncExternalStore(subscribe, readEnabled, () => true);
  const lastCount = useRef(initialCount);

  useEffect(() => {
    const id = setInterval(async () => {
      const count = await getUnreadCountAction();
      if (count > lastCount.current && readEnabled()) playDing();
      lastCount.current = count;
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  function toggle() {
    const next = !enabled;
    localStorage.setItem(KEY, next ? "on" : "off");
    window.dispatchEvent(new Event(EVENT));
    if (next) playDing(); // phản hồi khi bật
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? "Tắt âm thông báo" : "Bật âm thông báo"}
      aria-label={enabled ? "Tắt âm thông báo" : "Bật âm thông báo"}
      className="flex items-center justify-center h-7 w-7 rounded-lg hover:text-white transition-colors"
      style={{ color: "var(--sidebar-text)", opacity: 0.7 }}
    >
      <FaIcon icon={enabled ? faVolumeHigh : faVolumeXmark} className="text-xs" />
    </button>
  );
}
