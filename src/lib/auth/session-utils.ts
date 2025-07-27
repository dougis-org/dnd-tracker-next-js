// Utility functions for session validation that work in Edge Runtime
export function extractSessionIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  try {
    const sessionMatch = cookieHeader.match(/session=([^;]+)/);
    return sessionMatch ? sessionMatch[1] : null;
  } catch {
    return null;
  }
}

export function isValidSessionIdFormat(sessionId: any): boolean {
  return (
    typeof sessionId === 'string' &&
    sessionId.length >= 32 &&
    /^[a-zA-Z0-9]+$/.test(sessionId)
  );
}

export function isValidOrigin(requestUrl: string, trustedOrigins: string[]): boolean {
  try {
    const url = new URL(requestUrl);
    const origin = url.hostname + (url.port ? `:${url.port}` : '');

    return trustedOrigins.some(trusted =>
      origin === trusted ||
      origin.endsWith(`.${trusted}`)
    );
  } catch {
    return false;
  }
}