export const AUTH_MESSAGES = {
  OTP_SENT: 'OTP sent successfully',
  OTP_VERIFIED: 'OTP verified successfully',
  OTP_INVALID: 'Invalid or expired OTP',
  OTP_MAX_ATTEMPTS: 'Maximum OTP attempts exceeded. Please request a new code',
  OTP_EXPIRED: 'OTP has expired. Please request a new code',
  OTP_ALREADY_USED: 'OTP has already been used',
  OTP_RATE_LIMITED: 'Too many OTP requests. Please wait before trying again',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  TOKEN_REFRESHED: 'Token refreshed successfully',
  PHONE_ALREADY_EXISTS: 'Phone number already registered',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_TOKEN: 'Invalid token',
  ACCOUNT_SUSPENDED: 'Account has been suspended',
  ACCOUNT_DELETED: 'Account has been deleted',
  PROFILE_FETCHED: 'Profile fetched successfully',
} as const;

export const ADMIN_AUTH_MESSAGES = {
  LOGIN_SUCCESS: 'Admin login successful',
  LOGOUT_SUCCESS: 'Admin logout successful',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_REFRESHED: 'Token refreshed successfully',
  INVALID_TOKEN: 'Invalid token',
  PASSWORD_CHANGED: 'Password changed successfully',
  PROFILE_FETCHED: 'Admin profile fetched successfully',
} as const;

export const USER_MESSAGES = {
  FETCHED: 'User fetched successfully',
  UPDATED: 'User updated successfully',
  DELETED: 'User deleted successfully',
  NOT_FOUND: 'User not found',
  LIST_FETCHED: 'Users fetched successfully',
} as const;

export const TRADIE_MESSAGES = {
  PROFILE_CREATED: 'Tradie profile created successfully',
  PROFILE_UPDATED: 'Tradie profile updated successfully',
  PROFILE_FETCHED: 'Tradie profile fetched successfully',
  PROFILE_NOT_FOUND: 'Tradie profile not found',
  LIST_FETCHED: 'Tradies fetched successfully',
  SERVICES_UPDATED: 'Services updated successfully',
  SUBURBS_UPDATED: 'Suburbs updated successfully',
  PHOTO_UPLOADED: 'Work photo uploaded successfully',
  PHOTO_DELETED: 'Work photo deleted successfully',
  LICENSE_UPLOADED: 'License uploaded successfully',
  INSURANCE_UPLOADED: 'Insurance uploaded successfully',
  AVAILABILITY_UPDATED: 'Availability updated successfully',
  STATS_FETCHED: 'Stats fetched successfully',
  APPROVED: 'Tradie profile approved',
  REJECTED: 'Tradie profile rejected',
  SUSPENDED: 'Tradie profile suspended',
  MAX_SERVICES: 'Maximum 6 services allowed',
  MAX_SUBURBS: 'Maximum 10 suburbs allowed',
  MAX_PHOTOS: 'Maximum 20 work photos allowed',
} as const;

export const CATEGORY_MESSAGES = {
  FETCHED: 'Category fetched successfully',
  LIST_FETCHED: 'Categories fetched successfully',
  CREATED: 'Category created successfully',
  UPDATED: 'Category updated successfully',
  DELETED: 'Category deleted successfully',
  NOT_FOUND: 'Category not found',
  ALREADY_EXISTS: 'Category already exists',
} as const;

export const REGION_MESSAGES = {
  FETCHED: 'Region fetched successfully',
  LIST_FETCHED: 'Regions fetched successfully',
  CREATED: 'Region created successfully',
  UPDATED: 'Region updated successfully',
  DELETED: 'Region deleted successfully',
  NOT_FOUND: 'Region not found',
  ALREADY_EXISTS: 'Region already exists',
} as const;

export const REVIEW_MESSAGES = {
  CREATED: 'Review submitted successfully',
  FETCHED: 'Review fetched successfully',
  LIST_FETCHED: 'Reviews fetched successfully',
  APPROVED: 'Review approved successfully',
  REJECTED: 'Review rejected successfully',
  NOT_FOUND: 'Review not found',
  NOT_ELIGIBLE: 'You are not eligible to review this tradie yet',
  ALREADY_REVIEWED: 'You have already reviewed this tradie',
  ELIGIBLE: 'You are eligible to review this tradie',
} as const;

export const FAVOURITE_MESSAGES = {
  ADDED: 'Added to favourites',
  REMOVED: 'Removed from favourites',
  LIST_FETCHED: 'Favourites fetched successfully',
  ALREADY_EXISTS: 'Already in favourites',
  NOT_FOUND: 'Favourite not found',
} as const;

export const CHAT_MESSAGES = {
  CREATED: 'Conversation created successfully',
  FETCHED: 'Conversation fetched successfully',
  LIST_FETCHED: 'Conversations fetched successfully',
  NOT_FOUND: 'Conversation not found',
  MESSAGE_SENT: 'Message sent successfully',
  MESSAGES_FETCHED: 'Messages fetched successfully',
  ALREADY_EXISTS: 'Conversation already exists between these users',
  MESSAGES_READ: 'Messages marked as read',
  UPLOADED: 'Attachments uploaded successfully',
} as const;

export const NOTIFICATION_MESSAGES = {
  LIST_FETCHED: 'Notifications fetched successfully',
  MARKED_READ: 'Notification marked as read',
  ALL_MARKED_READ: 'All notifications marked as read',
  NOT_FOUND: 'Notification not found',
  UNREAD_COUNT: 'Unread count fetched',
} as const;

export const REPORT_MESSAGES = {
  CREATED: 'Report submitted successfully',
  FETCHED: 'Report fetched successfully',
  LIST_FETCHED: 'Reports fetched successfully',
  RESOLVED: 'Report resolved',
  DISMISSED: 'Report dismissed',
  NOT_FOUND: 'Report not found',
} as const;

export const COMMON_MESSAGES = {
  SUCCESS: 'Operation successful',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Bad request',
  INTERNAL_ERROR: 'Internal server error',
  VALIDATION_ERROR: 'Validation failed',
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',
} as const;
