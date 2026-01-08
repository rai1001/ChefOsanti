export type Role = 'admin' | 'manager' | 'staff'

export type Permission =
  | 'dashboard:read'
  | 'events:read'
  | 'events:write'
  | 'scheduling:read'
  | 'scheduling:write'
  | 'purchasing:read'
  | 'purchasing:write'
  | 'menus:read'
  | 'menus:write'
  | 'recipes:read'
  | 'recipes:write'
  | 'staff:read'
  | 'staff:write'
  | 'admin:org'

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    'dashboard:read',
    'events:read',
    'events:write',
    'scheduling:read',
    'scheduling:write',
    'purchasing:read',
    'purchasing:write',
    'menus:read',
    'menus:write',
    'recipes:read',
    'recipes:write',
    'staff:read',
    'staff:write',
    'admin:org',
  ],
  manager: [
    'dashboard:read',
    'events:read',
    'events:write',
    'scheduling:read',
    'scheduling:write',
    'purchasing:read',
    'purchasing:write',
    'menus:read',
    'menus:write',
    'recipes:read',
    'recipes:write',
    'staff:read',
    'staff:write',
  ],
  staff: [
    'dashboard:read',
    'events:read',
    'scheduling:read',
    'purchasing:read',
    'staff:read',
  ],
}

export function can(role: Role | undefined, permission: Permission): boolean {
  const effective = role ?? 'staff'
  return rolePermissions[effective].includes(permission)
}
