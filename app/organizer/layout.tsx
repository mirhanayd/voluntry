import ProtectedRoute from "@/components/ProtectedRoute";
import OrganizerSidebar from "@/components/OrganizerSidebar";

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["organizer"]}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <OrganizerSidebar />
        {children}
      </div>
    </ProtectedRoute>
  );
}
