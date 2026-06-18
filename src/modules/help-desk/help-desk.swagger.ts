/**
 * @swagger
 * tags:
 *   name: Help Desk
 *   description: User help desk — submit support requests
 */

/**
 * @swagger
 * /help-desk:
 *   post:
 *     summary: Submit a help desk request
 *     tags: [Help Desk]
 *     description: |
 *       Allows any user to submit a help/support request. The request is saved to the
 *       database and an email notification is sent to the admin.
 *       This endpoint is public and does not require authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 description: Full name of the person requesting help
 *                 example: John Smith
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Contact email address
 *                 example: john@example.com
 *               message:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *                 description: Description of the issue or help needed
 *                 example: I am unable to reset my password. Please help.
 *     responses:
 *       201:
 *         description: Help desk request submitted successfully
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
 *                   example: Help desk request submitted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 3f8a1c2d-4e5b-6789-abcd-ef0123456789
 *                     name:
 *                       type: string
 *                       example: John Smith
 *                     email:
 *                       type: string
 *                       example: john@example.com
 *                     message:
 *                       type: string
 *                       example: I am unable to reset my password. Please help.
 *                     status:
 *                       type: string
 *                       enum: [pending, resolved]
 *                       example: pending
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
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
 *                   example: '"email" must be a valid email'
 *       500:
 *         description: Internal server error
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
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
