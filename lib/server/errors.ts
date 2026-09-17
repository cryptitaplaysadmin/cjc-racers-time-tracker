export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ApiError' }
}
export function errorStatus(error: unknown, fallback = 503) {
  return error instanceof ApiError ? error.status : error instanceof SyntaxError ? 400 : fallback
}
