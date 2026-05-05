import ProtectedRoute from "@/components/ProtectedRoute";
import OrganizerHeader from "@/components/OrganizerHeader";

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["organizer"]}>
      <OrganizerHeader />
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
