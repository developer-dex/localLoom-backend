// User roles (customers & tradies — stored in `users` table)
export enum UserRole {
  CUSTOMER = 'customer',
  TRADIE = 'tradie',
}

// Admin roles (stored in separate `admins` table)
export enum AdminRole {
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}
