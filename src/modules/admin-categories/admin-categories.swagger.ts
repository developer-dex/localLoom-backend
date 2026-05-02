/**
 * @swagger
 * tags:
 *   name: Admin Categories
 *   description: Category management (admin only)
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: List all categories (including inactive)
 *     tags: [Admin Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All categories
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
 *                   example: Categories fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       icon:
 *                         type: string
 *                         nullable: true
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       isActive:
 *                         type: boolean
 *                       sortOrder:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   post:
 *     summary: Create a new category
 *     tags: [Admin Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Plumber
 *               icon:
 *                 type: string
 *                 format: binary
 *                 description: Category icon image (JPEG, PNG, GIF, WebP)
 *               description:
 *                 type: string
 *                 example: Plumbing services
 *               sortOrder:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Category created
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
 *                   example: Category created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     icon:
 *                       type: string
 *                       nullable: true
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     isActive:
 *                       type: boolean
 *                     sortOrder:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Category already exists
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
 *                   example: Category already exists
 */

/**
 * @swagger
 * /categories/{id}:
 *   patch:
 *     summary: Update category
 *     tags: [Admin Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               icon:
 *                 type: string
 *                 format: binary
 *                 description: New category icon image (JPEG, PNG, GIF, WebP)
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Category updated
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
 *                   example: Category updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     icon:
 *                       type: string
 *                       nullable: true
 *                     isActive:
 *                       type: boolean
 *                     sortOrder:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Category name already exists
 *   delete:
 *     summary: Soft-delete category (sets isActive to false)
 *     tags: [Admin Categories]
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
 *         description: Category deleted
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
 *                   example: Category deleted successfully
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
