import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VolunTRY - Volunteer in Northern Cyprus",
    short_name: "VolunTRY",
    description:
      "Discover volunteer opportunities and volunteering events across Northern Cyprus.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3eb",
    theme_color: "#246344",
    icons: [
      {
        src: "/logo_3.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
