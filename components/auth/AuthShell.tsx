import type { ReactNode } from "react";
import Link from "next/link";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
};

const promoItems = [
  "Ôn tập bằng flashcard theo đúng chủ đề đang học",
  "Theo dõi tiến bộ để biết mình đang mạnh và yếu ở đâu",
  "Giữ trải nghiệm học tập sáng sủa, gọn và bớt áp lực hơn",
];

export default function AuthShell({
  eyebrow,
  title,
  description,
  footer,
  children,
}: AuthShellProps) {
  return (
    <div className="auth-shell min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl items-center gap-4 sm:gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
        <aside className="auth-promo relative hidden overflow-hidden p-8 lg:block lg:p-10 xl:p-12">
          <div className="absolute inset-x-auto right-0 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <Link href="/" className="relative inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-black text-sky-700 shadow-lg shadow-slate-900/10">
              EA
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight text-white">EduAssess</span>
              <span className="block text-sm text-sky-100/80">Một nơi để học, luyện và tiến bộ</span>
            </span>
          </Link>

          <div className="relative mt-10 max-w-md">
            <span className="inline-flex rounded-full bg-white/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.26em] text-sky-100">
              Thiết kế mới cho học sinh
            </span>
            <h2 className="mt-5 text-4xl font-black leading-tight text-white xl:text-[2.9rem]">
              Giao diện sáng hơn để học tập đỡ khô và đỡ ngợp hơn.
            </h2>
            <p className="mt-5 text-base leading-8 text-sky-100/84">
              Từ đăng nhập đến lúc làm bài, trải nghiệm được làm lại để gần với cảm giác của một
              sản phẩm học tập hiện đại hơn là một trang quản trị khô cứng.
            </p>
          </div>

          <div className="relative mt-8 space-y-3">
            {promoItems.map((item) => (
              <div key={item} className="rounded-[1.4rem] bg-white/10 px-4 py-4 text-sm leading-6 text-white/92 backdrop-blur">
                {item}
              </div>
            ))}
          </div>

          <div className="relative mt-8 grid grid-cols-3 gap-3 text-center">
            {[
              { value: "AI", label: "hỗ trợ ra đề" },
              { value: "Quiz", label: "luyện tập nhanh" },
              { value: "Flashcard", label: "ôn tập dễ nhớ" },
            ].map((item) => (
              <div key={item.value} className="rounded-[1.35rem] bg-white/10 px-3 py-4 backdrop-blur">
                <div className="text-sm font-black text-white xl:text-base">{item.value}</div>
                <div className="mt-1 text-[11px] leading-5 text-sky-100/78">{item.label}</div>
              </div>
            ))}
          </div>
        </aside>

        <section className="mx-auto w-full max-w-xl lg:mx-0">
          <div className="mb-4 px-1 sm:mb-6">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f88f2,#19c2a8)] text-sm font-black text-white shadow-lg shadow-sky-200/70">
                EA
              </span>
              <span>
                <span className="block text-lg font-black tracking-tight text-slate-900">EduAssess</span>
                <span className="block text-xs text-slate-500">Không gian học tập trực quan hơn mỗi ngày</span>
              </span>
            </Link>
          </div>

          <div className="auth-card p-5 sm:p-7 md:p-9">
            <span className="soft-label">{eyebrow}</span>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-[15px] sm:leading-7">{description}</p>

            <div className="mt-6 sm:mt-7">{children}</div>
          </div>

          {footer && <div className="px-2 pt-4 text-center text-sm text-slate-500">{footer}</div>}
        </section>
      </div>
    </div>
  );
}