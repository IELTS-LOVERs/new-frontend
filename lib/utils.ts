export { cn } from "cn"

let clientIdCounter = 0

/**
 * Generate a temporary client-side id for builder entities that do not exist on
 * the server yet (new sections / question groups / questions).
 *
 * Kept outside React components so `Date.now()` / `Math.random()` are not
 * flagged by the react-hooks/purity rule; callers inside event handlers stay
 * stable across re-renders.
 */
export function createClientId(prefix: string): string {
  clientIdCounter += 1
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${clientIdCounter}-${random}`
}
