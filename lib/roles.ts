import type { Role } from '@prisma/client';

export function hasRole(role: Role, required: Role) {
  if (required === 'ADMIN') return role === 'ADMIN';
  if (required === 'CREATOR') return role === 'CREATOR' || role === 'ADMIN';
  return true;
}


