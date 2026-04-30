import ProtectedRoute from "@/components/ProtectedRoute";
import StudentHeader from "@/components/StudentHeader";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <StudentHeader />
      <div
        style={{
          paddingTop: 60,
          minHeight: "100vh",
          background: "#f9fafb",
        }}
      >
        {children}
      </div>
    </ProtectedRoute>
  );
}
