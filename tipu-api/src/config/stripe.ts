import Stripe from 'stripe'
import { logger } from './logger'

// Determine environment: use test keys in development or dev branch, live keys in production
const isDev = process.env.NODE_ENV === 'development'
const isDevBranch = process.env.BRANCH === 'dev'
const isTestMode = isDev || isDevBranch

// Select appropriate Stripe secret key based on environment
const stripeSecretKey = isTestMode
  ? process.env.STRIPE_TEST_SECRET_KEY
  : process.env.STRIPE_LIVE_SECRET_KEY

// Select appropriate webhook secret based on environment
const webhookSecretKey = isTestMode
  ? process.env.STRIPE_TEST_WEBHOOK_SECRET
  : process.env.STRIPE_LIVE_WEBHOOK_SECRET

// Validate that required keys are present
if (!stripeSecretKey) {
  const keyName = isTestMode ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_LIVE_SECRET_KEY'
  throw new Error(
    `${keyName} is not defined in environment variables. ` +
    `Current environment: ${process.env.NODE_ENV || 'development'}, Branch: ${process.env.BRANCH || 'not set'}`
  )
}

if (!webhookSecretKey) {
  const keyName = isTestMode ? 'STRIPE_TEST_WEBHOOK_SECRET' : 'STRIPE_LIVE_WEBHOOK_SECRET'
  logger.warn(
    `${keyName} is not defined in environment variables. ` +
    `Stripe webhooks will not work correctly. ` +
    `Current environment: ${process.env.NODE_ENV || 'development'}, Branch: ${process.env.BRANCH || 'not set'}`
  )
}

// Log which mode Stripe is running in (without exposing keys)
logger.info(`💳 Stripe initialized in ${isTestMode ? 'TEST' : 'LIVE'} mode`)

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia', // Updated from 2023-10-16 to latest stable version
  typescript: true,
})

export const webhookSecret = webhookSecretKey || ''
