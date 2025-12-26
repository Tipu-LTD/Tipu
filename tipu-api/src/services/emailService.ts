import { Resend } from 'resend'
import { logger } from '../config/logger'

const resend = new Resend(process.env.RESEND_API_KEY!)

const EMAIL_FROM = process.env.EMAIL_FROM || 'Tipu <onboarding@resend.dev>'
const EMAIL_MOCK_MODE = process.env.EMAIL_MOCK_MODE === 'true'

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  displayName: string
): Promise<void> {
  const subject = 'Reset Your Tipu Password'

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin-top: 0;">Reset Your Password</h1>
          <p>Hi ${displayName},</p>
          <p>We received a request to reset your Tipu account password. Click the button below to create a new password:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}"
               style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Reset Password
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color: #3b82f6; word-break: break-all;">${resetLink}</a>
          </p>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <strong>This link will expire in 1 hour.</strong>
          </p>

          <p style="color: #666; font-size: 14px;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>

        <div style="color: #999; font-size: 12px; text-align: center;">
          <p>This is an automated email from Tipu. Please do not reply to this email.</p>
        </div>
      </body>
    </html>
  `

  if (EMAIL_MOCK_MODE) {
    logger.info('EMAIL MOCK MODE: Password reset email', {
      to: email,
      subject,
      resetLink,
    })
    return
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject,
      html,
    })

    if (error) {
      logger.error('Failed to send password reset email', { error, email })
      throw new Error(`Failed to send email: ${error.message}`)
    }

    logger.info('Password reset email sent successfully', {
      emailId: data?.id,
      to: email,
    })
  } catch (error) {
    logger.error('Error sending password reset email', { error, email })
    throw error
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  displayName: string,
  verificationLink: string
): Promise<void> {
  const subject = 'Verify Your Tipu Email Address'

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin-top: 0;">Welcome to Tipu!</h1>
          <p>Hi ${displayName},</p>
          <p>Thank you for signing up! Please verify your email address to get started with Tipu.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}"
               style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Verify Email Address
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${verificationLink}" style="color: #3b82f6; word-break: break-all;">${verificationLink}</a>
          </p>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <strong>This link will expire in 24 hours.</strong>
          </p>

          <p style="color: #666; font-size: 14px;">
            If you didn't create an account with Tipu, you can safely ignore this email.
          </p>
        </div>

        <div style="color: #999; font-size: 12px; text-align: center;">
          <p>This is an automated email from Tipu. Please do not reply to this email.</p>
        </div>
      </body>
    </html>
  `

  if (EMAIL_MOCK_MODE) {
    logger.info('EMAIL MOCK MODE: Email verification', {
      to: email,
      subject,
      verificationLink,
    })
    return
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject,
      html,
    })

    if (error) {
      logger.error('Failed to send verification email', { error, email })
      throw new Error(`Failed to send email: ${error.message}`)
    }

    logger.info('Verification email sent successfully', {
      emailId: data?.id,
      to: email,
    })
  } catch (error) {
    logger.error('Error sending verification email', { error, email })
    throw error
  }
}

/**
 * Send welcome email after email verification
 */
export async function sendWelcomeEmail(
  email: string,
  displayName: string
): Promise<void> {
  const subject = 'Welcome to Tipu - Your Learning Journey Begins!'

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin-top: 0;">🎉 Welcome to Tipu!</h1>
          <p>Hi ${displayName},</p>
          <p>Your email has been verified successfully! You're all set to start using Tipu.</p>

          <h2 style="color: #2c3e50; font-size: 18px; margin-top: 30px;">What's Next?</h2>
          <ul style="line-height: 1.8;">
            <li>Browse our expert tutors in Maths, Physics, Computer Science, and Python</li>
            <li>Book your first lesson</li>
            <li>Connect with tutors through our messaging system</li>
            <li>Track your learning progress</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:5173'}/dashboard"
               style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Go to Dashboard
            </a>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, feel free to reach out to our support team.
          </p>
        </div>

        <div style="color: #999; font-size: 12px; text-align: center;">
          <p>This is an automated email from Tipu. Please do not reply to this email.</p>
        </div>
      </body>
    </html>
  `

  if (EMAIL_MOCK_MODE) {
    logger.info('EMAIL MOCK MODE: Welcome email', {
      to: email,
      subject,
    })
    return
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject,
      html,
    })

    if (error) {
      logger.error('Failed to send welcome email', { error, email })
      throw new Error(`Failed to send email: ${error.message}`)
    }

    logger.info('Welcome email sent successfully', {
      emailId: data?.id,
      to: email,
    })
  } catch (error) {
    logger.error('Error sending welcome email', { error, email })
    throw error
  }
}
