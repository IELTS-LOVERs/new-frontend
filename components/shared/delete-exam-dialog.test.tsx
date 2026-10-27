import * as React from "react"
import { fireEvent, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DeleteExamDialog, type DeleteExamTarget } from "./delete-exam-dialog"

const mutateAsync = vi.fn()
const cloneMutateAsync = vi.fn()
let currentRole: "teacher" | "admin" = "teacher"

vi.mock("@/hooks/use-exams", () => ({
  useDeleteExamMutation: () => ({ mutateAsync, isPending: false }),
  useCloneExamMutation: () => ({ mutateAsync: cloneMutateAsync, isPending: false }),
}))

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector: (state: { user: { role: string } }) => unknown) =>
    selector({ user: { role: currentRole } }),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@/components/ui/alert-dialog", () => {
  const passthrough = (props: Record<string, unknown>) =>
    props.children as React.ReactNode
  return {
    AlertDialog: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    AlertDialogContent: ({
      children,
    }: {
      children?: React.ReactNode
    }) => <div role="dialog">{children}</div>,
    AlertDialogHeader: passthrough,
    AlertDialogFooter: passthrough,
    AlertDialogTitle: ({ children }: { children?: React.ReactNode }) => (
      <h2>{children}</h2>
    ),
    AlertDialogDescription: passthrough,
    AlertDialogCancel: ({
      children,
      ...props
    }: React.ComponentProps<"button">) => <button {...props}>{children}</button>,
    AlertDialogAction: ({
      children,
      ...props
    }: React.ComponentProps<"button">) => <button {...props}>{children}</button>,
  }
})

const exam = (overrides: Partial<DeleteExamTarget> = {}): DeleteExamTarget => ({
  id: "e1",
  title: "IELTS Mock 01",
  status: "draft",
  hasAttempts: false,
  hasAssignments: false,
  ...overrides,
})

function setup(target: DeleteExamTarget, entityLabel?: string) {
  const onOpenChange = vi.fn()
  const view = render(
    <DeleteExamDialog
      exam={target}
      open
      onOpenChange={onOpenChange}
      entityLabel={entityLabel}
    />
  )
  return { onOpenChange, ...view }
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const match = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === text
  )
  if (!match) throw new Error(`Không tìm thấy nút "${text}"`)
  return match
}

describe("DeleteExamDialog", () => {
  beforeEach(() => {
    currentRole = "teacher"
    mutateAsync.mockReset()
    cloneMutateAsync.mockReset()
  })

  it("xoá thường khi đề nháp chưa có bài làm", async () => {
    mutateAsync.mockResolvedValueOnce({
      message: "ok",
      deletedAssignments: 2,
      deletedAttempts: 0,
    })
    const { container, onOpenChange } = setup(exam())

    fireEvent.click(buttonByText(container, "Xoá"))

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ id: "e1", force: false })
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("chặn giáo viên xoá đề đã có bài làm và chỉ gợi ý nhân bản", () => {
    const { container } = setup(exam({ status: "closed", hasAttempts: true }))

    expect(container.textContent).toContain("Không thể xoá đề thi")
    expect(container.textContent).toContain(
      "đã có học sinh làm bài nên không thể xoá"
    )
    expect(() => buttonByText(container, "Xoá")).toThrow()
  })

  it("nhân bản đề từ dialog khi bị chặn vì đã có bài làm", async () => {
    cloneMutateAsync.mockResolvedValueOnce({ id: "e2" })
    const { container, onOpenChange } = setup(
      exam({ status: "closed", hasAttempts: true })
    )

    fireEvent.click(buttonByText(container, "Nhân bản để tạo bản mới"))

    await waitFor(() => expect(cloneMutateAsync).toHaveBeenCalledWith("e1"))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("chặn giáo viên xoá đề đã xuất bản", () => {
    const { container } = setup(exam({ status: "published" }))

    expect(container.textContent).toContain(
      "đã xuất bản nên không thể xoá trực tiếp"
    )
    expect(() => buttonByText(container, "Xoá")).toThrow()
  })

  it("bắt admin gõ đúng tên đề trước khi xoá cứng", async () => {
    currentRole = "admin"
    mutateAsync.mockResolvedValueOnce({
      message: "ok",
      deletedAssignments: 0,
      deletedAttempts: 3,
    })
    const { container } = setup(exam({ status: "published", hasAttempts: true }))

    const input = container.querySelector("input") as HTMLInputElement
    expect(input).not.toBeNull()
    const confirm = buttonByText(container, "Xoá vĩnh viễn")
    expect(confirm.disabled).toBe(true)

    fireEvent.change(input, { target: { value: "IELTS Mock 0" } })
    expect(confirm.disabled).toBe(true)

    fireEvent.change(input, { target: { value: "IELTS Mock 01" } })
    await waitFor(() => expect(confirm.disabled).toBe(false))

    fireEvent.click(confirm)
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ id: "e1", force: true })
    )
  })

  it("cảnh báo đề đã giao cho lớp sẽ xoá kèm bài tập", () => {
    const { container } = setup(exam({ status: "closed", hasAssignments: true }))

    expect(container.textContent).toContain(
      "Các bài tập đã giao kèm đề thi này cũng sẽ bị xoá theo"
    )
  })

  it("dùng nhãn bài luyện tập cho trang practice", () => {
    const { container } = setup(
      exam({ status: "published", hasAttempts: true }),
      "bài luyện tập"
    )

    expect(container.textContent).toContain("Không thể xoá bài luyện tập")
  })
})
