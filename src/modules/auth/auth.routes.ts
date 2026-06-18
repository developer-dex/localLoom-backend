import { Router, type RequestHandler } from 'express';
import { AuthController } from './auth.controller';
import { validate, authenticateUser } from '../../middleware';
import { authLimiter } from '../../middleware';
import { createImageUpload } from '../../services/file-upload.service';
import {
  refreshTokenSchema,
  userSignupSchema,
  userLoginSchema,
  userVerifyOtpSchema,
  resendOtpSchema,
} from './auth.validation';

const router = Router();
const controller = new AuthController();

const uploadProfilePhoto = createImageUpload('businessDetails', 'profilePhoto');

// Customer auth (public)
router.post('/signup', uploadProfilePhoto, validate(userSignupSchema), controller.userSignup);
router.post('/login', /* authLimiter, */ validate(userLoginSchema), controller.userLogin); // TODO: re-enable rate limiting before production
router.post('/verify-otp', /* authLimiter, */ validate(userVerifyOtpSchema), controller.userVerifyOtp); // TODO: re-enable rate limiting before production
router.post('/resend-otp', /* authLimiter, */ validate(resendOtpSchema), controller.resendOtp); // TODO: re-enable rate limiting before production

// Common (public)
router.post('/refresh-token', validate(refreshTokenSchema), controller.refreshToken);

// Protected routes (user only)
router.use(authenticateUser as unknown as RequestHandler);
router.post('/logout', controller.logout);
router.get('/profile', controller.getProfile);
router.post('/become-tradie', controller.becomeTradie);

export default router;
