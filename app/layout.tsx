import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://voluntry.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VolunTRY | Volunteer in Northern Cyprus",
    template: "%s | VolunTRY",
  },
  description:
    "Discover trusted volunteer opportunities in Northern Cyprus with VolunTRY. Find Cyprus volunteering events, track your impact and earn verified certificates.",
  applicationName: "VolunTRY",
  keywords: [
    "VolunTRY",
    "volunteer Northern Cyprus",
    "volunteer Cyprus",
    "Northern Cyprus volunteering",
    "Cyprus volunteer opportunities",
    "Kıbrıs gönüllü",
    "Kıbrıs gönüllülük",
    "Kuzey Kıbrıs gönüllülük",
    "Kıbrıs gönüllülük etkinlikleri",
  ],
  authors: [{ name: "VolunTRY" }],
  creator: "VolunTRY",
  publisher: "VolunTRY",
  category: "Volunteering",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "VolunTRY",
    title: "VolunTRY | Volunteer in Northern Cyprus",
    description:
      "Find meaningful volunteer opportunities across Northern Cyprus, manage your participation and build a verified record of your impact.",
    locale: "en_GB",
    alternateLocale: ["tr_TR"],
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "VolunTRY - Volunteer opportunities in Northern Cyprus",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VolunTRY | Volunteer in Northern Cyprus",
    description:
      "Discover trusted volunteer opportunities and volunteering events across Northern Cyprus.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo_3.png",
    apple: "/logo_3.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
          :root {
            --color-primary: #246344;
            --color-primary-hover: #1a4a32;
            --color-primary-light: #f0faf5;
            --color-text-dark: #111827;
            --color-text-mid: #374151;
            --color-text-light: #6b7280;
            --color-text-muted: #9ca3af;
            --color-border: #e5e7eb;
            --color-page-bg: #f9fafb;
            --radius-sm: 6px;
            --radius-md: 8px;
            --radius-lg: 12px;
          }
          * {
            box-sizing: border-box;
          }
          body {
            background-color: #f9fafb;
            color: #111827;
          }
        `}</style>
      </head>
      <body className={inter.className} suppressHydrationWarning style={{ margin: 0, padding: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
