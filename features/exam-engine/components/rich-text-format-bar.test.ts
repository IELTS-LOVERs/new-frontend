import { afterEach, describe, expect, it } from "vitest"

import { applyRichTextFormat } from "./rich-text-format-bar"

function mountField(value = "hello world") {
  const container = document.createElement("div")
  const field = document.createElement("textarea")
  field.value = value
  container.appendChild(field)
  document.body.appendChild(container)
  field.focus()
  return { container, field }
}

afterEach(() => {
  document.body.innerHTML = ""
})

describe("applyRichTextFormat", () => {
  it("wraps the current selection in bold markers", () => {
    const { container, field } = mountField()
    field.setSelectionRange(0, 5)

    expect(applyRichTextFormat(container, "bold")).toBe(true)
    expect(field.value).toBe("**hello** world")
  })

  it("wraps the selection in italic markers", () => {
    const { container, field } = mountField()
    field.setSelectionRange(6, 11)

    expect(applyRichTextFormat(container, "italic")).toBe(true)
    expect(field.value).toBe("hello *world*")
  })

  it("toggles existing markers off", () => {
    const { container, field } = mountField("**hello** world")
    field.setSelectionRange(2, 7)

    expect(applyRichTextFormat(container, "bold")).toBe(true)
    expect(field.value).toBe("hello world")
  })

  it("inserts an empty marker pair when there is no selection", async () => {
    const { container, field } = mountField("hello")
    field.setSelectionRange(5, 5)

    expect(applyRichTextFormat(container, "highlight")).toBe(true)
    expect(field.value).toBe("hello====")
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    expect(field.selectionStart).toBe(7)
  })

  it("rejects fields outside the editor container", () => {
    const { field } = mountField()
    const other = document.createElement("div")
    field.setSelectionRange(0, 5)

    expect(applyRichTextFormat(other, "bold")).toBe(false)
    expect(field.value).toBe("hello world")
  })
})
