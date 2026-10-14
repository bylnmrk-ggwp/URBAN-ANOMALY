export type AppErrorCode =
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'out_of_stock'
  | 'network'
  | 'unknown'

export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AppError'
    this.code = code
  }

  static notFound(what: string) {
    return new AppError('not_found', `${what} was not found.`)
  }

  static unauthorized(message = 'You need to sign in to continue.') {
    return new AppError('unauthorized', message)
  }

  static forbidden(message = 'You do not have permission to do that.') {
    return new AppError('forbidden', message)
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (isAppError(error)) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}
