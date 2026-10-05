import type { ActionErrorCode } from "./error-codes";

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: ActionErrorCode };
