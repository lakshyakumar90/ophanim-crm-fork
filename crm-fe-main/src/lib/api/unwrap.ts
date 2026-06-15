// =====================================================
// Helper: unwrap backend API response for fallback
// =====================================================
export function unwrap(res: any) {
  return res?.data?.data ?? res?.data ?? res;
}
