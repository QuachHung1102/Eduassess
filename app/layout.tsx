import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduAssess - Công cụ Hỗ trợ Đánh giá Chuẩn Đầu Ra",
  description:
    "Nền tảng học tập trực quan giúp giáo viên đánh giá chuẩn đầu ra và giúp học sinh ôn tập chủ động hơn mỗi ngày.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      data-theme="thuy"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${beVietnamPro.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      {/* Anti-flash: apply saved theme before first paint */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('edu-theme')||'thuy';document.documentElement.setAttribute('data-theme',t);var m=localStorage.getItem('edu-mode');if(m==='dark')document.documentElement.setAttribute('data-mode','dark');}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
