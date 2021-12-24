export function getError(maybeError: unknown): Error {
  if (maybeError instanceof Error) {
    return maybeError;
  }

  return maybeError
    ? new Error(JSON.stringify(maybeError))
    : new Error("Неизвестная ошибка");
}
