/**
 * Role-based access control helpers
 */

export type UserRole = 'admin' | 'geology_admin' | 'driver' | 'partner' | 'staff';

/**
 * Check if user has admin-level access (full admin)
 */
export function isAdmin(role: string | undefined): boolean {
  return role === 'admin';
}

/**
 * Check if user can access geology admin features
 * Both full admins and geology_admins can access
 */
export function canAccessGeology(role: string | undefined): boolean {
  return role === 'admin' || role === 'geology_admin';
}

/**
 * Check if user can access any admin features
 */
export function canAccessAdmin(role: string | undefined): boolean {
  return ['admin', 'geology_admin', 'staff'].includes(role || '');
}

/**
 * Get the admin sections a role can access
 */
export function getAccessibleSections(role: string | undefined): string[] {
  switch (role) {
    case 'admin':
      return ['all']; // Full access
    case 'geology_admin':
      return ['geology']; // Only geology section
    case 'staff':
      return ['bookings', 'reservations']; // Limited access
    default:
      return [];
  }
}

/**
 * Check if role can access a specific admin section
 */
export function canAccessSection(role: string | undefined, section: string): boolean {
  if (role === 'admin') return true; // Admin can access everything

  const accessible = getAccessibleSections(role);
  return accessible.includes(section);
}
