import ProtectedRoute from "@/components/ProtectedRoute";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <AdminSidebar />
        {children}
      </div>
    </ProtectedRoute>
  );
}
