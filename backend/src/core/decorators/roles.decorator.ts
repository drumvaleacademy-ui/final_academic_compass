export const ROLES_KEY = Symbol("roles");

export const Roles = (...roles: string[]) => {
  return (target: any, key?: any, descriptor?: any) => {
    const metaKey = ROLES_KEY;
    if (descriptor) {
      const existing = target[metaKey] || [];
      target[metaKey] = [...existing, ...roles];
    }
    return descriptor;
  };
};

export const getRoles = (target: any): string[] => {
  return target[ROLES_KEY] || [];
};
