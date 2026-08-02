import type { Metadata } from "next";
import HomeAuthRedirect from "@/components/HomeAuthRedirect";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://voluntry.app/#organization",
      name: "VolunTRY",
      url: "https://voluntry.app/",
      logo: "https://voluntry.app/logo_3.png",
      description:
        "VolunTRY connects volunteers with trusted volunteering opportunities across Northern Cyprus.",
      areaServed: [
        { "@type": "Place", name: "Northern Cyprus" },
        { "@type": "Country", name: "Cyprus" },
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://voluntry.app/#website",
      url: "https://voluntry.app/",
      name: "VolunTRY",
      description:
        "Volunteer opportunities and volunteering events in Northern Cyprus.",
      publisher: { "@id": "https://voluntry.app/#organization" },
      inLanguage: ["en", "tr"],
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomeAuthRedirect />
    </>
  );
}
