import ProtectedRoute from "@/components/ProtectedRoute";
import StudentHeader from "@/components/StudentHeader";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <StudentHeader />
      <div
        className="student-content-area"
        style={{
          paddingTop: 60,
          minHeight: "100vh",
          background: "#f9fafb",
        }}
      >
        {children}
      </div>

      {/* Bottom nav padding for mobile */}
      <style>{`
        @media (max-width: 620px) {
          .student-content-area {
            padding-bottom: 76px;
          }
        }
      `}</style>
    </ProtectedRoute>
  );
}
