"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  KeyRound,
  Loader2,
  LockKeyhole,
  Plus,
  Send,
  Trash2,
} from "lucide-react";

interface VpnConfigItem {
  id: string;
  name: string;
  link: string;
  country: string;
  active: boolean;
}

const faNum = (n: number) => n.toLocaleString("fa-IR");

export default function AdminPanel() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [configs, setConfigs] = useState<VpnConfigItem[]>([]);

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [links, setLinks] = useState("");

  const taps = useRef<number[]>([]);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hint, setHint] = useState<number | null>(null);

  const openPanel = () => {
    taps.current = [];
    setHint(null);
    setOpen(true);
  };

  /* نگه‌داشتن انگشت/موس روی نسخه (۱.۲ ثانیه) → باز شدن پنل */
  const startPress = () => {
    cancelPress();
    pressTimer.current = setTimeout(openPanel, 1200);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  /* یا ۵ بار لمس در عرض ۴ ثانیه → باز شدن پنل */
  const handleTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 4000), now];
    const count = taps.current.length;
    if (count >= 5) {
      openPanel();
      return;
    }
    setHint(5 - count);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 2000);
  };

  const login = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        setAuthed(true);
        setPassword("");
        await loadConfigs();
        toast({ title: "خوش آمدید مدیر 👑" });
      } else {
        toast({ title: "خطا", description: data.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  const loadConfigs = async () => {
    const res = await fetch("/api/admin/configs");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    if (data.ok) setConfigs(data.configs);
  };

  const addConfigs = async () => {
    if (!links.trim()) {
      toast({ title: "خطا", description: "لینک کانفیگ وارد کنید", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, country, links }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: `✅ ${data.added} کانفیگ اضافه شد` });
        setLinks("");
        setName("");
        setCountry("");
        await loadConfigs();
      } else {
        toast({ title: "خطا", description: data.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleConfig = async (id: string, active: boolean) => {
    setConfigs((c) => c.map((x) => (x.id === id ? { ...x, active } : x)));
    await fetch(`/api/admin/configs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
  };

  const removeConfig = async (id: string) => {
    setConfigs((c) => c.filter((x) => x.id !== id));
    await fetch(`/api/admin/configs/${id}`, { method: "DELETE" });
    toast({ title: "کانفیگ حذف شد" });
  };

  const copyApi = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/api/client/configs?token=${"[REDACTED-SECURITY]"}`
    );
    toast({ title: "📋 آدرس API کپی شد" });
  };

  const activeCount = configs.filter((c) => c.active).length;

  return (
    <>
      <footer className="mt-auto pt-8 text-center">
        <button
          onClick={handleTap}
          onMouseDown={startPress}
          onMouseUp={cancelPress}
          onMouseLeave={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="نسخه برنامه — برای ورود مدیر نگه دارید یا ۵ بار لمس کنید"
          className="-m-2 cursor-pointer select-none rounded-xl p-2 text-[11px] text-emerald-100/30 transition-colors hover:text-emerald-100/50 active:text-emerald-200/60"
          style={{ WebkitTouchCallout: "none", userSelect: "none" }}
        >
          میانبر VPN · نسخه آزمایشی ۰.۱
        </button>
        <AnimatePresence>
          {hint !== null && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-1 text-[10px] text-emerald-300/50"
            >
              {hint === 1
                ? "یه لمس دیگه… (یا انگشتت رو نگه دار)"
                : `${faNum(hint)} لمس دیگه… (یا انگشتت رو نگه دار)`}
            </motion.p>
          )}
        </AnimatePresence>
      </footer>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto border-emerald-400/20 bg-[#04120c] text-emerald-50 sm:max-w-md">
          {!authed ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <LockKeyhole className="h-5 w-5 text-emerald-300" />
                  ورود مدیر
                </DialogTitle>
                <DialogDescription className="text-emerald-200/50">
                  این بخش فقط برای مدیر برنامه است.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  type="password"
                  dir="ltr"
                  placeholder="رمز مدیر"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && login()}
                  className="border-emerald-400/20 bg-white/[0.04] text-emerald-50 placeholder:text-emerald-200/30"
                />
                <Button
                  onClick={login}
                  disabled={busy || !password}
                  className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ورود"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-emerald-300" />
                  پنل مدیریت میانبر
                </DialogTitle>
                <DialogDescription className="text-emerald-200/50">
                  کانفیگ‌ها را اینجا وارد کنید؛ کاربران فقط وصل می‌شوند و هرگز
                  لینک‌ها را نمی‌بینند.
                </DialogDescription>
              </DialogHeader>

              {/* افزودن */}
              <div className="space-y-2.5 rounded-xl border border-emerald-400/15 bg-white/[0.03] p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="نام (اختیاری)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-emerald-400/20 bg-white/[0.04] text-sm placeholder:text-emerald-200/30"
                  />
                  <Input
                    placeholder="کشور (اختیاری)"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="border-emerald-400/20 bg-white/[0.04] text-sm placeholder:text-emerald-200/30"
                  />
                </div>
                <Textarea
                  dir="ltr"
                  rows={4}
                  placeholder={"هر خط یک کانفیگ:\nvless://...\nvmess://..."}
                  value={links}
                  onChange={(e) => setLinks(e.target.value)}
                  className="border-emerald-400/20 bg-white/[0.04] font-mono text-xs placeholder:text-emerald-200/30"
                />
                <Button
                  onClick={addConfigs}
                  disabled={busy}
                  className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> افزودن کانفیگ‌ها
                    </>
                  )}
                </Button>
              </div>

              <Separator className="bg-emerald-400/10" />

              {/* لیست */}
              <div className="flex items-center justify-between text-xs text-emerald-200/60">
                <span>
                  کل: <b className="text-emerald-200">{configs.length}</b>
                </span>
                <span>
                  فعال: <b className="text-emerald-300">{activeCount}</b>
                </span>
              </div>
              <ScrollArea className="max-h-56 rounded-xl border border-emerald-400/15 bg-white/[0.02]">
                <div className="divide-y divide-emerald-400/10">
                  {configs.length === 0 && (
                    <p className="p-4 text-center text-xs text-emerald-200/40">
                      هنوز کانفیگی ثبت نشده
                    </p>
                  )}
                  {configs.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {c.name}
                          <span className="mr-2 text-[10px] font-normal text-emerald-200/40">
                            {c.country}
                          </span>
                        </p>
                        <p
                          dir="ltr"
                          className="truncate text-left font-mono text-[10px] text-emerald-200/35"
                        >
                          {c.link.slice(0, 34)}…
                        </p>
                      </div>
                      <Switch
                        checked={c.active}
                        onCheckedChange={(v) => toggleConfig(c.id, v)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeConfig(c.id)}
                        aria-label={`حذف ${c.name}`}
                        className="h-8 w-8 text-red-300/70 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Separator className="bg-emerald-400/10" />

              {/* آدرس API کلاینت */}
              <div className="rounded-xl border border-emerald-400/15 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-200" variant="outline">
                    مخصوص اپ اندروید
                  </Badge>
                  <span className="text-[10px] text-emerald-200/40">
                    کاربران این را نمی‌بینند
                  </span>
                </div>
                <p className="mb-2 text-[11px] leading-5 text-emerald-200/60">
                  اپ میانبر موقع باز شدن، کانفیگ‌های فعال را از این آدرس می‌گیرد:
                </p>
                <div dir="ltr" className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-2 py-1.5 text-left font-mono text-[10px] text-emerald-300/80">
                    /api/client/configs?token=[REDACTED-SECURITY]
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={copyApi}
                    aria-label="کپی آدرس API"
                    className="h-8 w-8 shrink-0 text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
