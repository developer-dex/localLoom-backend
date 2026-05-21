import { User } from './user.model';
import { Admin } from './admin.model';
import { OtpCode as _OtpCode } from './otp-code.model';
import { Category } from './category.model';
import { Region } from './region.model';
import { TradieProfile } from './tradie-profile.model';
import { TradieService } from './tradie-service.model';
import { TradieRegion } from './tradie-region.model';
import { TradieWorkPhoto } from './tradie-work-photo.model';
import { ContactLog } from './contact-log.model';
import { Review } from './review.model';
import { Favourite } from './favourite.model';
import { ProfileVisit } from './profile-visit.model';
import { Notification } from './notification.model';
import { DeviceToken } from './device-token.model';
import { Conversation } from './conversation.model';
import { Message } from './message.model';
import { Report } from './report.model';

// ═══════════════════════════════════════════
// ASSOCIATIONS
// ═══════════════════════════════════════════

// ── User (1) ↔ (1) TradieProfile ──
User.hasOne(TradieProfile, { foreignKey: 'userId', as: 'tradieProfile' });
TradieProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ── TradieProfile (M) ↔ (N) Category (via TradieService) ──
TradieProfile.belongsToMany(Category, { through: TradieService, foreignKey: 'tradieProfileId', otherKey: 'categoryId', as: 'services' });
Category.belongsToMany(TradieProfile, { through: TradieService, foreignKey: 'categoryId', otherKey: 'tradieProfileId', as: 'tradieProfiles' });

// ── TradieProfile (M) ↔ (N) Region (via TradieRegion) — regions servicing ──
TradieProfile.belongsToMany(Region, { through: TradieRegion, foreignKey: 'tradieProfileId', otherKey: 'regionId', as: 'serviceRegions' });
Region.belongsToMany(TradieProfile, { through: TradieRegion, foreignKey: 'regionId', otherKey: 'tradieProfileId', as: 'tradieProfiles' });

// ── TradieProfile (1) ↔ (N) TradieWorkPhoto ──
TradieProfile.hasMany(TradieWorkPhoto, { foreignKey: 'tradieProfileId', as: 'workPhotos' });
TradieWorkPhoto.belongsTo(TradieProfile, { foreignKey: 'tradieProfileId' });

// ── TradieProfile (1) ↔ (N) ContactLog ──
TradieProfile.hasMany(ContactLog, { foreignKey: 'tradieProfileId', as: 'contactLogs' });
ContactLog.belongsTo(TradieProfile, { foreignKey: 'tradieProfileId' });
ContactLog.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

// ── TradieProfile (1) ↔ (N) Review ──
TradieProfile.hasMany(Review, { foreignKey: 'tradieProfileId', as: 'reviews' });
Review.belongsTo(TradieProfile, { foreignKey: 'tradieProfileId' });
Review.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
Review.belongsTo(Admin, { foreignKey: 'reviewedByAdmin', as: 'reviewAdmin' });

// ── TradieProfile (1) ↔ (N) Favourite ──
TradieProfile.hasMany(Favourite, { foreignKey: 'tradieProfileId', as: 'favourites' });
Favourite.belongsTo(TradieProfile, { foreignKey: 'tradieProfileId' });
Favourite.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

// ── TradieProfile (1) ↔ (N) ProfileVisit ──
TradieProfile.hasMany(ProfileVisit, { foreignKey: 'tradieProfileId', as: 'profileVisits' });
ProfileVisit.belongsTo(TradieProfile, { foreignKey: 'tradieProfileId' });
ProfileVisit.belongsTo(User, { foreignKey: 'visitorId', as: 'visitor' });

// ── User (1) ↔ (N) Notification ──
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// ── User (1) ↔ (N) DeviceToken ──
User.hasMany(DeviceToken, { foreignKey: 'userId', as: 'deviceTokens' });
DeviceToken.belongsTo(User, { foreignKey: 'userId' });

// ── Conversation (role-agnostic: fromUser ↔ toUser) ──
Conversation.belongsTo(User, { foreignKey: 'fromUserId', as: 'fromUser' });
Conversation.belongsTo(User, { foreignKey: 'toUserId', as: 'toUser' });
Conversation.belongsTo(Message, { foreignKey: 'lastMessageId', as: 'lastMessage' });
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
User.hasMany(Conversation, { foreignKey: 'fromUserId', as: 'sentConversations' });
User.hasMany(Conversation, { foreignKey: 'toUserId', as: 'receivedConversations' });

// ── User (1) ↔ (N) Report ──
User.hasMany(Report, { foreignKey: 'reporterId', as: 'reports' });
Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
Report.belongsTo(Admin, { foreignKey: 'resolvedBy', as: 'resolver' });

// ── User (1) ↔ (N) Favourite (as customer) ──
User.hasMany(Favourite, { foreignKey: 'customerId', as: 'favourites' });

// ── User (1) ↔ (N) ContactLog (as customer) ──
User.hasMany(ContactLog, { foreignKey: 'customerId', as: 'contactLogs' });

// ── User (1) ↔ (N) Review (as customer) ──
User.hasMany(Review, { foreignKey: 'customerId', as: 'reviews' });

// ═══════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════

export { User } from './user.model';
export type { IUserAttributes, IUserCreationAttributes } from './user.model';

export { Admin } from './admin.model';
export type { IAdminAttributes, IAdminCreationAttributes } from './admin.model';

export { OtpCode } from './otp-code.model';
export type { IOtpCodeAttributes, IOtpCodeCreationAttributes } from './otp-code.model';

export { Category } from './category.model';
export type { ICategoryAttributes, ICategoryCreationAttributes } from './category.model';

export { Region } from './region.model';
export type { IRegionAttributes, IRegionCreationAttributes } from './region.model';

export { TradieProfile } from './tradie-profile.model';
export type { ITradieProfileAttributes, ITradieProfileCreationAttributes } from './tradie-profile.model';

export { TradieService } from './tradie-service.model';
export type { ITradieServiceAttributes } from './tradie-service.model';

export { TradieRegion } from './tradie-region.model';
export type { ITradieRegionAttributes } from './tradie-region.model';

export { TradieWorkPhoto } from './tradie-work-photo.model';
export type { ITradieWorkPhotoAttributes } from './tradie-work-photo.model';

export { ContactLog } from './contact-log.model';
export type { IContactLogAttributes } from './contact-log.model';

export { Review } from './review.model';
export type { IReviewAttributes, IReviewCreationAttributes } from './review.model';

export { Favourite } from './favourite.model';
export type { IFavouriteAttributes } from './favourite.model';

export { ProfileVisit } from './profile-visit.model';
export type { IProfileVisitAttributes } from './profile-visit.model';

export { Notification } from './notification.model';
export type { INotificationAttributes, INotificationCreationAttributes } from './notification.model';

export { DeviceToken } from './device-token.model';
export type { IDeviceTokenAttributes } from './device-token.model';

export { Conversation } from './conversation.model';
export type { IConversationAttributes, IConversationCreationAttributes } from './conversation.model';

export { Message } from './message.model';
export type { IMessageAttributes, IMessageCreationAttributes } from './message.model';

export { Report } from './report.model';
export type { IReportAttributes, IReportCreationAttributes } from './report.model';
