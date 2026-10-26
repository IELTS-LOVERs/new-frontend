import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { HighlightLayer } from "@/features/exam-engine/components/highlight-layer"
import type { ExamHighlightItem } from "@/features/exam-engine/lib/highlight"
import { SelectableRichDoc } from "./selectable"
import type { RichDoc } from "@/lib/api/types"

const doc: RichDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hello " },
        { type: "text", text: "world" },
      ],
    },
  ],
}

function renderWithHighlights(items: ExamHighlightItem[]) {
  return render(
    <HighlightLayer sectionIndex={0} items={items} onItemsChange={() => {}}>
      <SelectableRichDoc targetId="passage" doc={doc} />
    </HighlightLayer>
  )
}

describe("SelectableRichDoc", () => {
  it("threads highlight offsets across separate text nodes", () => {
    const items: ExamHighlightItem[] = [
      {
        id: "h1",
        sectionIndex: 0,
        targetId: "passage",
        start: 3,
        end: 8,
        text: "lo wo",
        createdAt: 1,
      },
    ]

    const { container } = renderWithHighlights(items)
    const marks = Array.from(container.querySelectorAll('mark[data-hl-id="h1"]'))

    expect(marks.map((mark) => mark.textContent).join("")).toBe("lo wo")
  })

  it("renders plain text when there are no highlights", () => {
    const { container } = renderWithHighlights([])

    expect(container.querySelector("mark")).toBeNull()
    expect(container.textContent).toBe("Hello world")
  })

  it("marks the exact selected characters only", () => {
    const items: ExamHighlightItem[] = [
      {
        id: "h2",
        sectionIndex: 0,
        targetId: "passage",
        start: 6,
        end: 11,
        text: "world",
        createdAt: 1,
      },
    ]

    const { container } = renderWithHighlights(items)

    expect(container.querySelector('mark[data-hl-id="h2"]')?.textContent).toBe("world")
  })
})
