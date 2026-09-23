const PUBLIC_PREFIXES = ['/tools', '/login', '/auth/callback', '/auth/set-password'];

export function isPublicWorkspacePath(pathname: string) {
  return PUBLIC_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
