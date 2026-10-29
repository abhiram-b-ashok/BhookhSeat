/** Turns anything that was thrown into a real Error, with a message of a sensible size. */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value;

  let message = 'Unknown error';
  if (typeof value === 'string' && value) message = value;
  else if (typeof value === 'object' && value !== null && 'message' in value) {
    const m = (value as { message: unknown }).message;
    if (typeof m === 'string' && m) message = m;
  }
  return new Error(message.slice(0, 300));
}
