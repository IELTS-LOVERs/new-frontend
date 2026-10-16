import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Hook to detect whether the viewport width is below a given breakpoint (default 768px).
 * Safely handles SSR by defaulting to false and updating on mount.
 */
export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => {
      setIsMobile(mql.matches)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return isMobile
}
