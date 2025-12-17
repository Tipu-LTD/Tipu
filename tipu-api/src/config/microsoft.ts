import { Client } from '@microsoft/microsoft-graph-client'
import { ClientSecretCredential } from '@azure/identity'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import { logger } from './logger'

// Validate environment variables
const requiredEnvVars = [
  'MICROSOFT_TENANT_ID',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'TEAMS_ORGANIZER_EMAIL',
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

// Azure AD credentials
const tenantId = process.env.MICROSOFT_TENANT_ID!
const clientId = process.env.MICROSOFT_CLIENT_ID!
const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
export const organizerEmail = process.env.TEAMS_ORGANIZER_EMAIL!

// Create credential for app-only authentication
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret)

// Create authentication provider
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default'],
})

// Create Microsoft Graph client
export const graphClient = Client.initWithMiddleware({
  authProvider,
})

logger.info('Microsoft Graph client initialized', {
  tenantId,
  clientId: clientId.substring(0, 8) + '...',
  organizerEmail,
})
