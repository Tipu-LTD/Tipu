import { Client } from '@microsoft/microsoft-graph-client'
import { ClientSecretCredential } from '@azure/identity'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import { logger } from './logger'

logger.info('🔧 [MS GRAPH CONFIG] Initializing Microsoft Graph client', {
  timestamp: new Date().toISOString(),
})

// Validate environment variables
const requiredEnvVars = [
  'MICROSOFT_TENANT_ID',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'TEAMS_ORGANIZER_USER_ID',
  'TEAMS_ORGANIZER_EMAIL',
]

logger.info('🔍 [MS GRAPH CONFIG] Checking required environment variables', {
  required: requiredEnvVars,
})

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`❌ [MS GRAPH CONFIG] Missing environment variable: ${envVar}`, {
      envVar,
      allEnvVars: requiredEnvVars,
    })
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
  logger.info(`✅ [MS GRAPH CONFIG] Found ${envVar}`, {
    envVar,
    valueLength: process.env[envVar]!.length,
    preview: envVar === 'TEAMS_ORGANIZER_EMAIL'
      ? process.env[envVar]
      : process.env[envVar]!.substring(0, 8) + '...',
  })
}

// Azure AD credentials
const tenantId = process.env.MICROSOFT_TENANT_ID!
const clientId = process.env.MICROSOFT_CLIENT_ID!
const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
export const organizerUserId = process.env.TEAMS_ORGANIZER_USER_ID!
export const organizerEmail = process.env.TEAMS_ORGANIZER_EMAIL!

/**
 * Validate that a string is a valid GUID format
 */
function isValidGuid(value: string): boolean {
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return guidRegex.test(value)
}

logger.info('🔑 [MS GRAPH CONFIG] Azure AD credentials loaded', {
  tenantId,
  clientId: clientId.substring(0, 8) + '...',
  clientSecretLength: clientSecret.length,
  organizerUserId,
  organizerEmail,
})

// Create credential for app-only authentication
logger.info('🔐 [MS GRAPH CONFIG] Creating ClientSecretCredential', {
  tenantId,
})

let graphClient: Client

try {
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret)

  logger.info('✅ [MS GRAPH CONFIG] ClientSecretCredential created', {
    credentialType: 'ClientSecretCredential',
  })

  // Create authentication provider
  logger.info('🔐 [MS GRAPH CONFIG] Creating authentication provider', {
    scopes: ['https://graph.microsoft.com/.default'],
  })

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  })

  logger.info('✅ [MS GRAPH CONFIG] Authentication provider created')

  // Create Microsoft Graph client
  logger.info('🌐 [MS GRAPH CONFIG] Initializing Graph client')

  graphClient = Client.initWithMiddleware({
    authProvider,
  })

  logger.info('🎉 [MS GRAPH CONFIG] Microsoft Graph client initialized successfully', {
    tenantId,
    clientId: clientId.substring(0, 8) + '...',
    organizerEmail,
    ready: true,
  })

  // Validate Object ID format
  logger.info('🔍 [MS GRAPH CONFIG] Validating organizer Object ID format')

  if (!isValidGuid(organizerUserId)) {
    logger.error('❌ [MS GRAPH CONFIG] TEAMS_ORGANIZER_USER_ID is not a valid GUID format', {
      providedValue: organizerUserId,
      expectedFormat: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    })
    throw new Error(
      'TEAMS_ORGANIZER_USER_ID must be a valid GUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)'
    )
  }

  logger.info('✅ [MS GRAPH CONFIG] Teams organizer configured', {
    organizerUserId,
    organizerEmail,
    userIdFormat: 'Object ID (GUID)',
    guidValid: true,
  })
} catch (error: any) {
  logger.error('💥 [MS GRAPH CONFIG] Failed to initialize Microsoft Graph client', {
    error: {
      message: error.message,
      type: error.constructor.name,
      stack: error.stack,
    },
    tenantId,
    clientId: clientId.substring(0, 8) + '...',
  })
  throw error
}

export { graphClient }
