export type UserRole = "admin" | "organizer" | "student";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: string;
  university: string;
  department: string;
  points: number;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  organizer: string;
  status: string;
  pointValue: number;
  maxParticipants: number;
}

export interface Participation {
  userId: string;
  eventId: string;
  status: string;
  attendanceConfirmed: boolean;
}
