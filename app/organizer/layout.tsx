import ProtectedRoute from "@/components/ProtectedRoute";

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={["organizer"]}>{children}</ProtectedRoute>;
}
