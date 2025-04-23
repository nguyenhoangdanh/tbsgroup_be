export function extractTokenFromRequest(request: any): string | undefined {
  // Check both cookie and Authorization header
  const cookieToken = request.cookies?.accessToken;
  const authHeader = request.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : undefined;

  // Return the first available token
  return cookieToken || headerToken;
}
