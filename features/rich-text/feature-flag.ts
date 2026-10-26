/**
 * Escape hatch for the rich editor rollout. Defaults to on; set
 * `NEXT_PUBLIC_RICH_EDITOR=false` to fall back to the legacy textareas without
 * a redeploy of the backend.
 */
export const RICH_EDITOR_ENABLED =
  process.env.NEXT_PUBLIC_RICH_EDITOR !== "false"
