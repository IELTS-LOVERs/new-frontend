/**
 * Parsing helpers for the visual rendering of `config.template` on the exam
 * screen. The persisted schema stays a plain string; these helpers only extract
 * the layout (table grid / flow-chart steps) at render time.
 */

export interface ParsedMarkdownTable {
  /** Header cells (first non-separator row). */
  header: string[]
  /** Body rows (excluding the `| --- |` separator). */
  rows: string[][]
  /** Any text placed before the table block. */
  preamble: string
  /** Any text placed after the table block. */
  trailing: string
}

const isTableLine = (line: string): boolean => {
  const t = line.trim()
  return t.length > 1 && t.startsWith("|") && t.endsWith("|")
}

const isSeparatorRow = (cells: string[]): boolean =>
  cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c.trim()))

const parseRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim())

/**
 * Detect and parse a GitHub-flavoured Markdown table (rows wrapped in `|`).
 * Returns `null` when the template has no table block, so callers can fall back
 * to the plain inline renderer.
 */
export function parseMarkdownTable(
  template: string | null | undefined
): ParsedMarkdownTable | null {
  if (!template) return null

  const lines = template.replace(/\r\n/g, "\n").split("\n")
  let start = -1
  let end = -1

  for (let i = 0; i < lines.length; i++) {
    if (isTableLine(lines[i])) {
      if (start === -1) start = i
      end = i
    } else if (start !== -1) {
      break
    }
  }

  if (start === -1) return null

  const parsed = lines.slice(start, end + 1).map(parseRow)
  if (parsed.length === 0) return null

  const header = parsed[0] ?? []
  const hasSeparator = parsed[1] ? isSeparatorRow(parsed[1]) : false
  const rows = parsed.slice(hasSeparator ? 2 : 1)

  // A lone header row with no body is not a usable table.
  if (rows.length === 0) return null

  const preamble = lines.slice(0, start).join("\n").trim()
  const trailing = lines
    .slice(end + 1)
    .join("\n")
    .trim()

  return { header, rows, preamble, trailing }
}

const stripArrows = (value: string): string =>
  value
    .replace(/^\s*(?:->|=>|→|↓|➔|➜|⇒|»)\s*/, "")
    .replace(/\s*(?:->|=>|→|↓|➔|➜|⇒|»)\s*$/, "")
    .trim()

/**
 * Split a flow-chart template into ordered steps.
 *
 * - When bullet lines (`- step`) are present, each bullet is one step.
 * - Otherwise steps are separated by blank lines.
 */
export function splitFlowSteps(template: string | null | undefined): string[] {
  if (!template) return []
  const cleaned = template.replace(/\r\n/g, "\n")

  const lines = cleaned.split("\n")
  const bullets = lines.filter((l) => /^\s*[-*]\s+/.test(l))

  const rawSteps =
    bullets.length > 0
      ? bullets.map((l) => l.replace(/^\s*[-*]\s+/, ""))
      : cleaned.split(/\n\s*\n/)

  return rawSteps.map(stripArrows).filter((s) => s.length > 0)
}
