import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SplitEasy — Smart Bill Splitting & Relational Expense Manager",
  description: "Share bills with roommates, divide travel costs, and settle debts effortlessly.",
};

const themeInitScript = `
  (function() {
    try {
      var saved = localStorage.getItem('spliteasy-theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var active = saved === 'dark' || (saved !== 'light' && prefersDark) ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', active);
      document.documentElement.style.colorScheme = active;
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
