import ProtectedRoute from "@/components/ProtectedRoute";
import StudentSidebar from "@/components/StudentSidebar";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <StudentSidebar />
        {children}
      </div>
    </ProtectedRoute>
  );
}
