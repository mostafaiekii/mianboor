import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vazir = Vazirmatn({
  variable: "--font-vazir",
  subsets: ["arabic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "میانبر — Mianboor VPN · دمو",
  description:
    "دموی رابط کاربری اپ VPN میانبر؛ حلقه پاور نئونی، انتخاب سرور با پرچم و پینگ، و پنل مخفی مدیر با نگه‌داشتن تب Account.",
  keywords: ["VPN", "میانبر", "Mianboor", "دمو", "اتصال امن"],
  authors: [{ name: "Mianboor VPN" }],
  icons: {
    icon: "/logo-512.png",
    apple: "/logo-512.png",
  },
  openGraph: {
    title: "میانبر — Mianboor VPN",
    description: "دموی رابط کاربری اپ VPN میانبر؛ خرید پلن، ضدچیت، تم‌های ملایم و پنل مخفی مدیر.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "میانبر — Mianboor VPN",
    description: "دموی رابط کاربری اپ VPN میانبر",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${vazir.variable} ${manrope.variable} ${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
