/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         phone:
 *           type: string
 *           example: "+61412345678"
 *         avatar:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *           enum: [customer, tradie]
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended, deleted]
 *         isPhoneVerified:
 *           type: boolean
 *         overallRating:
 *           type: number
 *           format: float
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         conversationId:
 *           type: string
 *           format: uuid
 *         sender:
 *           $ref: '#/components/schemas/User'
 *         content:
 *           type: string
 *         type:
 *           type: string
 *           enum: [text, image, file, system]
 *         status:
 *           type: string
 *           enum: [sent, delivered, read]
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     Conversation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         customerId:
 *           type: string
 *           format: uuid
 *         tradieId:
 *           type: string
 *           format: uuid
 *         lastMessage:
 *           $ref: '#/components/schemas/Message'
 *         status:
 *           type: string
 *           enum: [active, archived, deleted]
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         statusCode:
 *           type: integer
 *         message:
 *           type: string
 *         data:
 *           type: object
 *
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         total:
 *           type: integer
 *         totalPages:
 *           type: integer
 *         hasNextPage:
 *           type: boolean
 *         hasPrevPage:
 *           type: boolean
 */
