/** `fetch` that gives up with a TimeoutError after `ms`, so a stalled connection cannot hang a script or build. */
export function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 60_000): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
}
