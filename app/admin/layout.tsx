import ProtectedRoute from "@/components/ProtectedRoute";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <style>{`
        .mobile-topbar-admin {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-topbar-admin {
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
          .admin-main-content {
            padding-top: 64px;
          }
        }
      `}</style>
      <div className="mobile-topbar-admin">
        <img src="/logo_2.png" alt="VolunTRY" style={{ height: 32 }} />
      </div>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <AdminSidebar />
        <div className="admin-main-content" style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}
