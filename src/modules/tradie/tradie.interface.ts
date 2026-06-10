export interface AbnData {
  businessName?: string;
  status?: string;
  entityType?: string;
}

export interface SetupTradieProfileDto {
  businessName: string;
  categoryIds: string[];
  regionIds: string[];
  serviceDescription?: string;
  website?: string;
  timeFrom?: string;
  timeTo?: string;
  openDays?: string[];
  isEmergencyAvailable?: boolean;
  abn: string;
  abnData?: AbnData;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  // resolved from uploaded files
  businessImageUrl?: string;
  businessVideoUrl?: string;
}

// Kept for internal use / backwards compat
export interface UpdateTradieProfileDto {
  businessName?: string;
  businessLocation?: string;
  serviceDescription?: string;
  website?: string;
  bio?: string;
  awards?: string;
  hasLicense?: boolean;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  serviceRadiusKm?: number;
  isEmergencyAvailable?: boolean;
  isAvailable?: boolean;
  timeFrom?: string;
  timeTo?: string;
  openDays?: string[];
  abnData?: AbnData;
}

export interface TradieFilterQuery {
  categoryId?: string;
  regionId?: string;
  rating?: string;
  availability?: string;
  emergency?: string;
  page?: number;
  limit?: number;
}

// Legacy — kept for createProfile internal use
export interface CreateTradieProfileDto {
  abn: string;
  yearsOfExperience: number;
  businessName?: string;
  businessLocation?: string;
  serviceDescription?: string;
  website?: string;
  bio?: string;
  awards?: string;
  hasLicense?: boolean;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  serviceRadiusKm?: number;
  isEmergencyAvailable?: boolean;
  categoryIds: string[];
  regionIds: string[];
}
