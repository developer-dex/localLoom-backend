/**
 * @swagger
 * tags:
 *   name: Tradies
 *   description: Tradie profiles — public browsing and self-management
 */

/**
 * @swagger
 * /tradies:
 *   get:
 *     summary: List tradies with filters
 *     tags: [Tradies]
 *     description: |
 *       Returns paginated tradie listings. If a valid Bearer token is provided,
 *       each item includes `isFavourite` indicating whether the logged-in user has favourited that tradie.
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by service category
 *       - in: query
 *         name: regionId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by location/region
 *       - in: query
 *         name: availability
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *       - in: query
 *         name: emergency
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tradies list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       businessName:
 *                         type: string
 *                         nullable: true
 *                       businessImage:
 *                         type: string
 *                         nullable: true
 *                         description: First business image URL
 *                       location:
 *                         type: string
 *                         nullable: true
 *                       services:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Service category names
 *                       isOpen:
 *                         type: boolean
 *                         description: Whether the tradie is currently open based on openDays and timeFrom/timeTo
 *                       openDays:
 *                         type: array
 *                         items:
 *                           type: string
 *                           enum: [sunday, monday, tuesday, wednesday, thursday, friday, saturday]
 *                       timeFrom:
 *                         type: string
 *                         nullable: true
 *                         example: "09:00"
 *                       timeTo:
 *                         type: string
 *                         nullable: true
 *                         example: "17:00"
 *                       averageRating:
 *                         type: number
 *                         example: 4.5
 *                       totalRatingCount:
 *                         type: integer
 *                         example: 12
 *                       isFavourite:
 *                         type: boolean
 *                         description: Only meaningful when request includes a valid Bearer token
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /tradies/{id}:
 *   get:
 *     summary: Get tradie public profile
 *     tags: [Tradies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Tradie profile
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /tradies/{id}/details:
 *   get:
 *     summary: Get tradie details by type (about, work, reviews)
 *     tags: [Tradies]
 *     description: |
 *       Single public API that returns different data based on the `type` query param.
 *       - `about`: business info, services, contact, hours, emergency status
 *       - `work`: work photos array
 *       - `reviews`: review stats + paginated review list
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [about, work, reviews]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (only for type=reviews)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page (only for type=reviews)
 *     responses:
 *       200:
 *         description: Details based on type
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - title: About
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     businessName:
 *                       type: string
 *                     serviceDescription:
 *                       type: string
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                     profileImage:
 *                       type: string
 *                       nullable: true
 *                     tradieName:
 *                       type: string
 *                     contactNumber:
 *                       type: string
 *                     email:
 *                       type: string
 *                       nullable: true
 *                     website:
 *                       type: string
 *                       nullable: true
 *                     location:
 *                       type: string
 *                       nullable: true
 *                     timeFrom:
 *                       type: string
 *                       example: "09:00"
 *                     timeTo:
 *                       type: string
 *                       example: "17:00"
 *                     openDays:
 *                       type: array
 *                       items:
 *                         type: string
 *                     isOpen:
 *                       type: boolean
 *                     isEmergencyAvailable:
 *                       type: boolean
 *                 - title: Work
 *                   type: object
 *                   properties:
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           imageUrl:
 *                             type: string
 *                           sortOrder:
 *                             type: integer
 *                 - title: Reviews
 *                   type: object
 *                   properties:
 *                     totalReviewCount:
 *                       type: integer
 *                     averageRating:
 *                       type: number
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           giverName:
 *                             type: string
 *                           profileImage:
 *                             type: string
 *                             nullable: true
 *                           time:
 *                             type: string
 *                             format: date-time
 *                           rating:
 *                             type: integer
 *                           comment:
 *                             type: string
 *                             nullable: true
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /tradies/{id}/contact:
 *   get:
 *     summary: View tradie contact details (creates contact log)
 *     tags: [Tradies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Tradie profile with contact details
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /tradies/{id}/reviews:
 *   get:
 *     summary: Get approved reviews for a tradie
 *     tags: [Tradies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Reviews list
 */

/**
 * @swagger
 * /tradies/{id}/work-photos:
 *   get:
 *     summary: Get tradie work photos
 *     tags: [Tradies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Work photos list
 */

/**
 * @swagger
 * /tradies/abn-lookup:
 *   post:
 *     summary: Validate ABN via ABN Lookup API
 *     tags: [Tradies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - abn
 *             properties:
 *               abn:
 *                 type: string
 *                 example: "51824753556"
 *     responses:
 *       200:
 *         description: ABN details
 */

/**
 * @swagger
 * /tradies/me/profile:
 *   get:
 *     summary: Get my tradie profile
 *     tags: [Tradies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tradie profile
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /tradies/business/setup:
 *   post:
 *     summary: Create or update tradie profile (single setup endpoint)
 *     tags: [Tradies]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Creates the profile on first call, updates it on subsequent calls.
 *       Send as multipart/form-data. Array fields (categoryIds, regionIds, openDays)
 *       can be sent as repeated form fields: categoryIds=uuid1&categoryIds=uuid2
 *       abnData should be sent as a JSON string.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - abn
 *               - categoryIds
 *               - regionIds
 *             properties:
 *               businessName:
 *                 type: string
 *                 example: "Smith Plumbing"
 *               categoryIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: 1–6 service category IDs
 *               regionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: One or more service region IDs
 *               serviceDescription:
 *                 type: string
 *                 example: "Professional plumbing services"
 *               website:
 *                 type: string
 *                 example: "https://smithplumbing.com.au"
 *               timeFrom:
 *                 type: string
 *                 example: "08:00"
 *                 description: Opening time in HH:MM format
 *               timeTo:
 *                 type: string
 *                 example: "17:00"
 *                 description: Closing time in HH:MM format
 *               openDays:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [sunday, monday, tuesday, wednesday, thursday, friday, saturday]
 *                 example: ["monday", "tuesday", "wednesday", "thursday", "friday"]
 *               isEmergencyAvailable:
 *                 type: boolean
 *                 example: true
 *               abn:
 *                 type: string
 *                 example: "51824753556"
 *               abnData:
 *                 type: string
 *                 description: JSON string with ABN lookup result
 *                 example: '{"businessName":"Smith Plumbing Pty Ltd","status":"Active","entityType":"Australian Private Company"}'
 *               businessImage:
 *                 type: string
 *                 format: binary
 *                 description: Optional business image (JPEG/PNG, max 5MB)
 *               businessVideo:
 *                 type: string
 *                 format: binary
 *                 description: Optional intro video (max 50MB)
 *     responses:
 *       200:
 *         description: Profile saved successfully
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
 *                   example: Profile saved successfully
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /tradies/profile/work-photos:
 *   post:
 *     summary: Upload work photos (multiple, max 20 total)
 *     tags: [Tradies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Work photos uploaded
 *       400:
 *         description: No files or max 20 exceeded
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /tradies/profile/work-photos/{photoId}:
 *   delete:
 *     summary: Delete a work photo
 *     tags: [Tradies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Photo deleted
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /tradies/profile/stats:
 *   get:
 *     summary: Get profile visit count and rating stats
 *     tags: [Tradies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     visitCount:
 *                       type: integer
 *                     reviewCount:
 *                       type: integer
 *                     averageRating:
 *                       type: number
 */
