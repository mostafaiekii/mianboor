import WindowsDemo from "@/components/demo/windows-demo";

/* Request-time SSR: the demo seeds several relative-time texts ("12m ago",
   days-left, premium expiry) from Date.now(). A static prerender would bake
   build-day values into the HTML and hydrate against stale ones — forcing
   dynamic rendering keeps the server HTML and the client in the same clock
   window, so hydration is byte-stable for every visitor. */
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#0a0a0c] pb-16">
      <div className="mx-auto max-w-3xl px-3 pt-6 sm:px-6">
        <header className="mb-5 flex items-center justify-center gap-3">
          <img src="/win-demo/assets/icon.png" alt="میانپور" className="h-9 w-9 rounded-lg" />
          <div className="text-center">
            <h1 className="text-lg font-extrabold text-white">میانپور برای ویندوز — دموی زنده</h1>
            <p className="text-xs text-zinc-400">نسخهٔ 1.1.0 · همان رابطی که فایل exe اجرا می‌کند</p>
          </div>
        </header>
        <WindowsDemo />
      </div>
    </main>
  );
}
