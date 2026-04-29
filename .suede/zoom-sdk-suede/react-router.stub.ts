/**
 * Simple stub for react-router's useSearchParams hook
 * Returns a URLSearchParams object based on the current window location
 */
export function useSearchParams(): [URLSearchParams] {
  const searchParams = new URLSearchParams(window.location.search);
  return [searchParams];
}
