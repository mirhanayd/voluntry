import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { resolveCertificateOrganizerName } from "@/lib/serverProfiles";

/* ── GET /api/generate-certificate?certificateId=xxx ─────────────────────────── */

export async function GET(req: NextRequest) {
  try {
    // ── Optional auth: verify token if provided ──────────────────────────
    // This route is also used by the public /verify page, so auth is optional.
    // If an Authorization header is present, verify it to ensure validity.
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1]);
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const certificateId = req.nextUrl.searchParams.get("certificateId");

    if (!certificateId) {
      return NextResponse.json(
        { error: "certificateId query param is required." },
        { status: 400 }
      );
    }

    /* ── Fetch certificate document ──────────────────────────────────────────── */

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

    /* ── Format issued date ──────────────────────────────────────────────────── */

    let issuedDateStr = issuedAt;
    try {
      const d = new Date(issuedAt);
      issuedDateStr = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      // keep raw string
    }

    /* ── Load logo ───────────────────────────────────────────────────────────── */

    let logoBase64: string | null = null;
    try {
      const logoPath = path.join(process.cwd(), "public", "logo_2.png");
      const logoBytes = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBytes.toString("base64")}`;
    } catch {
      // will use text fallback
    }

    /* ── Build PDF (A4 landscape: 297 × 210 mm) ─────────────────────────────── */

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297;
    const H = 210;
    const cx = W / 2;

    /* ── 1. Full-page background ─────────────────────────────────────────────── */

    doc.setFillColor(250, 251, 252); // very subtle warm white
    doc.rect(0, 0, W, H, "F");

    /* ── 2. Outer decorative border (double line effect) ─────────────────────── */

    // Outer thick green border
    doc.setDrawColor(36, 99, 68); // #246344
    doc.setLineWidth(2.5);
    doc.rect(8, 8, W - 16, H - 16);

    // Inner thin green border (1.5mm inset)
    doc.setLineWidth(0.5);
    doc.rect(12, 12, W - 24, H - 24);

    /* ── 3. Inner white content area ─────────────────────────────────────────── */

    doc.setFillColor(255, 255, 255);
    doc.rect(14, 14, W - 28, H - 28, "F");

    /* ── 4. Corner ornaments (decorative green L-shapes) ─────────────────────── */

    const ornLen = 18;
    const ornInset = 16;
    doc.setDrawColor(36, 99, 68);
    doc.setLineWidth(1.2);

    // Top-left
    doc.line(ornInset, ornInset, ornInset + ornLen, ornInset);
    doc.line(ornInset, ornInset, ornInset, ornInset + ornLen);
    // Top-right
    doc.line(W - ornInset, ornInset, W - ornInset - ornLen, ornInset);
    doc.line(W - ornInset, ornInset, W - ornInset, ornInset + ornLen);
    // Bottom-left
    doc.line(ornInset, H - ornInset, ornInset + ornLen, H - ornInset);
    doc.line(ornInset, H - ornInset, ornInset, H - ornInset - ornLen);
    // Bottom-right
    doc.line(W - ornInset, H - ornInset, W - ornInset - ornLen, H - ornInset);
    doc.line(W - ornInset, H - ornInset, W - ornInset, H - ornInset - ornLen);

    /* ── 5. Top green accent strip ───────────────────────────────────────────── */

    doc.setFillColor(36, 99, 68);
    doc.rect(14, 14, W - 28, 3, "F");

    /* ═══════════════════════════════════════════════════════════════════════════
       CONTENT
       ═══════════════════════════════════════════════════════════════════════════ */

    /* ── Logo (1000x221) ──────────────────────────── */

    const logoWidth = 72;
    const logoHeight = 16;
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", cx - logoWidth / 2, 24, logoWidth, logoHeight);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(36, 99, 68);
      doc.text("VolunTRY", cx, 40, { align: "center" });
    }

    /* ── Title line ──────────────────────────────────────────────────────────── */

    doc.setFont("helvetica", "normal");
    doc.setFontSize(18);
    doc.setTextColor(36, 99, 68);
    doc.text("CERTIFICATE OF PARTICIPATION", cx, 58, { align: "center" });

    // Decorative line under title with small diamond center
    doc.setDrawColor(36, 99, 68);
    doc.setLineWidth(0.6);
    doc.line(70, 63, cx - 4, 63);
    doc.line(cx + 4, 63, W - 70, 63);
    // Diamond
    doc.setFillColor(36, 99, 68);
    const dy = 63;
    doc.triangle(cx, dy - 2.5, cx - 2.5, dy, cx, dy + 2.5, "F");
    doc.triangle(cx, dy - 2.5, cx + 2.5, dy, cx, dy + 2.5, "F");

    /* ── "This certifies that" ───────────────────────────────────────────────── */

    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(156, 163, 175);
    doc.text("This is to certify that", cx, 74, { align: "center" });

    /* ── Student name with underline ─────────────────────────────────────────── */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(17, 24, 39);
    doc.text(studentName, cx, 87, { align: "center" });

    // Elegant underline beneath name
    const nameWidth = doc.getTextWidth(studentName);
    const nameLeft = cx - nameWidth / 2;
    doc.setDrawColor(36, 99, 68);
    doc.setLineWidth(0.8);
    doc.line(nameLeft, 89, nameLeft + nameWidth, 89);

    /* ── University ──────────────────────────────────────────────────────────── */

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128);
    doc.text(universityName, cx, 96, { align: "center" });

    /* ── Participation message ────────────────────────────────────────────────── */

    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(156, 163, 175);
    doc.text("has successfully participated in the volunteer event", cx, 107, { align: "center" });

    /* ── Event title ─────────────────────────────────────────────────────────── */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(36, 99, 68);
    doc.text(`"${eventTitle}"`, cx, 118, { align: "center" });

    /* ── Organizer + Date ────────────────────────────────────────────────────── */

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Organized by ${organizerName}`, cx, 127, { align: "center" });

    doc.setTextColor(156, 163, 175);
    doc.setFontSize(10);
    doc.text(eventDate, cx, 133, { align: "center" });

    /* ── Points badge (rounded rect) ─────────────────────────────────────────── */

    const ptsText = `+ ${pointValue} Points Earned`;
    const ptsW = doc.getTextWidth(ptsText) + 16;
    const ptsH = 8;
    const ptsX = cx - ptsW / 2;
    const ptsY = 139;

    doc.setFillColor(240, 250, 245); // #f0faf5
    doc.setDrawColor(36, 99, 68);
    doc.setLineWidth(0.4);
    doc.roundedRect(ptsX, ptsY, ptsW, ptsH, 4, 4, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(36, 99, 68);
    doc.text(ptsText, cx, ptsY + 5.5, { align: "center" });

    /* ── Separator line ──────────────────────────────────────────────────────── */

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(30, 154, W - 30, 154);

    /* ═══════════════════════════════════════════════════════════════════════════
       FOOTER
       ═══════════════════════════════════════════════════════════════════════════ */

    /* ── Left: Certificate details ───────────────────────────────────────────── */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("CERTIFICATE ID", 30, 162);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text(certificateId.slice(0, 20), 30, 167);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Issued: ${issuedDateStr}`, 30, 173);

    /* ── Center: Signature line ──────────────────────────────────────────────── */

    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.3);
    doc.line(cx - 30, 172, cx + 30, 172);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("Authorized Signature", cx, 177, { align: "center" });

    /* ── Right: QR code ──────────────────────────────────────────────────────── */

    const appUrl = "https://voluntry.app";
    const verifyUrl = `${appUrl}/verify/${certificateId}`;

    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 300,
        margin: 1,
        color: { dark: "#246344", light: "#ffffff" },
      });
      doc.addImage(qrDataUrl, "PNG", W - 60, 156, 22, 22);
    } catch {
      // QR generation failed — skip silently
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text("Scan to verify", W - 49, 180, { align: "center" });

    /* ── Bottom green accent strip ───────────────────────────────────────────── */

    doc.setFillColor(36, 99, 68);
    doc.rect(14, H - 17, W - 28, 3, "F");



    /* ── Return PDF ──────────────────────────────────────────────────────────── */

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const shortId = certificateId.slice(0, 8);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="VolunTRY_Certificate_${shortId}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("generate-certificate error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate certificate.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
