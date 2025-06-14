export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

export function logError(logger: any, message: string, error: unknown): void {
  const errorMessage = getErrorMessage(error);
  const errorStack = getErrorStack(error);
  logger.error(`${message}: ${errorMessage}`, errorStack);
}

export function createError(message: string, error: unknown): Error {
  const errorMessage = getErrorMessage(error);
  return new Error(`${message}: ${errorMessage}`);
}
