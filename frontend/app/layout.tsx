import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Zh.A. & You — Daily Moments",
  description: "Персональный календарь-дневник для двоих с планами, фото и воспоминаниями",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Navigation />
        <main className="pb-16 md:pb-0 md:ml-20">
          {children}
        </main>
      </body>
    </html>
  );
}

