import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SkillBadges, orderSkills } from "./skill-badges"

describe("orderSkills", () => {
  it("deduplicates and sorts skills in IELTS order", () => {
    expect(orderSkills(["writing", "reading", "reading", "listening"])).toEqual([
      "listening",
      "reading",
      "writing",
    ])
  })

  it("ignores unknown skills and empty input", () => {
    expect(orderSkills(["speaking", "reading"])).toEqual(["reading"])
    expect(orderSkills([])).toEqual([])
    expect(orderSkills(undefined)).toEqual([])
    expect(orderSkills(null)).toEqual([])
  })
})

describe("SkillBadges", () => {
  it("renders one chip per skill in order", () => {
    const { container } = render(
      <SkillBadges skills={["writing", "listening"]} />
    )
    const labels = Array.from(container.querySelectorAll("[data-slot=badge]")).map(
      (node) => node.textContent
    )
    expect(labels).toEqual(["Listening", "Writing"])
  })

  it("renders a fallback when there are no sections yet", () => {
    const { container } = render(<SkillBadges skills={[]} emptyLabel="Chưa có phần thi" />)
    expect(container.textContent).toBe("Chưa có phần thi")
    expect(container.querySelectorAll("[data-slot=badge]")).toHaveLength(0)
  })
})
