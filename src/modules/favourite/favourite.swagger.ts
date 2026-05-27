/**
 * @swagger
 * tags:
 *   name: Favourites
 *   description: Customer-side favourite tradie management
 */

/**
 * @swagger
 * /favourites:
 *   get:
 *     summary: List my favourite tradies
 *     tags: [Favourites]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns the authenticated user's favourited tradie profiles, paginated.
 *       Each item includes the tradie profile summary plus the timestamp when it
 *       was added to favourites.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of favourite tradies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 statusCode: { type: integer, example: 200 }
 *                 message: { type: string, example: Favourites fetched successfully }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       businessName: { type: string, nullable: true }
 *                       businessImage:
 *                         type: string
 *                         nullable: true
 *                         description: Absolute URL or null
 *                       services:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: string, format: uuid }
 *                             name: { type: string }
 *                       regions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: string, format: uuid }
 *                             name: { type: string }
 *                       timeFrom: { type: string, nullable: true, example: "09:00" }
 *                       timeTo: { type: string, nullable: true, example: "17:00" }
 *                       openDays:
 *                         type: array
 *                         items: { type: string }
 *                       isEmergencyAvailable: { type: boolean }
 *                       averageRating: { type: number, example: 4.32 }
 *                       totalRatingCount: { type: integer, example: 12 }
 *                       favouritedAt: { type: string, format: date-time }
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 *   post:
 *     summary: Add a tradie to my favourites
 *     tags: [Favourites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tradieProfileId]
 *             properties:
 *               tradieProfileId:
 *                 type: string
 *                 format: uuid
 *                 example: 220a0ea0-4d4f-4dd7-9b30-c70ec83f226f
 *     responses:
 *       201:
 *         description: Tradie added to favourites
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 statusCode: { type: integer, example: 201 }
 *                 message: { type: string, example: Added to favourites }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     customerId: { type: string, format: uuid }
 *                     tradieProfileId: { type: string, format: uuid }
 *                     createdAt: { type: string, format: date-time }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Tradie profile not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 statusCode: { type: integer, example: 404 }
 *                 message: { type: string, example: Tradie profile not found }
 *       409:
 *         description: Already in favourites
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 statusCode: { type: integer, example: 409 }
 *                 message: { type: string, example: Already in favourites }
 */

/**
 * @swagger
 * /favourites/{tradieProfileId}:
 *   delete:
 *     summary: Remove a tradie from my favourites
 *     tags: [Favourites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tradieProfileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Removed from favourites
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 statusCode: { type: integer, example: 200 }
 *                 message: { type: string, example: Removed from favourites }
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Favourite not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 statusCode: { type: integer, example: 404 }
 *                 message: { type: string, example: Favourite not found }
 */
