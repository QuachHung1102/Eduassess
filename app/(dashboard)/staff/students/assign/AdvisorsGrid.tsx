"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import Link from "next/link";
import { FaIcon } from "@/components/ui/FaIcon";
import { faUserTie, faUsers, faChevronRight } from "@fortawesome/free-solid-svg-icons";

interface Advisor {
  id: string;
  name: string | null;
  email: string | null;
  studentCount: number;
}

interface Props {
  advisors: Advisor[];
  totalStudents: number;
}

export function AdvisorsGrid({ advisors, totalStudents }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".advisor-card", {
        opacity: 0,
        y: 24,
        duration: 0.45,
        stagger: 0.08,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    }, containerRef.current);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {advisors.map((advisor) => {
        const pct = totalStudents > 0 ? Math.round((advisor.studentCount / totalStudents) * 100) : 0;
        const initials = advisor.name
          ? advisor.name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase()
          : "?";

        return (
          <Link
            key={advisor.id}
            href={`/staff/students/assign/${advisor.id}`}
            className="advisor-card primary-panel flex items-center gap-4 px-5 py-4 hover-card-soft focus-ring-soft transition-colors group"
          >
            {/* Avatar */}
            <div
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                background: "color-mix(in srgb, var(--primary) 15%, var(--surface))",
                color: "var(--primary)",
                border: "2px solid color-mix(in srgb, var(--primary) 25%, transparent)",
              }}
            >
              {advisor.name ? initials : <FaIcon icon={faUserTie} />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>
                {advisor.name ?? advisor.email}
              </div>
              <div className="text-xs mt-0.5 truncate" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                {advisor.email}
              </div>
              {/* Progress bar */}
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--border-soft)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: "linear-gradient(90deg, var(--primary), var(--primary-dark, var(--primary)))",
                    }}
                  />
                </div>
                <span className="text-xs flex-shrink-0 flex items-center gap-1" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                  <FaIcon icon={faUsers} />
                  <span className="font-semibold" style={{ color: advisor.studentCount > 0 ? "var(--primary)" : undefined }}>
                    {advisor.studentCount}
                  </span>
                  HS
                </span>
              </div>
            </div>

            {/* Chevron */}
            <span
              className="flex-shrink-0 text-xs transition-transform duration-200 group-hover:translate-x-0.5"
              style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}
            >
              <FaIcon icon={faChevronRight} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
