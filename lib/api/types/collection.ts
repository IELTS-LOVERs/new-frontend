import type { ExamKind, ExamScoringMode, IExamCurriculum } from "./exam"

export type CollectionCategory = string

export interface CollectionItem {
  _id: string
  name: string
  parentId?: string | null
  description?: string
  bannerUrl?: string
  orderIndex: number
  childCount?: number
  examCount: number
  readingCount: number
  listeningCount: number
  writingCount: number
  createdAt: string
  updatedAt: string
}

export interface CollectionTreeNode {
  _id: string
  name: string
  description?: string
  bannerUrl?: string
  orderIndex: number
  examCount: number
  directExamCount: number
  readingCount: number
  listeningCount: number
  writingCount: number
  children: Array<{
    _id: string
    name: string
    parentId: string
    description?: string
    bannerUrl?: string
    orderIndex: number
    examCount: number
    readingCount: number
    listeningCount: number
    writingCount: number
  }>
}

export interface CollectionDetailExam {
  _id: string
  title: string
  kind: ExamKind
  scoringMode: ExamScoringMode
  status: "draft" | "published" | "closed"
  durationMinutes: number
  sections: Array<{
    _id: string
    skill: "listening" | "reading" | "writing"
    part: number
    title?: string
  }>
  curriculum?: IExamCurriculum
  createdAt: string
  updatedAt: string
}

export interface CollectionDetailResponse {
  collection: {
    _id: string
    name: string
    parentId?: string | null
    description?: string
    bannerUrl?: string
    orderIndex: number
    createdBy: string
    createdAt: string
    updatedAt: string
  }
  exams: CollectionDetailExam[]
}
