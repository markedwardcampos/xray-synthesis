import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LLM Ingest Pipeline | Phase 2",
  description: "Mine signal from noise. Technical, systems-focused synthesis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased selection:bg-primary/20`}>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-primary/10 py-6 px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-[8px] flex items-center justify-center text-white font-bold">
                X
              </div>
              <h1 className="text-xl tracking-tight">Digital Posting <span className="text-primary font-bold">Improvements</span></h1>
            </div>
            <nav className="flex items-center gap-8 text-sm font-medium">
              <a href="#" className="hover:text-primary transition-colors">Queue</a>
              <a href="#" className="hover:text-primary transition-colors">History</a>
              <button className="btn-primary">New Ingest</button>
            </nav>
          </header>
          <main className="flex-1 p-8">
            {children}
          </main>
          <footer className="py-12 px-8 border-t border-primary/5 text-xs text-secondary/40 text-center">
            &copy; 2026 XRay Tech • LLM Ingest Pipeline Phase 2
          </footer>
        </div>
      </body>
    </html>
  );
}
