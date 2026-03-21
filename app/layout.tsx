import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VolunTRY - Connect Volunteers with Opportunities",
  description: "Connect volunteers with opportunities across Northern Cyprus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
