import type { ChangeRequest, Lesson } from "@/lib/types";

export const LESSON_SELECT =
  "*, student:profiles!lessons_student_id_fkey(id, full_name, color), teacher:profiles!lessons_teacher_id_fkey(id, full_name, color), instrument:instruments(name)";

export interface LessonFull extends Lesson {
  student: { id: string; full_name: string; color: string } | null;
  teacher: { id: string; full_name: string; color: string } | null;
  instrument: { name: string } | null;
}

export const REQUEST_SELECT = `*, requester:profiles!lesson_change_requests_requested_by_fkey(full_name), lesson:lessons!inner(${LESSON_SELECT})`;

export interface RequestFull extends ChangeRequest {
  requester: { full_name: string } | null;
  lesson: LessonFull;
}

export const ENROLLMENT_SELECT =
  "*, student:profiles!enrollments_student_id_fkey(id, full_name, email, phone, active), teacher:profiles!enrollments_teacher_id_fkey(id, full_name, color), instrument:instruments(id, name)";

export interface EnrollmentFull {
  id: string;
  student_id: string;
  teacher_id: string;
  instrument_id: number;
  mode: "presencial" | "online";
  status: "active" | "paused" | "ended";
  created_at: string;
  student: { id: string; full_name: string; email: string | null; phone: string | null; active: boolean } | null;
  teacher: { id: string; full_name: string; color: string } | null;
  instrument: { id: number; name: string } | null;
}
