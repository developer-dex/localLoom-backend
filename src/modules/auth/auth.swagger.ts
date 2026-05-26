/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Customer & tradie authentication — signup, OTP login
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Customer / tradie signup
 *     tags: [Auth]
 *     description: |
 *       Creates a new user account and sends an OTP to the provided phone number via SMS.
 *       If SMS fails and an email is provided, falls back to email OTP delivery.
 *       Returns HTTP 201 with phone (and email if provided). No tokens are returned at this stage.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phone
 *               - role
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Jane Smith
 *               phone:
 *                 type: string
 *                 description: E.164 format
 *                 example: "+61412345678"
 *               role:
 *                 type: string
 *                 enum: [customer, tradie]
 *                 example: customer
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *                 description: Optional profile photo upload
 *     responses:
 *       201:
 *         description: Signup successful, OTP sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Signup successful. OTP sent to your phone.
 *                 data:
 *                   type: object
 *                   properties:
 *                     phone:
 *                       type: string
 *                       example: "+61412345678"
 *                     email:
 *                       type: string
 *                       nullable: true
 *                       example: jane@example.com
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Phone or email already registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: Phone number already registered
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Customer / tradie login (OTP initiation)
 *     tags: [Auth]
 *     description: |
 *       Sends an OTP to the user's phone (via SMS) or email address.
 *       Returns a masked version of the identifier so the client can display it.
 *       Rate limited.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - identifierType
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Phone (E.164) when identifierType is phone, email address when identifierType is email
 *                 example: "+61412345678"
 *               identifierType:
 *                 type: string
 *                 enum: [phone, email]
 *                 example: phone
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: OTP sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     identifierType:
 *                       type: string
 *                       example: phone
 *                     maskedIdentifier:
 *                       type: string
 *                       example: "+61****5678"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         description: Account suspended or deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: Account has been suspended
 *       404:
 *         description: No account found with this identifier
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: No account found with this phone number
 *       429:
 *         description: Too many requests
 */

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP and get tokens (multi-channel)
 *     tags: [Auth]
 *     description: |
 *       Verifies the OTP submitted by the user and returns a JWT Token_Pair plus the user object.
 *       Works for both phone and email OTPs.
 *       In dev mode, the configured `OTP_DEV_CODE` bypasses the DB lookup.
 *       Rate limited.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - identifierType
 *               - code
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: "+61412345678"
 *               identifierType:
 *                 type: string
 *                 enum: [phone, email]
 *                 example: phone
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified, tokens returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *       400:
 *         description: Invalid/expired OTP or max attempts exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: Invalid or expired OTP
 *       429:
 *         description: Too many requests
 */

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New token pair returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Profile fetched successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /auth/become-tradie:
 *   post:
 *     summary: Switch the current user to the tradie role
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Inspects the caller's tradie profile and, if it is approved, issues a
 *       fresh `Token_Pair` with `role = "tradie"` embedded in the JWT.
 *
 *       **Response shapes**
 *
 *       1. **No tradie profile exists:**
 *          ```json
 *          { "profile_exist": false, "profile_status": "not found" }
 *          ```
 *       2. **Tradie profile exists but is not approved** (e.g. `pending`, `rejected`):
 *          ```json
 *          { "profile_exist": true, "profile_status": "pending" }
 *          ```
 *       3. **Tradie profile is approved — new tokens returned:**
 *          ```json
 *          {
 *            "profile_exist": true,
 *            "profile_status": "approved",
 *            "tokens": { "accessToken": "...", "refreshToken": "..." }
 *          }
 *          ```
 *
 *       When tokens are issued, `users.role` is updated to `tradie` and the
 *       new refresh token is persisted server-side, mirroring the standard
 *       login flow. The previous tokens remain valid until they expire.
 *     responses:
 *       200:
 *         description: Result of the role-switch attempt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Switched to tradie role
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       title: NoProfile
 *                       properties:
 *                         profile_exist:
 *                           type: boolean
 *                           example: false
 *                         profile_status:
 *                           type: string
 *                           example: not found
 *                     - type: object
 *                       title: ProfileNotApproved
 *                       properties:
 *                         profile_exist:
 *                           type: boolean
 *                           example: true
 *                         profile_status:
 *                           type: string
 *                           example: pending
 *                     - type: object
 *                       title: ProfileApproved
 *                       properties:
 *                         profile_exist:
 *                           type: boolean
 *                           example: true
 *                         profile_status:
 *                           type: string
 *                           example: approved
 *                         tokens:
 *                           type: object
 *                           properties:
 *                             accessToken:
 *                               type: string
 *                             refreshToken:
 *                               type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
