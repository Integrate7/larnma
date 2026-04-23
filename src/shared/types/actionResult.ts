export type ActionResult<T> =
  | { success: true; data: T; error: null; errorCode?: string }
  | { success: false; data: null; error: string; errorCode?: string }

export const ok = <T>(data: T): ActionResult<T> => ({
  success: true,
  data,
  error: null,
})

export const fail = <T = never>(
  error: string,
  errorCode?: string,
): ActionResult<T> => ({
  success: false,
  data: null,
  error,
  errorCode,
})
