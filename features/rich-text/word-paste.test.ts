import { describe, expect, it } from "vitest"

import {
  cleanPastedHtml,
  htmlToTemplateDsl,
  normalizePastedHtml,
} from "./word-paste"

const wordListHtml = `
<html><body>
<p class="MsoListParagraphCxSpFirst" style="mso-list:l0 level1 lfo1">
  <span style="mso-list:Ignore">·<span> </span></span>First item
</p>
<p class="MsoListParagraphCxSpMiddle" style="mso-list:l0 level2 lfo1">
  <span style="mso-list:Ignore">o<span> </span></span>Nested item
</p>
<p class="MsoListParagraphCxSpLast" style="mso-list:l0 level1 lfo1">
  <span style="mso-list:Ignore">·<span> </span></span>Second item
</p>
</body></html>`

describe("normalizePastedHtml", () => {
  it("converts Word mso-list paragraphs into nested ul/li elements", () => {
    const html = normalizePastedHtml(wordListHtml)
    const parsed = new DOMParser().parseFromString(html, "text/html")
    const root = parsed.querySelector("ul")
    const topItems = Array.from(root?.children ?? []).filter(
      (element) => element.tagName.toLowerCase() === "li"
    )

    expect(root).not.toBeNull()
    expect(topItems[0]?.firstChild?.textContent?.trim()).toBe("First item")
    expect(topItems[0]?.querySelector("ul li")?.textContent?.trim()).toBe("Nested item")
    expect(topItems[1]?.firstChild?.textContent?.trim()).toBe("Second item")
    expect(html).not.toContain("mso-list")
  })

  it("keeps ordered Word lists as <ol>", () => {
    const html = normalizePastedHtml(`
      <p style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">1.<span> </span></span>Step one</p>
      <p style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">2.<span> </span></span>Step two</p>
    `)
    const parsed = new DOMParser().parseFromString(html, "text/html")
    const items = Array.from(parsed.querySelectorAll("ol li"))

    expect(parsed.querySelector("ol")).not.toBeNull()
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      "Step one",
      "Step two",
    ])
  })

  it("rewrites Word inline styles into semantic marks and clamps font size", () => {
    const html = normalizePastedHtml(
      `<p><span style="font-weight:bold">Bold</span> <span style="font-style:italic">Italic</span> <span style="font-size:20pt">Big</span></p>`
    )

    expect(html).toContain("<strong>Bold</strong>")
    expect(html).toContain("<em>Italic</em>")
    expect(html).toContain("font-size:28px")
  })

  it("removes images, scripts and Word noise", () => {    const html = normalizePastedHtml(
      `<html><head><style>p{color:red}</style></head><body>
        <script>alert(1)</script>
        <p>Hello<img src="x.png"><o:p></o:p></p>
      </body></html>`
    )

    expect(html).toContain("Hello")
    expect(html).not.toContain("<script")
    expect(html).not.toContain("<img")
    expect(html).not.toContain("<style")
  })

  it("keeps paragraph alignment from Word on the surviving paragraphs", () => {
    const parsed = new DOMParser().parseFromString(
      normalizePastedHtml(`
        <p style="text-align:center">Centered</p>
        <p class="MsoRightAlign">Right</p>
        <p style="text-align: left">Left</p>
      `),
      "text/html"
    )
    const paragraphs = Array.from(parsed.querySelectorAll("p"))

    expect(paragraphs[0].style.textAlign).toBe("center")
    expect(paragraphs[1].style.textAlign).toBe("right")
    expect(paragraphs[2].style.textAlign).toBe("left")
  })
})

describe("cleanPastedHtml", () => {  it("sanitizes the normalized clipboard HTML", () => {
    const html = cleanPastedHtml(
      `<p onclick="alert(1)">Safe <a href="javascript:alert(1)">link</a></p>`
    )

    expect(html).not.toContain("onclick")
    expect(html).not.toContain("javascript:")
    expect(html).toContain("Safe")
  })
})

describe("htmlToTemplateDsl", () => {
  it("converts a pasted table into a GFM table", () => {
    const dsl = htmlToTemplateDsl(
      `<table>
        <tr><th>Country</th><th>Capital</th></tr>
        <tr><td>France</td><td>[1]</td></tr>
        <tr><td>Japan</td><td>[2]</td></tr>
      </table>`
    )

    expect(dsl).toBe(
      "| Country | Capital |\n| --- | --- |\n| France | [1] |\n| Japan | [2] |"
    )
  })

  it("converts bullet lists and keeps inline markers", () => {
    const dsl = htmlToTemplateDsl(
      `<p>Complete the notes:</p>
       <ul>
         <li>Tea was discovered in <strong>China</strong> in [1].</li>
         <li>It was used for <em>medical</em> purposes in [2].</li>
       </ul>`
    )

    expect(dsl).toBe(
      "Complete the notes:\n\n- Tea was discovered in **China** in [1].\n- It was used for *medical* purposes in [2]."
    )
  })

  it("returns an empty string for empty input", () => {
    expect(htmlToTemplateDsl("")).toBe("")
  })
})
