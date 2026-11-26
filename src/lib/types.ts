export type Role = "admin" | "teacher" | "student";
export type LessonMode = "presencial" | "online";
export type LessonStatus = "scheduled" | "rescheduled" | "canceled" | "done";
export type RequestType = "reschedule" | "cancel";
export type RequestStatus = "pending" | "approved" | "rejected";

export type Permission = "manage_festivals" | "manage_students" | "view_all_calendars" | "manage_financial";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  nickname: string | null;
  role: Role;
  color: string;
  active: boolean;
  created_at: string;
}

export interface TeacherPermissions {
  teacher_id: string;
  manage_festivals: boolean;
  manage_students: boolean;
  view_all_calendars: boolean;
  manage_financial: boolean;
}

export interface Instrument {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort: number;
}

export interface Enrollment {
  id: string;
  student_id: string;
  teacher_id: string;
  instrument_id: number;
  mode: LessonMode;
  status: "active" | "paused" | "ended";
  created_at: string;
}

export interface Lesson {
  id: string;
  enrollment_id: string;
  teacher_id: string;
  student_id: string;
  instrument_id: number;
  starts_at: string;
  ends_at: string;
  mode: LessonMode;
  meet_link: string | null;
  status: LessonStatus;
  notes: string | null;
}

export interface ChangeRequest {
  id: string;
  lesson_id: string;
  requested_by: string;
  type: RequestType;
  proposed_starts_at: string | null;
  reason: string | null;
  status: RequestStatus;
  response: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  enrollment_id: string;
  student_id: string;
  teacher_id: string;
  meet_link: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  link_url: string | null;
  created_at: string;
}

export interface Festival {
  id: string;
  title: string;
  date: string;
  location: string | null;
  description: string | null;
}

export interface FestivalMedia {
  id: string;
  festival_id: string;
  type: "photo" | "youtube";
  storage_path: string | null;
  youtube_id: string | null;
  caption: string | null;
}

export interface SiteSection {
  slug: string;
  title: string;
  body: string;
  image_url: string | null;
  sort: number;
  visible: boolean;
}

export interface SiteSettings {
  school_name: string;
  tagline: string | null;
  address: string | null;
  maps_embed_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
}
