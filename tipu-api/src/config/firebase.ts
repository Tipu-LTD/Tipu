import dotenv from 'dotenv'
import admin from 'firebase-admin'
import { logger } from './logger'

// Load environment variables first
dotenv.config()

// Initialize Firebase Admin SDK
try {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error('Missing Firebase configuration in environment variables')
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      privateKey,
      clientEmail,
    }),
  })

  logger.info('🔥 Firebase initialized with credentials')
  logger.info(`🔥 Firebase Project: ${projectId}`)
} catch (error) {
  logger.error('❌ Firebase initialization failed:', error)
  process.exit(1)
}

// Export Firestore and Auth instances (after initialization)
export const db = admin.firestore()
export const auth = admin.auth()
export const storage = admin.storage()
