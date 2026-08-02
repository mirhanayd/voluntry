import { ImageResponse } from "next/og";

export const alt = "VolunTRY - Volunteer opportunities in Northern Cyprus";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 86px",
          color: "white",
          background:
            "linear-gradient(120deg, #0a2518 0%, #185033 65%, #246344 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: 1,
            color: "#b9dc91",
          }}
        >
          VolunTRY
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 950,
            marginTop: 34,
            fontSize: 72,
            lineHeight: 1.08,
            fontWeight: 750,
            letterSpacing: -3,
          }}
        >
          Volunteer in Northern Cyprus
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 34,
            fontSize: 29,
            color: "#dff2e7",
          }}
        >
          Discover opportunities. Create impact. Be recognized.
        </div>
      </div>
    ),
    size,
  );
}
