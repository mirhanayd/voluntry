import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VolunTRY - Connect Volunteers with Opportunities",
  description: "Connect volunteers with opportunities across Northern Cyprus",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
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
