/**
 * @swagger
 * components:
 *   responses:
 *     UnauthorizedError:
 *       description: Access token is missing or invalid
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               statusCode:
 *                 type: integer
 *                 example: 401
 *               message:
 *                 type: string
 *                 example: Authentication required
 *
 *     ForbiddenError:
 *       description: Insufficient permissions
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               statusCode:
 *                 type: integer
 *                 example: 403
 *               message:
 *                 type: string
 *                 example: Access denied
 *
 *     NotFoundError:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               statusCode:
 *                 type: integer
 *                 example: 404
 *               message:
 *                 type: string
 *                 example: Resource not found
 *
 *     ValidationError:
 *       description: Request validation failed
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               statusCode:
 *                 type: integer
 *                 example: 400
 *               message:
 *                 type: string
 *                 example: Validation failed
 */
