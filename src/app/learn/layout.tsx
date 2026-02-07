"use client";

import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex w-full overflow-x-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-h-dvh min-w-0">
        <div className="flex-1 px-4 py-4 md:px-6 lg:px-8 max-w-3xl">
          {children}
        </div>
      </main>

      <MobileNav
        tags={[]}
        selectedTags={[]}
        onTagToggle={() => {}}
        onClearTags={() => {}}
      />
    </div>
  );
}
