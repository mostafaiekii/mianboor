import DemoSwitcher from "@/components/demo/demo-switcher";

/* Request-time SSR: the demo seeds several relative-time texts ("12m ago",
   days-left, premium expiry) from Date.now(). A static prerender would bake
   build-day values into the HTML and hydrate against stale ones — forcing
   dynamic rendering keeps the server HTML and the client in the same clock
   window, so hydration is byte-stable for every visitor. */
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#0a0a0c] pb-16">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <DemoSwitcher />
      </div>
    </main>
  );
}
