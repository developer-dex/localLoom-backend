import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ITradieProfileAttributes {
  id: string;
  userId: string;
  // Business Details
  businessName?: string | null;
  businessLocation?: string | null;
  serviceDescription?: string | null;
  website?: string | null;
  businessImages?: string[] | null;
  abn: string;
  abnVerified: boolean;
  yearsOfExperience: number;
  bio?: string | null;
  introVideoUrl?: string | null;
  awards?: string | null;
  profilePhoto?: string | null;
  serviceRadiusKm?: number | null;
  // Documents
  tradeLicenseUrl?: string | null;
  publicLiabilityInsuranceUrl?: string | null;
  idProofUrl?: string | null;
  // Profile status
  profileStatus: string;
  rejectionReason?: string | null;
  // License (optional)
  hasLicense: boolean;
  licenseNumber?: string | null;
  licenseExpiryDate?: Date | null;
  // Insurance
  insuranceUrl?: string | null;
  insuranceExpiryDate?: Date | null;
  insuranceVerified: boolean;
  // Business hours
  timeFrom?: string | null;
  timeTo?: string | null;
  openDays?: string[] | null;
  // ABN data (from lookup)
  abnData?: { businessName?: string; status?: string; entityType?: string } | null;
  // Availability
  isAvailable: boolean;
  isEmergencyAvailable: boolean;
  termsAcceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ITradieProfileCreationAttributes = Optional<ITradieProfileAttributes,
  'id' | 'businessName' | 'businessLocation' | 'serviceDescription' | 'website' | 'businessImages' |
  'abnVerified' | 'bio' | 'introVideoUrl' | 'awards' | 'profilePhoto' | 'serviceRadiusKm' |
  'tradeLicenseUrl' | 'publicLiabilityInsuranceUrl' | 'idProofUrl' |
  'profileStatus' | 'rejectionReason' |
  'hasLicense' | 'licenseNumber' | 'licenseExpiryDate' |
  'insuranceUrl' | 'insuranceExpiryDate' | 'insuranceVerified' |
  'timeFrom' | 'timeTo' | 'openDays' | 'abnData' |
  'isAvailable' | 'isEmergencyAvailable' | 'termsAcceptedAt' | 'createdAt' | 'updatedAt'
>;

export class TradieProfile extends Model<ITradieProfileAttributes, ITradieProfileCreationAttributes> implements ITradieProfileAttributes {
  declare id: string;
  declare userId: string;
  declare businessName: string | null;
  declare businessLocation: string | null;
  declare serviceDescription: string | null;
  declare website: string | null;
  declare businessImages: string[] | null;
  declare abn: string;
  declare abnVerified: boolean;
  declare yearsOfExperience: number;
  declare bio: string | null;
  declare introVideoUrl: string | null;
  declare awards: string | null;
  declare profilePhoto: string | null;
  declare serviceRadiusKm: number | null;
  declare tradeLicenseUrl: string | null;
  declare publicLiabilityInsuranceUrl: string | null;
  declare idProofUrl: string | null;
  declare profileStatus: string;
  declare rejectionReason: string | null;
  declare hasLicense: boolean;
  declare licenseNumber: string | null;
  declare licenseExpiryDate: Date | null;
  declare insuranceUrl: string | null;
  declare insuranceExpiryDate: Date | null;
  declare insuranceVerified: boolean;
  declare timeFrom: string | null;
  declare timeTo: string | null;
  declare openDays: string[] | null;
  declare abnData: { businessName?: string; status?: string; entityType?: string } | null;
  declare isAvailable: boolean;
  declare isEmergencyAvailable: boolean;
  declare termsAcceptedAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Association accessors
  declare user?: import('./user.model').User;
  declare services?: import('./category.model').Category[];
  declare serviceRegions?: import('./region.model').Region[];
  declare workPhotos?: import('./tradie-work-photo.model').TradieWorkPhoto[];
}

TradieProfile.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'user_id' },
    businessName: { type: DataTypes.STRING(200), allowNull: true, field: 'business_name' },
    businessLocation: { type: DataTypes.STRING(500), allowNull: true, field: 'business_location' },
    serviceDescription: { type: DataTypes.TEXT, allowNull: true, field: 'service_description' },
    website: { type: DataTypes.STRING(500), allowNull: true },
    businessImages: { type: DataTypes.JSONB, allowNull: true, defaultValue: [], field: 'business_images' },
    abn: { type: DataTypes.STRING(20), allowNull: false },
    abnVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'abn_verified' },
    yearsOfExperience: { type: DataTypes.INTEGER, allowNull: false, field: 'years_of_experience' },
    bio: { type: DataTypes.TEXT, allowNull: true },
    introVideoUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'intro_video_url' },
    awards: { type: DataTypes.TEXT, allowNull: true },
    profilePhoto: { type: DataTypes.STRING(500), allowNull: true, field: 'profile_photo' },
    serviceRadiusKm: { type: DataTypes.INTEGER, allowNull: true, field: 'service_radius_km' },
    tradeLicenseUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'trade_license_url' },
    publicLiabilityInsuranceUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'public_liability_insurance_url' },
    idProofUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'id_proof_url' },
    profileStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending', field: 'profile_status' },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true, field: 'rejection_reason' },
    hasLicense: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_license' },
    licenseNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'license_number' },
    licenseExpiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'license_expiry_date' },
    insuranceUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'insurance_url' },
    insuranceExpiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'insurance_expiry_date' },
    insuranceVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'insurance_verified' },
    timeFrom: { type: DataTypes.STRING(5), allowNull: true, field: 'time_from' },
    timeTo: { type: DataTypes.STRING(5), allowNull: true, field: 'time_to' },
    openDays: { type: DataTypes.JSONB, allowNull: true, defaultValue: [], field: 'open_days' },
    abnData: { type: DataTypes.JSONB, allowNull: true, field: 'abn_data' },
    isAvailable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_available' },
    isEmergencyAvailable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_emergency_available' },
    termsAcceptedAt: { type: DataTypes.DATE, allowNull: true, field: 'terms_accepted_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  { sequelize, tableName: 'tradie_profiles', timestamps: true, underscored: true },
);
