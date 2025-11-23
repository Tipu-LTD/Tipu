import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as messageService from '../services/messageService'

const router = Router()

/**
 * @openapi
 * /v1/messages/conversations:
 *   get:
 *     tags:
 *       - Messages
 *     summary: Get user's conversations
 *     description: Retrieve all conversations for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of conversations to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of conversations to skip (for pagination)
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 *             example:
 *               conversations:
 *                 - id: conv123
 *                   participantIds: [student123, tutor456]
 *                   lastMessage:
 *                     text: Thanks for the session!
 *                     senderId: student123
 *                     timestamp: "2025-11-23T10:30:00Z"
 *                   unreadCount:
 *                     student123: 0
 *                     tutor456: 2
 *       401:
 *         description: Unauthorized
 */
router.get('/conversations', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const conversations = await messageService.getUserConversations(req.user!.uid)
    res.json({ conversations })
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /v1/messages/conversations:
 *   post:
 *     tags:
 *       - Messages
 *     summary: Create new conversation
 *     description: Create a new conversation between two users (e.g., student and tutor)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantIds
 *             properties:
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 2
 *                 maxItems: 2
 *                 description: Array of user IDs to include in conversation
 *                 example: [student123, tutor456]
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Invalid participant IDs or conversation already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.post('/conversations', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { participantIds } = req.body

    const conversation = await messageService.createConversation({
      participantIds,
    })

    res.status(201).json(conversation)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /v1/messages/conversations/{id}:
 *   get:
 *     tags:
 *       - Messages
 *     summary: Get conversation messages
 *     description: Retrieve all messages in a specific conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *         example: conv123
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of messages to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of messages to skip (for pagination)
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *             example:
 *               messages:
 *                 - id: msg123
 *                   senderId: student123
 *                   text: Hello, when is our next session?
 *                   timestamp: "2025-11-23T10:30:00Z"
 *                   read: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a participant in this conversation
 *       404:
 *         description: Conversation not found
 */
router.get('/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const messages = await messageService.getConversationMessages(req.params.id)
    res.json({ messages })
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /v1/messages/conversations/{id}/messages:
 *   post:
 *     tags:
 *       - Messages
 *     summary: Send message in conversation
 *     description: Send a new message in an existing conversation. Supports text messages and file attachments (homework, documents).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *         example: conv123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Message text content
 *                 minLength: 1
 *                 maxLength: 5000
 *                 example: Hello, when is our next session?
 *               fileUrl:
 *                 type: string
 *                 format: uri
 *                 description: Optional file attachment URL (homework, documents)
 *                 example: https://storage.googleapis.com/files/homework.pdf
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Invalid message content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a participant or student under 18 (chat restrictions)
 *       404:
 *         description: Conversation not found
 */
router.post('/conversations/:id/messages', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const message = await messageService.sendMessage({
      conversationId: req.params.id,
      senderId: req.user!.uid,
      text: req.body.text,
      fileUrl: req.body.fileUrl,
    })

    res.status(201).json(message)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /v1/messages/conversations/{id}/read:
 *   post:
 *     tags:
 *       - Messages
 *     summary: Mark messages as read
 *     description: Mark all messages in a conversation as read for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *         example: conv123
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Messages marked as read
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a participant in this conversation
 *       404:
 *         description: Conversation not found
 */
router.post('/conversations/:id/read', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await messageService.markMessagesAsRead(req.params.id, req.user!.uid)
    res.json({ message: 'Messages marked as read' })
  } catch (error) {
    next(error)
  }
})

export default router
