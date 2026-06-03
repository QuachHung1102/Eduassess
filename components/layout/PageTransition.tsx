"use client";

/**
 * PageTransition — bọc toàn bộ nội dung mỗi trang dashboard.
 *
 * Hoạt động:
 *  1. Khi chuyển route: container fade-in + slide-up nhẹ (0.35s)
 *  2. Đồng thời stagger từng .clay-card và .primary-panel bên trong (0.07s/card)
 *
 * Cách dùng: bọc {children} trong dashboard layout — không cần sửa gì ở từng page.
 */

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { usePathname } from "next/navigation";

interface Props {
  children: React.ReactNode;
}

export function PageTransition({ children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const pathname = usePathname();

  useEffect(() => {
    if (!containerRef.current) return;

    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const stage = containerRef.current;
    const panels = Array.from(stage.querySelectorAll<HTMLElement>(".primary-panel, .clay-card"));

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      tl.from(stage, {
        opacity: 0,
        y: 10,
        duration: 0.3,
        clearProps: "transform,opacity",
      });

      if (panels.length > 0) {
        tl.from(
          panels,
          {
            opacity: 0,
            y: 18,
            duration: 0.4,
            stagger: 0.07,
            clearProps: "transform,opacity",
          },
          "-=0.15"
        );
      }
    }, stage);

    return () => ctx.revert();
  }, [pathname]);

  return (
    <div ref={containerRef} className="flex flex-col flex-1 min-h-0">
      {children}
    </div>
  );
}
