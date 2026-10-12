import type {
  User,
  ClassSummary,
  CandidateExam,
  MyAssignment,
  StudentDashboardStats,
  TeacherDashboardStats,
  PendingWritingSubmission,
  AttemptResult,
  AttemptGradingView,
  Question,
  ExamSummary,
  ClassRosterStudent,
  ClassAnalytics,
  AssignmentSummary,
  AssignmentProgress,
  MediaAsset,
  ExamAnalytics,
  StudentProgressAnalytics,
  AntiCheatEvent,
} from "@/lib/api/types"

export const DEMO_TEACHER: User = {
  id: "teacher-hung",
  fullName: "Thầy Hùng",
  email: "hung.nguyen@ieltslovers.com",
  role: "teacher",
  status: "active",
}

export const DEMO_STUDENT: User = {
  id: "student-long",
  fullName: "Long",
  email: "long.student@ieltslovers.com",
  role: "student",
  targetBand: 7.0,
  status: "active",
}

export const DEMO_STUDENTS: User[] = [
  { id: "s-1", fullName: "Nguyễn Văn An", email: "an.nguyen@gmail.com", role: "student", targetBand: 6.5, status: "active" },
  { id: "s-2", fullName: "Trần Minh Anh", email: "minhanh.tran@gmail.com", role: "student", targetBand: 7.0, status: "active" },
  { id: "s-3", fullName: "Lê Hoàng Nam", email: "nam.le@gmail.com", role: "student", targetBand: 6.5, status: "active" },
  { id: "s-4", fullName: "Phạm Ngọc Linh", email: "linh.pham@gmail.com", role: "student", targetBand: 7.5, status: "active" },
]

export const DEMO_CLASSES: ClassSummary[] = [
  { id: "c-1", name: "IELTS Foundation", code: "FOUND1", description: "Lớp nền tảng mục tiêu 5.5 - 6.0", studentsCount: 28 },
  { id: "c-2", name: "IELTS Intermediate", code: "INTER2", description: "Lớp trung cấp mục tiêu 6.5", studentsCount: 32 },
  { id: "c-3", name: "IELTS Advanced", code: "ADVAN3", description: "Lớp nâng cao mục tiêu 7.5+", studentsCount: 18 },
]

export const DEMO_EXAM_MOCK_01: CandidateExam = {
  id: "exam-mock-01",
  title: "IELTS Academic Mock Test 01",
  description: "Đề thi thử đầy đủ 3 kỹ năng Listening, Reading, Writing chuẩn format IDP/BC.",
  durationMinutes: 165,
  sections: [
    {
      skill: "listening",
      part: 1,
      title: "Part 1: Customer Enquiry",
      instructions: "Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.",
      media: [
        {
          id: "m-audio-1",
          url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
          type: "audio",
          originalName: "listening_part1.mp3",
        },
      ],
      questions: [
        {
          id: "q-l1",
          skill: "listening",
          part: 1,
          type: "form_completion",
          prompt: "Customer Name: Sarah [1]",
          data: { templateText: "Customer Name: Sarah [1]" },
        },
        {
          id: "q-l2",
          skill: "listening",
          part: 1,
          type: "form_completion",
          prompt: "Delivery Address: 42 [2] Street",
          data: { templateText: "Delivery Address: 42 [2] Street" },
        },
        {
          id: "q-l3",
          skill: "listening",
          part: 1,
          type: "multiple_choice",
          prompt: "What time does the morning museum tour start?",
          data: {
            options: [
              { id: "A", text: "9:00 AM" },
              { id: "B", text: "10:30 AM" },
              { id: "C", text: "11:15 AM" },
            ],
          },
        },
        {
          id: "q-l4",
          skill: "listening",
          part: 1,
          type: "multiple_choice",
          prompt: "The discount is available for members with:",
          data: {
            options: [
              { id: "A", text: "Student card" },
              { id: "B", text: "Senior citizen pass" },
              { id: "C", text: "Annual subscription" },
            ],
          },
        },
      ],
    },
    {
      skill: "reading",
      part: 1,
      title: "Passage 1: The Secret Life of Whales",
      instructions: "Do the following statements agree with the information given in Reading Passage 1?",
      passageText: `Paragraph A
Whales are among the most enigmatic creatures on Earth. Modern marine biologists have spent decades tracking their intricate migratory patterns across the Pacific and Atlantic Oceans. Recent satellite telemetry data has revealed that certain humpback whales travel more than 8,000 kilometres between their polar feeding grounds and tropical breeding waters each year.

Paragraph B
A fascinating aspect of whale biology is their sophisticated vocalisation. Male humpback whales produce long, structured sequences of sounds commonly referred to as "songs". These songs can persist for hours and are shared across entire oceanic populations, evolving gradually over mating seasons. Researchers have discovered cultural transmission occurring when eastern pods adopt acoustic motifs originated in western pods.

Paragraph C
Human activities continue to present significant risks to cetacean populations worldwide. Commercial shipping lanes intersect directly with traditional migration corridors, leading to fatal vessel strikes. Furthermore, anthropogenic ocean noise pollution from seismic surveying and industrial shipping severely compromises their echolocation and communication faculties.`,
      questions: [
        {
          id: "q-r1",
          skill: "reading",
          part: 1,
          type: "true_false_not_given",
          prompt: "Humpback whales travel more than 8,000 km annually during migration.",
          data: {
            options: [
              { id: "TRUE", text: "True" },
              { id: "FALSE", text: "False" },
              { id: "NOT GIVEN", text: "Not Given" },
            ],
          },
        },
        {
          id: "q-r2",
          skill: "reading",
          part: 1,
          type: "true_false_not_given",
          prompt: "Whale songs remain completely unchanged from one breeding season to the next.",
          data: {
            options: [
              { id: "TRUE", text: "True" },
              { id: "FALSE", text: "False" },
              { id: "NOT GIVEN", text: "Not Given" },
            ],
          },
        },
        {
          id: "q-r3",
          skill: "reading",
          part: 1,
          type: "matching_headings",
          prompt: "Choose the correct heading for Paragraph B.",
          data: {
            headings: [
              { id: "i", text: "Acoustic culture and vocal evolution" },
              { id: "ii", text: "Threats posed by maritime traffic" },
              { id: "iii", text: "Record-breaking long distance journeys" },
            ],
          },
        },
      ],
    },
    {
      skill: "writing",
      part: 1,
      title: "Writing Section",
      instructions: "Answer both Task 1 and Task 2.",
      questions: [
        {
          id: "q-w1",
          skill: "writing",
          part: 1,
          type: "writing_task_1",
          prompt:
            "The chart below illustrates the proportion of renewable energy consumption in four European countries from 2010 to 2024.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
          data: { minWords: 150 },
        },
        {
          id: "q-w2",
          skill: "writing",
          part: 2,
          type: "writing_task_2",
          prompt:
            "Some people believe that artificial intelligence will soon replace human teachers in education, while others argue that human interaction is irreplaceable.\n\nDiscuss both views and give your own opinion. Write at least 250 words.",
          data: { minWords: 250 },
        },
      ],
    },
  ],
}

export const DEMO_STUDENT_DASHBOARD: StudentDashboardStats = {
  assignedCount: 3,
  inProgressCount: 1,
  submittedCount: 8,
  averageBand: 6.5,
  recentAttempts: [
    {
      id: "att-101",
      examTitle: "IELTS Mock Test 01",
      submittedAt: "2026-09-18T10:30:00.000Z",
      status: "submitted",
      scores: {
        listeningBand: 7.0,
        readingBand: 6.5,
        writingBand: 5.5,
        overallBand: 6.5,
      },
    },
    {
      id: "att-102",
      examTitle: "IELTS Reading Practice 02",
      submittedAt: "2026-09-12T15:20:00.000Z",
      status: "submitted",
      scores: {
        readingBand: 7.0,
        overallBand: 7.0,
      },
    },
  ],
  upcomingAssignments: [
    {
      id: "assign-1",
      examId: "exam-mock-01",
      examTitle: "IELTS Mock Test 01",
      durationMinutes: 165,
      deadline: "2026-09-18T23:59:59.000Z",
      submissionStatus: "not_started",
      teacherName: "Thầy Hùng",
      classId: "c-2",
      className: "IELTS Intermediate",
      attemptId: null,
      scores: null,
    },
    {
      id: "assign-2",
      examId: "exam-reading-03",
      examTitle: "IELTS Reading Practice 03",
      durationMinutes: 60,
      deadline: "2026-09-22T23:59:59.000Z",
      submissionStatus: "in_progress",
      teacherName: "Thầy Hùng",
      classId: "c-2",
      className: "IELTS Intermediate",
      attemptId: "att-in-progress-03",
      scores: null,
    },
  ],
}

export const DEMO_STUDENT_ALL_ASSIGNMENTS: MyAssignment[] = [
  {
    id: "assign-1",
    examId: "exam-mock-01",
    examTitle: "IELTS Mock Test 01",
    durationMinutes: 165,
    deadline: "2026-09-18T23:59:59.000Z",
    submissionStatus: "not_started",
    teacherName: "Thầy Hùng",
    classId: "c-2",
    className: "IELTS Intermediate",
    attemptId: null,
    scores: null,
  },
  {
    id: "assign-2",
    examId: "exam-reading-03",
    examTitle: "IELTS Reading Practice 03",
    durationMinutes: 60,
    deadline: "2026-09-22T23:59:59.000Z",
    submissionStatus: "in_progress",
    teacherName: "Thầy Hùng",
    classId: "c-2",
    className: "IELTS Intermediate",
    attemptId: "att-in-progress-03",
    scores: null,
  },
  {
    id: "assign-4",
    examId: "exam-writing-02",
    examTitle: "IELTS Writing Task 2 Practice",
    durationMinutes: 40,
    deadline: "2026-09-30T23:59:59.000Z",
    submissionStatus: "submitted",
    teacherName: "Thầy Hùng",
    classId: "c-2",
    className: "IELTS Intermediate",
    attemptId: "att-sub-2",
    scores: {
      writingBand: 6.0,
      overallBand: 6.0,
    },
  },
  {
    id: "assign-3",
    examId: "exam-listening-01",
    examTitle: "IELTS Listening Starter 01",
    durationMinutes: 30,
    deadline: "2026-09-15T23:59:59.000Z",
    submissionStatus: "submitted",
    teacherName: "Cô Lan",
    classId: "c-1",
    className: "IELTS Foundation",
    attemptId: "att-101",
    scores: {
      listeningBand: 6.5,
      overallBand: 6.5,
    },
  },
  {
    id: "assign-5",
    examId: "exam-grammar-01",
    examTitle: "Grammar & Vocab Foundation Test",
    durationMinutes: 45,
    deadline: "2026-09-10T23:59:59.000Z",
    submissionStatus: "submitted",
    teacherName: "Cô Lan",
    classId: "c-1",
    className: "IELTS Foundation",
    attemptId: "att-102",
    scores: {
      readingBand: 6.5,
      overallBand: 6.5,
    },
  },
]

export interface StudentEnrolledClass extends ClassSummary {
  teacher: { id: string; fullName: string; email: string }
  targetBand: number
  totalAssignments: number
  completedAssignments: number
  students: Array<{ id: string; fullName: string; email: string; targetBand?: number | null }>
}

export const DEMO_STUDENT_CLASSES: StudentEnrolledClass[] = [
  {
    id: "c-2",
    name: "IELTS Intermediate",
    code: "INTER2",
    description: "Lớp trung cấp mục tiêu band 6.5, trọng tâm Reading và Writing Task 2.",
    studentsCount: 32,
    targetBand: 6.5,
    totalAssignments: 3,
    completedAssignments: 1,
    teacher: {
      id: "teacher-hung",
      fullName: "Thầy Hùng",
      email: "hung.nguyen@ieltslovers.com",
    },
    students: [
      { id: "student-long", fullName: "Long (Tôi)", email: "long.student@ieltslovers.com", targetBand: 7.0 },
      { id: "s-1", fullName: "Nguyễn Văn An", email: "an.nguyen@gmail.com", targetBand: 6.5 },
      { id: "s-2", fullName: "Trần Minh Anh", email: "minhanh.tran@gmail.com", targetBand: 7.0 },
      { id: "s-3", fullName: "Lê Hoàng Nam", email: "nam.le@gmail.com", targetBand: 6.5 },
      { id: "s-4", fullName: "Phạm Ngọc Linh", email: "linh.pham@gmail.com", targetBand: 7.5 },
      { id: "s-5", fullName: "Đỗ Gia Huy", email: "huy.do@gmail.com", targetBand: 6.5 },
    ],
  },
  {
    id: "c-1",
    name: "IELTS Foundation",
    code: "FOUND1",
    description: "Lớp nền tảng mục tiêu 5.5 - 6.0, củng cố ngữ pháp và từ vựng cốt lõi.",
    studentsCount: 28,
    targetBand: 6.0,
    totalAssignments: 2,
    completedAssignments: 2,
    teacher: {
      id: "teacher-lan",
      fullName: "Cô Lan",
      email: "lan.tran@ieltslovers.com",
    },
    students: [
      { id: "student-long", fullName: "Long (Tôi)", email: "long.student@ieltslovers.com", targetBand: 7.0 },
      { id: "s-6", fullName: "Hoàng Mai Chi", email: "chi.hoang@gmail.com", targetBand: 6.0 },
      { id: "s-7", fullName: "Bùi Tuấn Kiệt", email: "kiet.bui@gmail.com", targetBand: 6.0 },
      { id: "s-8", fullName: "Hoàng Bảo Trâm", email: "tram.hoang@gmail.com", targetBand: 6.5 },
    ],
  },
]

export const DEMO_TEACHER_DASHBOARD: TeacherDashboardStats = {
  totalClasses: 5,
  totalStudents: 128,
  pendingGradingCount: 18,
  averageScore: 6.4,
  recentSubmissions: [
    {
      attemptId: "att-sub-1",
      studentId: "s-1",
      studentName: "Nguyễn Văn An",
      examTitle: "IELTS Mock Test 01",
      submittedAt: "2026-09-18T14:15:00.000Z",
      overallBand: 6.5,
      suspicious: false,
    },
    {
      attemptId: "att-sub-2",
      studentId: "s-2",
      studentName: "Trần Minh Anh",
      examTitle: "IELTS Writing Task 2 Practice",
      submittedAt: "2026-09-18T11:40:00.000Z",
      overallBand: 7.0,
      suspicious: false,
    },
    {
      attemptId: "att-sub-3",
      studentId: "s-3",
      studentName: "Lê Hoàng Nam",
      examTitle: "IELTS Mock Test 01",
      submittedAt: "2026-09-17T20:10:00.000Z",
      overallBand: 6.0,
      suspicious: true,
    },
  ],
}

export const DEMO_PENDING_GRADING: PendingWritingSubmission[] = [
  {
    attemptId: "att-grade-01",
    studentName: "Nguyễn Văn An",
    studentEmail: "an.nguyen@gmail.com",
    examTitle: "IELTS Mock Test 01",
    submittedAt: "2026-09-18T14:15:00.000Z",
    hasSuspiciousActivity: false,
  },
  {
    attemptId: "att-grade-02",
    studentName: "Trần Minh Anh",
    studentEmail: "minhanh.tran@gmail.com",
    examTitle: "IELTS Writing Task 2 Practice",
    submittedAt: "2026-09-18T11:40:00.000Z",
    hasSuspiciousActivity: false,
  },
  {
    attemptId: "att-grade-03",
    studentName: "Lê Hoàng Nam",
    studentEmail: "nam.le@gmail.com",
    examTitle: "IELTS Mock Test 01",
    submittedAt: "2026-09-17T20:10:00.000Z",
    hasSuspiciousActivity: true,
  },
]

export const DEMO_ATTEMPT_RESULT: AttemptResult = {
  attemptId: "att-101",
  status: "submitted",
  scores: {
    listeningRaw: 30,
    listeningBand: 7.0,
    readingRaw: 28,
    readingBand: 6.5,
    writingTask1Band: 6.0,
    writingTask2Band: 5.5,
    writingBand: 5.5,
    overallBand: 6.5,
  },
  writingReview: {
    id: "wr-1",
    attemptId: "att-101",
    task1: {
      score: 6.0,
      comment: "Tốt về phần số liệu và so sánh, nhưng cần hoàn thiện đoạn tổng quan (overview) rõ ràng hơn.",
    },
    task2: {
      score: 5.5,
      comment: "Lập luận cơ bản mạch lạc nhưng từ vựng còn lặp từ. Cần phát triển thêm các ý phản biện trong thân bài 2.",
    },
    overallWritingScore: 5.5,
    generalFeedback: "Em đã có sự tiến bộ so với tuần trước. Chú ý phân bổ thời gian đều cho cả 2 task.",
    createdAt: "2026-09-19T08:00:00.000Z",
    updatedAt: "2026-09-19T08:00:00.000Z",
  },
  details: [
    {
      questionId: "q-l1",
      studentAnswer: "Jenkins",
      acceptedAnswers: ["jenkins"],
      isCorrect: true,
      explanation: "Người nói đánh vần tên là J-E-N-K-I-N-S.",
    },
    {
      questionId: "q-l2",
      studentAnswer: "Bridge",
      acceptedAnswers: ["bridge"],
      isCorrect: true,
      explanation: "Địa chỉ là 42 Bridge Street.",
    },
    {
      questionId: "q-l3",
      studentAnswer: "B",
      acceptedAnswers: ["B"],
      isCorrect: true,
      explanation: "Tour bảo tàng bắt đầu vào lúc 10:30 AM.",
    },
    {
      questionId: "q-r1",
      studentAnswer: "TRUE",
      acceptedAnswers: ["TRUE"],
      isCorrect: true,
      explanation: "Đoạn A khẳng định cá voi bơi hơn 8,000 km mỗi năm.",
    },
    {
      questionId: "q-r2",
      studentAnswer: "TRUE",
      acceptedAnswers: ["FALSE"],
      isCorrect: false,
      explanation: "Đoạn B chỉ ra rằng tiếng hát của cá voi tiến hóa và thay đổi qua các mùa giao phối (evolving gradually).",
    },
  ],
}

export const DEMO_GRADING_VIEW: AttemptGradingView = {
  attemptId: "att-grade-01",
  student: { id: "s-1", fullName: "Nguyễn Văn An" },
  writingTasks: [
    {
      task: 1,
      prompt:
        "The chart below illustrates the proportion of renewable energy consumption in four European countries from 2010 to 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
      studentContent:
        "The provided chart illustrates the proportion of renewable energy consumption across four different European nations, namely Sweden, Germany, France, and Spain, measured between 2010 and 2024.\n\nOverall, it is immediately apparent that all four countries experienced an upward trajectory in their utilization of renewable energy resources over the given 14-year period. Among these, Sweden consistently maintained the highest share throughout, whereas Spain registered the most noticeable acceleration after 2018.\n\nIn 2010, Sweden led the group with approximately 48% of its total energy coming from renewable sources. This figure steadily grew to surpass 60% by the end of 2024. Germany and Spain initially accounted for around 15% and 12% respectively, before ascending gradually to roughly 35% and 30% by 2024. In contrast, France demonstrated the slowest pace of development, rising modestly from 10% to just under 20% in the final recorded year.",
      wordCount: 154,
    },
    {
      task: 2,
      prompt:
        "Some people believe that artificial intelligence will soon replace human teachers in education, while others argue that human interaction is irreplaceable. Discuss both views and give your own opinion. Write at least 250 words.",
      studentContent:
        "In recent years, the rapid evolution of artificial intelligence has sparked intense debate concerning its future role in pedagogy. While some observers argue that advanced automated algorithms will inevitably substitute educators, I firmly believe that the indispensable human elements of empathy and mentorship ensure that human teachers will remain essential.\n\nOn the one hand, proponents of AI highlighting efficiency point out that intelligent systems can tailor curricula to individual learning curves with unparalleled precision. An AI tutor can analyze thousands of student responses in milliseconds, diagnosing specific grammatical weaknesses or mathematical misconceptions immediately. Moreover, AI platforms operate unconstrained by geographical boundaries or traditional school hours, democratization access to high-quality educational materials worldwide.\n\nOn the other hand, education encompasses far more than the mere dissemination of academic knowledge. Teachers serve as role models who inspire resilience, critical inquiry, and ethical discernment. The psychological and emotional support provided by an empathetic teacher during times of academic distress cannot be replicated by synthetic neural networks. When a student feels discouraged, a warm word of encouragement from a human mentor often makes the decisive difference between giving up and persevering.\n\nIn conclusion, while artificial intelligence undeniably constitutes a transformative pedagogical tool capable of automating grading and personalized practice, it should serve as a complement rather than a substitute. The profound emotional bond and moral guidance offered by human educators remain entirely irreplaceable.",
      wordCount: 238,
    },
  ],
}

export const DEMO_EXAMS: ExamSummary[] = [
  {
    id: "exam-mock-01",
    title: "IELTS Mock Test 01",
    description: "Đề thi thử đầy đủ 3 kỹ năng Listening, Reading và Writing chuẩn format IDP/BC.",
    durationMinutes: 165,
    status: "published",
    skills: ["listening", "reading", "writing"],
    questionCount: 13,
    assignmentCount: 2,
    openAt: "2026-09-10T00:00:00.000Z",
    closeAt: "2026-10-10T23:59:59.000Z",
    createdAt: "2026-09-08T09:00:00.000Z",
  },
  {
    id: "exam-listening-01",
    title: "IELTS Listening Practice 01",
    description: "Luyện Listening 4 phần, tập trung form completion và multiple choice.",
    durationMinutes: 30,
    status: "published",
    skills: ["listening"],
    questionCount: 40,
    assignmentCount: 1,
    createdAt: "2026-09-05T09:00:00.000Z",
  },
  {
    id: "exam-reading-03",
    title: "IELTS Reading Practice 03",
    description: "Luyện Reading 3 passage với True/False/Not Given và Matching Headings.",
    durationMinutes: 60,
    status: "published",
    skills: ["reading"],
    questionCount: 40,
    assignmentCount: 1,
    createdAt: "2026-09-09T09:00:00.000Z",
  },
  {
    id: "exam-writing-02",
    title: "IELTS Writing Task 2 Practice",
    description: "Bản nháp đề luyện Writing Task 2 cho lớp Intermediate.",
    durationMinutes: 60,
    status: "draft",
    skills: ["writing"],
    questionCount: 1,
    assignmentCount: 0,
    createdAt: "2026-09-18T09:00:00.000Z",
  },
  {
    id: "exam-mock-02",
    title: "IELTS Mock Test 02",
    description: "Đề đã đóng sau đợt thi tháng 8.",
    durationMinutes: 165,
    status: "closed",
    skills: ["listening", "reading", "writing"],
    questionCount: 40,
    assignmentCount: 3,
    createdAt: "2026-08-01T09:00:00.000Z",
  },
]

export const DEMO_QUESTION_BANK: Question[] = [
  {
    id: "q-l1",
    skill: "listening",
    part: 1,
    type: "form_completion",
    prompt: "Customer Name: Sarah [1]",
    data: { templateText: "Customer Name: Sarah [1]", wordLimit: "ONE WORD" },
    acceptedAnswers: ["jenkins"],
    points: 1,
    explanation: "Người nói đánh vần tên J-E-N-K-I-N-S.",
    mediaIds: [],
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-12T09:00:00.000Z",
  },
  {
    id: "q-l2",
    skill: "listening",
    part: 1,
    type: "form_completion",
    prompt: "Delivery Address: 42 [2] Street",
    data: { templateText: "Delivery Address: 42 [2] Street", wordLimit: "ONE WORD" },
    acceptedAnswers: ["bridge"],
    points: 1,
    updatedAt: "2026-09-12T09:00:00.000Z",
  },
  {
    id: "q-l3",
    skill: "listening",
    part: 1,
    type: "multiple_choice",
    prompt: "What time does the morning museum tour start?",
    data: {
      options: [
        { id: "A", text: "9:00 AM" },
        { id: "B", text: "10:30 AM" },
        { id: "C", text: "11:15 AM" },
      ],
    },
    acceptedAnswers: ["B"],
    points: 1,
    updatedAt: "2026-09-10T09:00:00.000Z",
  },
  {
    id: "q-l4",
    skill: "listening",
    part: 2,
    type: "map_labelling",
    prompt: "Label the map. Which letter shows the car park?",
    data: {
      options: [
        { id: "A", text: "A" },
        { id: "B", text: "B" },
        { id: "C", text: "C" },
      ],
    },
    acceptedAnswers: ["C"],
    points: 1,
    mediaIds: ["m-img-map"],
    updatedAt: "2026-09-11T09:00:00.000Z",
  },
  {
    id: "q-l5",
    skill: "listening",
    part: 3,
    type: "matching",
    prompt: "Match each speaker with their opinion about the course.",
    data: {
      options: [
        { id: "A", text: "Too theoretical" },
        { id: "B", text: "Very practical" },
        { id: "C", text: "Poorly organised" },
      ],
    },
    acceptedAnswers: ["B"],
    points: 1,
    updatedAt: "2026-09-11T09:00:00.000Z",
  },
  {
    id: "q-r1",
    skill: "reading",
    part: 1,
    type: "true_false_not_given",
    prompt: "Humpback whales travel more than 8,000 km annually during migration.",
    data: {
      options: [
        { id: "TRUE", text: "True" },
        { id: "FALSE", text: "False" },
        { id: "NOT GIVEN", text: "Not Given" },
      ],
    },
    acceptedAnswers: ["TRUE"],
    points: 1,
    explanation: "Đoạn A khẳng định cá voi bơi hơn 8,000 km mỗi năm.",
    updatedAt: "2026-09-13T09:00:00.000Z",
  },
  {
    id: "q-r2",
    skill: "reading",
    part: 1,
    type: "true_false_not_given",
    prompt: "Whale songs remain completely unchanged from one breeding season to the next.",
    data: {
      options: [
        { id: "TRUE", text: "True" },
        { id: "FALSE", text: "False" },
        { id: "NOT GIVEN", text: "Not Given" },
      ],
    },
    acceptedAnswers: ["FALSE"],
    points: 1,
    explanation: "Đoạn B chỉ ra rằng tiếng hát của cá voi tiến hóa qua các mùa.",
    updatedAt: "2026-09-13T09:00:00.000Z",
  },
  {
    id: "q-r3",
    skill: "reading",
    part: 1,
    type: "matching_headings",
    prompt: "Choose the correct heading for Paragraph B.",
    data: {
      headings: [
        { id: "i", text: "Acoustic culture and vocal evolution" },
        { id: "ii", text: "Threats posed by maritime traffic" },
        { id: "iii", text: "Record-breaking long distance journeys" },
      ],
    },
    acceptedAnswers: ["i"],
    points: 1,
    updatedAt: "2026-09-13T09:00:00.000Z",
  },
  {
    id: "q-r4",
    skill: "reading",
    part: 2,
    type: "summary_completion",
    prompt: "Complete the summary below. Write NO MORE THAN TWO WORDS.",
    data: {
      templateText: "Modern shipping has caused a rise in [1] along migration routes.",
      wordLimit: "NO MORE THAN TWO WORDS",
    },
    acceptedAnswers: ["vessel strikes", "collisions"],
    points: 1,
    updatedAt: "2026-09-14T09:00:00.000Z",
  },
  {
    id: "q-r5",
    skill: "reading",
    part: 3,
    type: "yes_no_not_given",
    prompt: "The writer believes that ocean noise pollution is a serious concern.",
    data: {
      options: [
        { id: "YES", text: "Yes" },
        { id: "NO", text: "No" },
        { id: "NOT GIVEN", text: "Not Given" },
      ],
    },
    acceptedAnswers: ["YES"],
    points: 1,
    updatedAt: "2026-09-14T09:00:00.000Z",
  },
  {
    id: "q-w1",
    skill: "writing",
    part: 1,
    type: "writing_task_1",
    prompt:
      "The chart below illustrates the proportion of renewable energy consumption in four European countries from 2010 to 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
    data: { minWords: 150 },
    acceptedAnswers: [],
    points: 9,
    mediaIds: ["m-img-chart"],
    updatedAt: "2026-09-15T09:00:00.000Z",
  },
  {
    id: "q-w2",
    skill: "writing",
    part: 2,
    type: "writing_task_2",
    prompt:
      "Some people believe that artificial intelligence will soon replace human teachers in education, while others argue that human interaction is irreplaceable. Discuss both views and give your own opinion. Write at least 250 words.",
    data: { minWords: 250 },
    acceptedAnswers: [],
    points: 9,
    updatedAt: "2026-09-15T09:00:00.000Z",
  },
  {
    id: "q-l6",
    skill: "listening",
    part: 4,
    type: "note_completion",
    prompt: "Complete the notes. Write ONE WORD ONLY for each answer.",
    data: {
      templateText: "The lecture discusses how [1] affects the migration of birds.",
      wordLimit: "ONE WORD ONLY",
    },
    acceptedAnswers: ["climate"],
    points: 1,
    updatedAt: "2026-09-08T09:00:00.000Z",
  },
  {
    id: "q-r6",
    skill: "reading",
    part: 2,
    type: "multiple_choice",
    prompt: "According to the passage, what is the main cause of coral bleaching?",
    data: {
      options: [
        { id: "A", text: "Rising sea temperatures" },
        { id: "B", text: "Overfishing" },
        { id: "C", text: "Coastal development" },
      ],
    },
    acceptedAnswers: ["A"],
    points: 1,
    updatedAt: "2026-09-16T09:00:00.000Z",
  },
  {
    id: "q-l7",
    skill: "listening",
    part: 2,
    type: "table_completion",
    prompt: "Complete the table below. Write ONE WORD for each answer.",
    data: {
      templateText: "Tour price: £[1] per adult.",
      wordLimit: "ONE WORD",
    },
    acceptedAnswers: ["45", "forty-five"],
    points: 1,
    updatedAt: "2026-09-08T09:00:00.000Z",
  },
]

export const DEMO_EXAM_BUILDER: CandidateExam = {
  ...DEMO_EXAM_MOCK_01,
  id: "exam-writing-02",
  title: "IELTS Writing Task 2 Practice",
  description: "Bản nháp đề luyện Writing Task 2 cho lớp Intermediate.",
  durationMinutes: 60,
  sections: [
    {
      skill: "writing",
      part: 2,
      title: "Writing Task 2",
      instructions: "Answer the task below. Write at least 250 words.",
      questions: [
        {
          id: "q-w2",
          skill: "writing",
          part: 2,
          type: "writing_task_2",
          prompt:
            "Some people believe that artificial intelligence will soon replace human teachers in education, while others argue that human interaction is irreplaceable. Discuss both views and give your own opinion.",
          data: { minWords: 250 },
        },
      ],
    },
  ],
}

export const DEMO_CLASS_ROSTERS: Record<string, ClassRosterStudent[]> = {
  "c-1": [
    { id: "s-1", fullName: "Nguyễn Văn An", email: "an.nguyen@gmail.com", targetBand: 6.5, attemptsCount: 8, listening: 6.5, reading: 6.0, writing: 5.5, overall: 6.0 },
    { id: "s-2", fullName: "Trần Minh Anh", email: "minhanh.tran@gmail.com", targetBand: 7.0, attemptsCount: 10, listening: 7.0, reading: 6.5, writing: 6.0, overall: 6.5 },
    { id: "s-3", fullName: "Lê Hoàng Nam", email: "nam.le@gmail.com", targetBand: 6.5, attemptsCount: 6, listening: 6.0, reading: 5.5, writing: 5.5, overall: 5.5 },
    { id: "s-4", fullName: "Phạm Ngọc Linh", email: "linh.pham@gmail.com", targetBand: 7.5, attemptsCount: 12, listening: 7.5, reading: 7.0, writing: 6.5, overall: 7.0 },
    { id: "s-5", fullName: "Đỗ Quang Huy", email: "huy.do@gmail.com", targetBand: 6.0, attemptsCount: 4, listening: 5.5, reading: 5.5, writing: 5.0, overall: 5.5 },
    { id: "s-6", fullName: "Vũ Thị Mai", email: "mai.vu@gmail.com", targetBand: 6.5, attemptsCount: 7, listening: 6.0, reading: 6.5, writing: 5.5, overall: 6.0 },
  ],
  "c-2": [
    { id: "s-1", fullName: "Nguyễn Văn An", email: "an.nguyen@gmail.com", targetBand: 6.5, attemptsCount: 8, listening: 6.5, reading: 6.0, writing: 5.5, overall: 6.0 },
    { id: "s-2", fullName: "Trần Minh Anh", email: "minhanh.tran@gmail.com", targetBand: 7.0, attemptsCount: 10, listening: 7.0, reading: 6.5, writing: 6.0, overall: 6.5 },
    { id: "s-4", fullName: "Phạm Ngọc Linh", email: "linh.pham@gmail.com", targetBand: 7.5, attemptsCount: 12, listening: 7.5, reading: 7.0, writing: 6.5, overall: 7.0 },
    { id: "s-7", fullName: "Bùi Tuấn Kiệt", email: "kiet.bui@gmail.com", targetBand: 7.0, attemptsCount: 9, listening: 6.5, reading: 7.0, writing: 6.0, overall: 6.5 },
    { id: "s-8", fullName: "Hoàng Bảo Trâm", email: "tram.hoang@gmail.com", targetBand: 6.5, attemptsCount: 5, listening: 6.0, reading: 6.0, writing: 5.5, overall: 6.0 },
  ],
  "c-3": [
    { id: "s-4", fullName: "Phạm Ngọc Linh", email: "linh.pham@gmail.com", targetBand: 7.5, attemptsCount: 12, listening: 7.5, reading: 7.0, writing: 6.5, overall: 7.0 },
    { id: "s-2", fullName: "Trần Minh Anh", email: "minhanh.tran@gmail.com", targetBand: 7.0, attemptsCount: 10, listening: 7.0, reading: 6.5, writing: 6.0, overall: 6.5 },
    { id: "s-9", fullName: "Đặng Thu Hà", email: "ha.dang@gmail.com", targetBand: 7.5, attemptsCount: 11, listening: 8.0, reading: 7.5, writing: 7.0, overall: 7.5 },
  ],
}

export const DEMO_CLASS_ANALYTICS: Record<string, ClassAnalytics> = {
  "c-1": {
    classId: "c-1",
    className: "IELTS Foundation",
    studentsCount: 6,
    average: { listening: 6.1, reading: 6.0, writing: 5.5, overall: 5.9 },
    needSupport: [
      { studentId: "s-5", fullName: "Đỗ Quang Huy", overall: 5.5 },
      { studentId: "s-3", fullName: "Lê Hoàng Nam", overall: 5.5 },
    ],
  },
  "c-2": {
    classId: "c-2",
    className: "IELTS Intermediate",
    studentsCount: 5,
    average: { listening: 6.7, reading: 6.5, writing: 5.9, overall: 6.4 },
    needSupport: [{ studentId: "s-8", fullName: "Hoàng Bảo Trâm", overall: 6.0 }],
  },
  "c-3": {
    classId: "c-3",
    className: "IELTS Advanced",
    studentsCount: 3,
    average: { listening: 7.5, reading: 7.0, writing: 6.5, overall: 7.0 },
    needSupport: [],
  },
}

export const DEMO_ASSIGNMENTS: AssignmentSummary[] = [
  {
    id: "assign-1",
    examId: "exam-mock-01",
    examTitle: "IELTS Mock Test 01",
    skills: ["listening", "reading", "writing"],
    targetLabel: "IELTS Intermediate",
    classId: "c-2",
    className: "IELTS Intermediate",
    assignedAt: "2026-09-11T08:00:00.000Z",
    deadline: "2026-09-18T23:59:59.000Z",
    maxAttempts: 1,
    status: "active",
    stats: { assigned: 28, submitted: 12, inProgress: 4 },
  },
  {
    id: "assign-2",
    examId: "exam-reading-03",
    examTitle: "IELTS Reading Practice 03",
    skills: ["reading"],
    targetLabel: "IELTS Foundation",
    classId: "c-1",
    className: "IELTS Foundation",
    assignedAt: "2026-09-14T08:00:00.000Z",
    deadline: "2026-09-22T23:59:59.000Z",
    maxAttempts: 2,
    status: "active",
    stats: { assigned: 28, submitted: 9, inProgress: 6 },
  },
  {
    id: "assign-3",
    examId: "exam-listening-01",
    examTitle: "IELTS Listening Practice 01",
    skills: ["listening"],
    targetLabel: "IELTS Advanced",
    classId: "c-3",
    className: "IELTS Advanced",
    assignedAt: "2026-09-02T08:00:00.000Z",
    deadline: "2026-09-12T23:59:59.000Z",
    maxAttempts: 1,
    status: "archived",
    stats: { assigned: 18, submitted: 18, inProgress: 0 },
  },
  {
    id: "assign-4",
    examId: "exam-writing-02",
    examTitle: "IELTS Writing Task 2 Practice",
    skills: ["writing"],
    targetLabel: "Nguyễn Văn An",
    classId: "c-2",
    className: "IELTS Intermediate",
    assignedAt: "2026-09-16T08:00:00.000Z",
    deadline: "2026-09-30T23:59:59.000Z",
    maxAttempts: 1,
    status: "active",
    stats: { assigned: 1, submitted: 0, inProgress: 1 },
  },
]

export const DEMO_ASSIGNMENT_PROGRESS: AssignmentProgress = {
  id: "assign-1",
  examId: "exam-mock-01",
  examTitle: "IELTS Mock Test 01",
  className: "IELTS Intermediate",
  deadline: "2026-09-18T23:59:59.000Z",
  maxAttempts: 1,
  status: "active",
  averageBand: 6.4,
  students: [
    { studentId: "s-1", studentName: "Nguyễn Văn An", studentEmail: "an.nguyen@gmail.com", status: "submitted", listening: 7.0, reading: 6.5, writing: 5.5, overall: 6.5, submittedAt: "2026-09-18T14:15:00.000Z", attemptId: "att-101", needsCheck: false },
    { studentId: "s-2", studentName: "Trần Minh Anh", studentEmail: "minhanh.tran@gmail.com", status: "submitted", listening: 7.0, reading: 7.0, writing: 6.0, overall: 6.5, submittedAt: "2026-09-18T11:40:00.000Z", attemptId: "att-sub-2", needsCheck: false },
    { studentId: "s-3", studentName: "Lê Hoàng Nam", studentEmail: "nam.le@gmail.com", status: "submitted", listening: 6.0, reading: 5.5, writing: 5.0, overall: 5.5, submittedAt: "2026-09-17T20:10:00.000Z", attemptId: "att-sub-3", needsCheck: true },
    { studentId: "s-4", studentName: "Phạm Ngọc Linh", studentEmail: "linh.pham@gmail.com", status: "in_progress", attemptId: "att-live-4", needsCheck: false },
    { studentId: "s-7", studentName: "Bùi Tuấn Kiệt", studentEmail: "kiet.bui@gmail.com", status: "in_progress", attemptId: "att-live-7", needsCheck: false },
    { studentId: "s-8", studentName: "Hoàng Bảo Trâm", studentEmail: "tram.hoang@gmail.com", status: "not_started", needsCheck: false },
  ],
}

export const DEMO_MEDIA: MediaAsset[] = [
  { id: "m-audio-1", url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg", type: "audio", originalName: "listening_part1.mp3", mimeType: "audio/mpeg", sizeLabel: "4.2 MB", uploadedAt: "2026-09-08T09:00:00.000Z", usageCount: 2, status: "ready" },
  { id: "m-audio-2", url: "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg", type: "audio", originalName: "listening_part2.mp3", mimeType: "audio/mpeg", sizeLabel: "5.1 MB", uploadedAt: "2026-09-08T09:10:00.000Z", usageCount: 1, status: "ready" },
  { id: "m-audio-3", url: "https://actions.google.com/sounds/v1/ambiences/forest_ambience.ogg", type: "audio", originalName: "sound-check.mp3", mimeType: "audio/mpeg", sizeLabel: "1.2 MB", uploadedAt: "2026-09-01T09:00:00.000Z", usageCount: 0, status: "ready" },
  { id: "m-img-map", url: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800", type: "image", originalName: "map_labelling.png", mimeType: "image/png", sizeLabel: "860 KB", uploadedAt: "2026-09-05T09:00:00.000Z", usageCount: 1, status: "ready" },
  { id: "m-img-chart", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800", type: "image", originalName: "renewable_chart.jpg", mimeType: "image/jpeg", sizeLabel: "1.4 MB", uploadedAt: "2026-09-06T09:00:00.000Z", usageCount: 1, status: "ready" },
  { id: "m-img-diagram", url: "https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=800", type: "image", originalName: "diagram_process.jpg", mimeType: "image/jpeg", sizeLabel: "2.1 MB", uploadedAt: "2026-09-07T09:00:00.000Z", usageCount: 0, status: "ready" },
  { id: "m-audio-4", url: "", type: "audio", originalName: "listening_part3.mp3", mimeType: "audio/mpeg", sizeLabel: "3.8 MB", uploadedAt: "2026-09-18T09:00:00.000Z", usageCount: 0, status: "pending" },
]

export const DEMO_EXAM_ANALYTICS: ExamAnalytics = {
  examId: "exam-mock-01",
  examTitle: "IELTS Mock Test 01",
  attemptCount: 86,
  averageBand: 6.2,
  bandDistribution: [
    { band: "4.0", count: 2 },
    { band: "4.5", count: 4 },
    { band: "5.0", count: 8 },
    { band: "5.5", count: 14 },
    { band: "6.0", count: 21 },
    { band: "6.5", count: 18 },
    { band: "7.0", count: 11 },
    { band: "7.5", count: 6 },
    { band: "8.0", count: 2 },
  ],
  sectionAccuracy: [
    { label: "Listening Part 1", skill: "listening", accuracy: 84 },
    { label: "Listening Part 2", skill: "listening", accuracy: 71 },
    { label: "Listening Part 3", skill: "listening", accuracy: 63 },
    { label: "Listening Part 4", skill: "listening", accuracy: 55 },
    { label: "Reading Passage 1", skill: "reading", accuracy: 78 },
    { label: "Reading Passage 2", skill: "reading", accuracy: 64 },
    { label: "Reading Passage 3", skill: "reading", accuracy: 52 },
  ],
  hardestQuestions: [
    { questionId: "q-l5", prompt: "Match each speaker with their opinion about the course.", skill: "listening", part: 3, accuracy: 32, acceptedAnswer: "B (Insufficient support)" },
    { questionId: "q-r4", prompt: "Complete the summary below. Modern shipping has caused a rise in [1].", skill: "reading", part: 2, accuracy: 38, acceptedAnswer: "vessel strikes / collisions" },
    { questionId: "q-r3", prompt: "Choose the correct heading for Paragraph B.", skill: "reading", part: 1, accuracy: 41, acceptedAnswer: "i (Acoustic culture)" },
    { questionId: "q-l6", prompt: "Complete the notes. Write ONE WORD ONLY for each answer.", skill: "listening", part: 4, accuracy: 45, acceptedAnswer: "navigation" },
    { questionId: "q-r5", prompt: "The writer believes that ocean noise pollution is a serious concern.", skill: "reading", part: 3, accuracy: 48, acceptedAnswer: "TRUE" },
    { questionId: "q-l3", prompt: "What is the speaker's main recommendation for overseas students?", skill: "listening", part: 2, accuracy: 51, acceptedAnswer: "C (Join local clubs)" },
    { questionId: "q-r2", prompt: "Whale songs remain completely unchanged from one breeding season to the next.", skill: "reading", part: 1, accuracy: 54, acceptedAnswer: "FALSE" },
    { questionId: "q-l2", prompt: "Where is the new library extension going to be constructed?", skill: "listening", part: 1, accuracy: 58, acceptedAnswer: "East Wing" },
    { questionId: "q-r1", prompt: "Humpback whales travel more than 8,000 km annually during migration.", skill: "reading", part: 1, accuracy: 62, acceptedAnswer: "TRUE" },
    { questionId: "q-l1", prompt: "Which document must the applicant submit before Friday?", skill: "listening", part: 1, accuracy: 65, acceptedAnswer: "Proof of residence" },
  ],
}

export const DEMO_ADMIN_USERS: User[] = [
  { id: "admin-1", fullName: "Quản trị viên", email: "admin@ieltslovers.com", role: "admin", status: "active", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "teacher-hung", fullName: "Nguyễn Mạnh Hùng", email: "hung.nguyen@ieltslovers.com", phone: "0901234567", role: "teacher", status: "active", createdAt: "2026-02-10T00:00:00.000Z" },
  { id: "teacher-thao", fullName: "Lê Phương Thảo", email: "thao.le@ieltslovers.com", phone: "0912345678", role: "teacher", status: "active", createdAt: "2026-03-05T00:00:00.000Z" },
  { id: "s-1", fullName: "Nguyễn Văn An", email: "an.nguyen@gmail.com", phone: "0987654321", role: "student", targetBand: 6.5, status: "active", createdAt: "2026-04-01T00:00:00.000Z" },
  { id: "s-2", fullName: "Trần Minh Anh", email: "minhanh.tran@gmail.com", role: "student", targetBand: 7.0, status: "active", createdAt: "2026-04-02T00:00:00.000Z" },
  { id: "s-3", fullName: "Lê Hoàng Nam", email: "nam.le@gmail.com", role: "student", targetBand: 6.5, status: "suspended", createdAt: "2026-04-03T00:00:00.000Z" },
  { id: "s-4", fullName: "Phạm Ngọc Linh", email: "linh.pham@gmail.com", role: "student", targetBand: 7.5, status: "active", createdAt: "2026-04-04T00:00:00.000Z" },
  { id: "s-5", fullName: "Đỗ Quang Huy", email: "huy.do@gmail.com", role: "student", targetBand: 6.0, status: "inactive", createdAt: "2026-04-05T00:00:00.000Z" },
]

export const DEMO_ANTI_CHEAT_EVENTS: AntiCheatEvent[] = [
  { id: "ev-1", type: "TAB_SWITCH", timestamp: "2026-09-18T14:02:11.000Z", metadata: { durationMs: 4200 } },
  { id: "ev-2", type: "PASTE", timestamp: "2026-09-18T14:05:48.000Z", metadata: { target: "writing_task_2" } },
  { id: "ev-3", type: "TAB_SWITCH", timestamp: "2026-09-18T14:09:02.000Z", metadata: { durationMs: 8100 } },
  { id: "ev-4", type: "FULLSCREEN_EXIT", timestamp: "2026-09-18T14:12:30.000Z", metadata: {} },
  { id: "ev-5", type: "PASTE", timestamp: "2026-09-18T14:14:19.000Z", metadata: { target: "writing_task_1" } },
  { id: "ev-6", type: "CONTEXT_MENU", timestamp: "2026-09-18T14:15:02.000Z", metadata: {} },
]

export const DEMO_SUSPICIOUS_SUBMISSIONS = [
  {
    attemptId: "att-sub-3",
    studentName: "Lê Hoàng Nam",
    studentEmail: "nam.le@gmail.com",
    examTitle: "IELTS Mock Test 01",
    submittedAt: "2026-09-17T20:10:00.000Z",
    eventCount: 6,
    tabSwitches: 2,
    pastes: 2,
    fullscreenExits: 1,
  },
  {
    attemptId: "att-sub-9",
    studentName: "Hoàng Bảo Trâm",
    studentEmail: "tram.hoang@gmail.com",
    examTitle: "IELTS Reading Practice 03",
    submittedAt: "2026-09-16T09:40:00.000Z",
    eventCount: 3,
    tabSwitches: 3,
    pastes: 0,
    fullscreenExits: 0,
  },
]

export const DEMO_STUDENT_ANALYTICS: StudentProgressAnalytics = {
  studentId: "student-long",
  targetBand: 7.0,
  latest: { listening: 7.0, reading: 6.5, writing: 5.5, overall: 6.5 },
  deltaFromTarget: -0.5,
  points: [
    { attemptId: "att-0901", examId: "exam-reading-01", examTitle: "IELTS Reading Practice 01", submittedAt: "2026-08-15T10:00:00.000Z", reading: 5.5, overall: 5.5 },
    { attemptId: "att-0902", examId: "exam-listening-01", examTitle: "IELTS Listening Practice 01", submittedAt: "2026-08-25T10:00:00.000Z", listening: 6.0, reading: 6.0, overall: 6.0 },
    { attemptId: "att-0903", examId: "exam-mock-00", examTitle: "IELTS Mock Test 00", submittedAt: "2026-09-05T10:00:00.000Z", listening: 6.5, reading: 6.0, writing: 5.5, overall: 6.0 },
    { attemptId: "att-101", examId: "exam-mock-01", examTitle: "IELTS Mock Test 01", submittedAt: "2026-09-18T10:30:00.000Z", listening: 7.0, reading: 6.5, writing: 5.5, overall: 6.5 },
  ],
}


