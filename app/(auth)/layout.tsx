// Auth pages are user-facing forms — always dynamic, never statically pre-rendered
// This also works around a Next.js 16 Turbopack SSR bug affecting static generation
// See: https://github.com/vercel/next.js/issues/93024
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
