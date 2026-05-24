/**
 * @swagger
 * tags:
 *   name: AI Classifier
 *   description: AI-powered service classification using Anthropic Claude
 */

/**
 * @swagger
 * /ai/classify-service:
 *   post:
 *     summary: Classify a free-text service description
 *     tags: [AI Classifier]
 *     description: |
 *       Accepts a free-text prompt describing a service need and returns a structured
 *       `{ category, region }` pair. Each value is either the canonical name of an active
 *       catalog entry or `null` if no match is found.
 *
 *       This endpoint is open and does not require authentication. Rate limited by IP.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 description: Free-text description of the service needed
 *                 example: I need a plumber in Sydney
 *     responses:
 *       200:
 *         description: Classification successful
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
 *                   example: Service classified successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     categoryId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                       description: Matched category ID or null
 *                       example: 3f8a1c2d-4e5b-6789-abcd-ef0123456789
 *                     regionId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                       description: Matched region ID or null
 *                       example: 7a1b2c3d-4e5f-6789-abcd-ef0123456789
 *       400:
 *         description: Validation error — prompt missing, empty, or exceeds 2000 characters
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
 *                   example: '"prompt" is required'
 *       429:
 *         description: Rate limit exceeded
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
 *                   example: 429
 *                 message:
 *                   type: string
 *                   example: Too many requests, please try again later
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: AI_CLASSIFIER_RATE_LIMITED
 *       502:
 *         description: AI provider returned an invalid or unparseable response
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
 *                   example: 502
 *                 message:
 *                   type: string
 *                   example: Upstream AI provider returned an error
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       enum:
 *                         - AI_CLASSIFIER_PROVIDER_ERROR
 *                         - AI_CLASSIFIER_INVALID_MODEL_RESPONSE
 *       503:
 *         description: Service catalog unavailable (no active categories or DB error)
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
 *                   example: 503
 *                 message:
 *                   type: string
 *                   example: Service catalog is not available
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: AI_CLASSIFIER_CATALOG_UNAVAILABLE
 *       504:
 *         description: AI provider timed out
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
 *                   example: 504
 *                 message:
 *                   type: string
 *                   example: Upstream AI provider timed out
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: AI_CLASSIFIER_PROVIDER_TIMEOUT
 */
