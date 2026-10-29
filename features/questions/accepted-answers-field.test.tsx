import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AcceptedAnswersField } from "./accepted-answers-field"

/** Mirrors the real parent: stores exactly what the field commits. */
function Harness({ initial = [] as string[] }) {
  const [answers, setAnswers] = React.useState<string[]>(initial)
  return <AcceptedAnswersField answers={answers} onCommit={setAnswers} />
}

describe("AcceptedAnswersField", () => {
  it("keeps spaces and commas inside one accepted answer", () => {
    render(<Harness />)

    const input = screen.getByLabelText("Đáp án 1") as HTMLInputElement
    fireEvent.focus(input)

    fireEvent.change(input, { target: { value: "two" } })
    expect(input.value).toBe("two")

    fireEvent.change(input, { target: { value: "two " } })
    expect(input.value).toBe("two ")

    fireEvent.change(input, { target: { value: "two decades" } })
    expect(input.value).toBe("two decades")

    fireEvent.change(input, { target: { value: "1,500 people" } })
    expect(input.value).toBe("1,500 people")
  })

  it("shows one input per accepted variant", () => {
    render(<Harness initial={["two decades", "20 years"]} />)

    expect(
      (screen.getByLabelText("Đáp án 1") as HTMLInputElement).value
    ).toBe("two decades")
    expect(
      (screen.getByLabelText("Đáp án 2") as HTMLInputElement).value
    ).toBe("20 years")
  })

  it("adds a row for another accepted variant", () => {
    render(<Harness initial={["two decades"]} />)

    fireEvent.click(screen.getByRole("button", { name: /Thêm cách viết/i }))

    expect((screen.getByLabelText("Đáp án 2") as HTMLInputElement).value).toBe(
      ""
    )
  })

  it("commits the remaining variants when a row is removed", () => {
    render(<Harness initial={["two decades", "20 years"]} />)

    fireEvent.click(screen.getByRole("button", { name: "Xoá đáp án 1" }))

    expect((screen.getByLabelText("Đáp án 1") as HTMLInputElement).value).toBe(
      "20 years"
    )
    expect(screen.queryByLabelText("Đáp án 2")).toBeNull()
  })

  it("does not render the add/remove controls when disabled", () => {
    render(
      <AcceptedAnswersField
        answers={["two decades"]}
        disabled
        onCommit={() => {}}
      />
    )

    expect(screen.queryByRole("button", { name: /Thêm cách viết/i })).toBeNull()
    expect(screen.queryByRole("button", { name: "Xoá đáp án 1" })).toBeNull()
  })
})
