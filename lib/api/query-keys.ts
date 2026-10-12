export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  dashboard: {
    student: () => ["dashboard", "student"] as const,
    teacher: () => ["dashboard", "teacher"] as const,
  },
  classes: {
    all: ["classes"] as const,
    list: () => ["classes", "list"] as const,
    detail: (id: string) => ["classes", "detail", id] as const,
  },
  questions: {
    all: ["questions"] as const,
    list: (filters?: Record<string, any>) => ["questions", "list", filters] as const,
    detail: (id: string) => ["questions", "detail", id] as const,
  },
  exams: {
    all: ["exams"] as const,
    list: (filters?: Record<string, any>) => ["exams", "list", filters] as const,
    detail: (id: string) => ["exams", "detail", id] as const,
  },
  assignments: {
    my: (params?: { classId?: string; status?: string }) =>
      params ? (["assignments", "my", params] as const) : (["assignments", "my"] as const),
    teacher: (params?: { classId?: string; page?: number; limit?: number }) =>
      ["assignments", "teacher", params] as const,
    detail: (id: string) => ["assignments", "detail", id] as const,
    progress: (id: string) => ["assignments", "progress", id] as const,
  },
  attempts: {
    my: (filters?: Record<string, any>) => ["attempts", "my", filters] as const,
    detail: (attemptId: string) => ["attempts", "detail", attemptId] as const,
    result: (attemptId: string) => ["attempts", "result", attemptId] as const,
    events: (attemptId: string) => ["attempts", "events", attemptId] as const,
  },
  grading: {
    pending: () => ["grading", "pending"] as const,
    detail: (attemptId: string) => ["grading", "detail", attemptId] as const,
  },
  antiCheat: {
    suspicious: (limit?: number) => ["antiCheat", "suspicious", limit] as const,
  },
  analytics: {
    exam: (id: string) => ["analytics", "exam", id] as const,
    class: (id: string) => ["analytics", "class", id] as const,
    studentProgress: (studentId?: string) => ["analytics", "studentProgress", studentId] as const,
  },
  media: {
    list: (type?: string) => ["media", "list", type] as const,
  },
}
