"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function DashboardRouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const frame = window.requestAnimationFrame(() => setActive(true));
    const timer = window.setTimeout(() => setActive(false), 520);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className={[
        "dashboard-route-loader fixed top-0 left-0 right-0 z-[70] h-[3px] pointer-events-none",
        active ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <span className="dashboard-route-loader-bar block h-full" />
    </div>
  );
}
