/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Service categories (public)
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: List all active categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Categories list
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
 *                         example: Plumber
 *                       slug:
 *                         type: string
 *                         example: plumber
 *                       icon:
 *                         type: string
 *                         nullable: true
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       sortOrder:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category details
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
 *                   example: Category fetched successfully
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
 *                     sortOrder:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
