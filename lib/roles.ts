import { type RoleValue } from './media-types';

export function hasRole(role: RoleValue, required: RoleValue) {
  if (required === 'ADMIN') return role === 'ADMIN';
  if (required === 'CREATOR') return role === 'CREATOR' || role === 'ADMIN';
  return true;
}
