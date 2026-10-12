const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'exam', '[attemptId]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('Submit Review Dialog'));

if (idx === -1) {
  console.log('ERROR: Could not find Submit Review Dialog');
  process.exit(1);
}

const groupRenderer = `// ═══════════════════════════════════════════════════════════════
// Question Group Renderer (for new format)
// ═══════════════════════════════════════════════════════════════

function GroupRenderer({
  group,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
}: {
  group: CandidateQuestionGroup
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
}) {
  const config = group.config || {}
  const options = (config.options as Array<{ id: string; text: string }>) ?? []
  const isTFNG = group.groupType === "true_false_not_given"
  const isYNNG = group.groupType === "yes_no_not_given"
  const isMatching = group.groupType.startsWith("matching_")
  const isCompletion = ["sentence_completion", "note_completion", "table_completion", "summary_completion", "form_completion", "flow_chart_completion", "short_answer"].includes(group.groupType)
  const maxWords = (config.maxWords as number) ?? undefined
  const wordLimitText = maxWords ? \`NO MORE THAN \${maxWords} WORD\${maxWords > 1 ? "S" : ""}\` : undefined
  const matchPool: Array<{ id: string; text: string }> = (() => {
    if (group.groupType === "matching_headings") return (config.headingsPool as any[]) ?? []
    if (group.groupType === "matching_information") return ((config.paragraphLabels as string[]) ?? []).map((l: string) => ({ id: l, text: l }))
    if (group.groupType === "matching_features") return (config.featuresPool as any[]) ?? []
    if (group.groupType === "matching_sentence_endings") return (config.endingsPool as any[]) ?? []
    return []
  })()
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Questions {group.questions[0]?.questionNumber}\\u2013{group.questions[group.questions.length - 1]?.questionNumber}
        </p>
        <p className="text-sm font-medium text-foreground whitespace-pre-line">{group.instructions}</p>
        {wordLimitText && <p className="text-xs font-semibold text-primary">{wordLimitText}</p>}
      </div>
      {isMatching && matchPool.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
          {matchPool.map((item) => (
            <div key={item.id} className="flex gap-2 text-xs">
              <span className="font-bold text-primary w-5">{item.id}</span>
              <span className="text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {group.questions.map((q) => {
          const answer = answers[q.id]?.value ?? ""
          const isFlagged = !!flagged[q.id]
          return (
            <div key={q.id} className="flex gap-3 items-start">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary mt-0.5">
                {q.questionNumber}
              </span>
              <div className="flex-1 space-y-1.5">
                {q.prompt && <p className="text-sm text-foreground">{q.prompt}</p>}
                {(isTFNG || isYNNG) ? (
                  <div className="flex gap-2">
                    {options.map((opt) => (
                      <button key={opt.id} type="button" onClick={() => onAnswer(q.id, opt.id)}
                        className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                          answer === opt.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                        )}>{opt.text}</button>
                    ))}
                  </div>
                ) : (group.groupType === "multiple_choice_single") ? (
                  <div className="space-y-1">
                    {options.map((opt) => (
                      <button key={opt.id} type="button" onClick={() => onAnswer(q.id, opt.id)}
                        className={cn("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                          answer === opt.id ? "border-primary bg-primary/5 font-medium text-primary" : "border-border hover:bg-muted"
                        )}>
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">{opt.id}</span>
                        <span>{opt.text || opt.id}</span>
                      </button>
                    ))}
                  </div>
                ) : isMatching ? (
                  <select value={answer} onChange={(e) => onAnswer(q.id, e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs">
                    <option value="">\\u2014</option>
                    {matchPool.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.id}{opt.text !== opt.id ? " - " + opt.text : ""}</option>
                    ))}
                  </select>
                ) : (
                  <Input value={answer} onChange={(e) => onAnswer(q.id, e.target.value)} className="h-8 text-xs"
                    placeholder={isCompletion && maxWords ? "T\\u1ed1i \\u0111a " + maxWords + " t\\u1eeb" : "Nh\\u1eadp c\\u00e2u tr\\u1ea3 l\\u1eddi..."} />
                )}
              </div>
              <button type="button" onClick={() => onToggleFlag(q.id)}
                className={cn("mt-1 shrink-0", isFlagged ? "text-amber-500" : "text-muted-foreground/40 hover:text-muted-foreground")}>
                <HugeiconsIcon icon={Flag01Icon} size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Submit Review Dialog
// ═══════════════════════════════════════════════════════════════`;

lines.splice(idx - 1, 3, groupRenderer);
content = lines.join('\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: GroupRenderer added before Submit Review Dialog');
