import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolveCertificateOrganizerName } from "@/lib/serverProfiles";
import fs from "fs";
import path from "path";

/* ── GET /api/certificate-image?certificateId=xxx ─────────────────────────── */
/* Returns an SVG image that looks exactly like the PDF certificate.          */
/* Used as <img src="/api/certificate-image?certificateId=xxx" />             */

export async function GET(req: NextRequest) {
  try {
    const certificateId = req.nextUrl.searchParams.get("certificateId");

    if (!certificateId) {
      return NextResponse.json(
        { error: "certificateId query param is required." },
        { status: 400 }
      );
    }

    const certSnap = await adminDb
      .collection("certificates")
      .doc(certificateId)
      .get();

    if (!certSnap.exists) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    const cert = certSnap.data()!;
    const studentName: string = cert.studentName ?? "";
    const universityName: string = cert.universityName ?? "";
    const eventTitle: string = cert.eventTitle ?? "";
    const organizerName = await resolveCertificateOrganizerName(cert);
    const eventDate: string = cert.eventDate ?? "";
    const pointValue: number = cert.pointValue ?? 0;
    const issuedAt: string = cert.issuedAt ?? "";

    let issuedDateStr = issuedAt;
    try {
      const d = new Date(issuedAt);
      issuedDateStr = d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      /* keep raw string */
    }

    const shortId = certificateId.slice(0, 12);

    /* ── Load logo ───────────────────────────────────────────────────────────── */

    let logoBase64: string | null = null;
    try {
      const logoPath = path.join(process.cwd(), "public", "logo_2.png");
      const logoBytes = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBytes.toString("base64")}`;
    } catch {
      // ignore
    }

    /* ── Build SVG (landscape proportions matching A4: 594x420) ──────── */

    const W = 594;
    const H = 420;
    const cx = W / 2;

    // Escape HTML entities for SVG safety
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const logoSvg = logoBase64 
      ? `<image href="${logoBase64}" x="${cx - 72}" y="48" width="144" height="32" />`
      : `<text x="${cx}" y="72" text-anchor="middle" fill="#246344" font-size="20" font-weight="800" letter-spacing="-0.5">VolunTRY</text>`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&amp;display=swap');
      text { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#fafbfc" rx="4"/>

  <!-- Outer border -->
  <rect x="16" y="16" width="${W - 32}" height="${H - 32}" fill="none" stroke="#246344" stroke-width="4" rx="2"/>

  <!-- Inner border -->
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="#246344" stroke-width="1" rx="1"/>

  <!-- Inner white area -->
  <rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="#ffffff" rx="1"/>

  <!-- Top green strip -->
  <rect x="28" y="28" width="${W - 56}" height="6" fill="#246344"/>

  <!-- Corner ornaments (L-shapes) -->
  <g stroke="#246344" stroke-width="2" fill="none">
    <!-- Top-left -->
    <polyline points="34,64 34,38 60,38"/>
    <!-- Top-right -->
    <polyline points="${W - 34},38 ${W - 60},38" /><polyline points="${W - 34},38 ${W - 34},64"/>
    <!-- Bottom-left -->
    <polyline points="34,${H - 64} 34,${H - 38} 60,${H - 38}"/>
    <!-- Bottom-right -->
    <polyline points="${W - 34},${H - 38} ${W - 60},${H - 38}"/><polyline points="${W - 34},${H - 38} ${W - 34},${H - 64}"/>
  </g>

  <!-- Logo -->
  ${logoSvg}

  <!-- Title -->
  <text x="${cx}" y="104" text-anchor="middle" fill="#246344" font-size="14" font-weight="600" letter-spacing="3">CERTIFICATE OF PARTICIPATION</text>

  <!-- Decorative line -->
  <line x1="140" y1="116" x2="${cx - 8}" y2="116" stroke="#246344" stroke-width="1"/>
  <line x1="${cx + 8}" y1="116" x2="${W - 140}" y2="116" stroke="#246344" stroke-width="1"/>
  <polygon points="${cx},112 ${cx - 5},116 ${cx},120 ${cx + 5},116" fill="#246344"/>

  <!-- "This is to certify that" -->
  <text x="${cx}" y="142" text-anchor="middle" fill="#9ca3af" font-size="11" font-style="italic">This is to certify that</text>

  <!-- Student name -->
  <text x="${cx}" y="174" text-anchor="middle" fill="#111827" font-size="28" font-weight="800">${esc(studentName)}</text>
  <line x1="${cx - 120}" y1="180" x2="${cx + 120}" y2="180" stroke="#246344" stroke-width="1.5"/>

  <!-- University -->
  <text x="${cx}" y="198" text-anchor="middle" fill="#6b7280" font-size="11">${esc(universityName)}</text>

  <!-- "has successfully participated..." -->
  <text x="${cx}" y="220" text-anchor="middle" fill="#9ca3af" font-size="11" font-style="italic">has successfully participated in the volunteer event</text>

  <!-- Event title -->
  <text x="${cx}" y="248" text-anchor="middle" fill="#246344" font-size="18" font-weight="700">"${esc(eventTitle)}"</text>

  <!-- Organizer -->
  <text x="${cx}" y="270" text-anchor="middle" fill="#6b7280" font-size="10">Organized by ${esc(organizerName)}</text>

  <!-- Date -->
  <text x="${cx}" y="286" text-anchor="middle" fill="#9ca3af" font-size="10">${esc(eventDate)}</text>

  <!-- Points badge -->
  <rect x="${cx - 60}" y="296" width="120" height="22" rx="11" fill="#f0faf5" stroke="#246344" stroke-width="0.8"/>
  <text x="${cx}" y="311" text-anchor="middle" fill="#246344" font-size="10" font-weight="700">+ ${pointValue} Points Earned</text>

  <!-- Separator -->
  <line x1="60" y1="332" x2="${W - 60}" y2="332" stroke="#e5e7eb" stroke-width="0.5"/>

  <!-- Footer: Certificate ID -->
  <text x="60" y="352" fill="#9ca3af" font-size="7" font-weight="600">CERTIFICATE ID</text>
  <text x="60" y="364" fill="#374151" font-size="8">${esc(shortId)}</text>
  <text x="60" y="376" fill="#9ca3af" font-size="7">Issued: ${esc(issuedDateStr)}</text>

  <!-- Signature line -->
  <line x1="${cx - 60}" y1="368" x2="${cx + 60}" y2="368" stroke="#9ca3af" stroke-width="0.5"/>
  <text x="${cx}" y="380" text-anchor="middle" fill="#9ca3af" font-size="7">Authorized Signature</text>

  <!-- Bottom green strip -->
  <rect x="28" y="${H - 34}" width="${W - 56}" height="6" fill="#246344"/>
</svg>`;

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    console.error("certificate-image error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate certificate image.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
