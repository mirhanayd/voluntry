import ProtectedRoute from "@/components/ProtectedRoute";
import OrganizerSidebar from "@/components/OrganizerSidebar";

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["organizer"]}>
      <style>{`
        .mobile-topbar-organizer {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-topbar-organizer {
            display: flex;
            align-items: center;
            justify-content: center;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 56px;
            background: white;
            border-bottom: 1px solid #e5e7eb;
            z-index: 998;
          }
          .organizer-main-content {
            padding-top: 64px;
          }
        }
      `}</style>
      <div className="mobile-topbar-organizer">
        <img src="/logo_2.png" alt="VolunTRY" style={{ height: 32 }} />
      </div>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <OrganizerSidebar />
        <div className="organizer-main-content" style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}
