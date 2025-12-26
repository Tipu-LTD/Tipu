# Microsoft Teams Integration Guide

## Overview

The Tipu platform automatically generates Microsoft Teams meeting links for confirmed (paid) bookings. This integration uses the Microsoft Graph API to create online meetings that are accessible to both students and tutors.

**Key Features:**
- Automatic meeting link generation when a booking is paid for
- Manual meeting link generation for existing bookings
- Retry logic with exponential backoff for reliability
- Graceful degradation (payment succeeds even if meeting creation fails)
- Meeting links visible in booking cards and booking details page

---

## Architecture

### Components

1. **Microsoft Graph SDK Client** (`src/config/microsoft.ts`)
   - Initializes authenticated client using Azure AD credentials
   - Uses Client Credentials flow with Application permissions

2. **Teams Service** (`src/services/teamsService.ts`)
   - `createTeamsMeeting()` - Creates Teams meeting via Graph API
   - `generateMeetingForBooking()` - Fetches booking data and creates meeting
   - `deleteTeamsMeeting()` - Deletes meeting on cancellation
   - Retry logic with 3 attempts (1s, 2s, 4s delays)

3. **Payment Webhook Integration** (`src/services/paymentService.ts`)
   - Automatically calls Teams service after payment confirmation
   - Non-blocking: payment succeeds even if Teams creation fails

4. **Manual Generation Endpoint** (`src/routes/bookings.ts`)
   - `POST /api/v1/bookings/:id/generate-meeting`
   - Allows manual link generation for existing confirmed bookings

5. **Frontend UI**
   - `BookingCard.tsx` - Shows "Join Teams Meeting" button or loading state
   - `BookingDetails.tsx` - Full Teams Meeting card with copy functionality

---

## Setup Instructions

### 1. Azure AD App Registration

You need to create an Azure AD app registration to use the Microsoft Graph API:

**Steps:**

1. Go to [Azure Portal](https://portal.azure.com/) → Azure Active Directory → App Registrations
2. Click "New registration"
   - **Name:** "Tipu Teams Integration" (or similar)
   - **Supported account types:** "Accounts in this organizational directory only"
   - **Redirect URI:** Leave empty (not needed for Application permissions)
3. Click "Register"

4. **Note down the following values:**
   - **Application (client) ID** - Found on the Overview page
   - **Directory (tenant) ID** - Found on the Overview page

5. **Create a client secret:**
   - Go to "Certificates & secrets" → "New client secret"
   - **Description:** "Tipu Teams Integration Secret"
   - **Expires:** Choose expiration (recommended: 24 months)
   - Click "Add"
   - **IMPORTANT:** Copy the secret **value** immediately (it won't be shown again)

6. **Grant API permissions:**
   - Go to "API permissions" → "Add a permission" → "Microsoft Graph" → "Application permissions"
   - Add the following permissions:
     - `Calendars.ReadWrite` - Create and read calendar events
     - `OnlineMeetings.ReadWrite.All` - Create Teams meetings
     - `User.Read.All` - Read user profiles
   - Click "Grant admin consent for [Your Org]" (requires admin privileges)
   - **CRITICAL:** All three permissions should show a green checkmark under "Status"

### 2. Configure Organizer Account

**The organizer account is the Microsoft 365 user that will "host" all Teams meetings.**

Requirements:
- Must be a Microsoft 365 account in the same tenant as your Azure AD app
- Must have a Microsoft Teams license
- Email address must be valid

**Recommended Approach:**
- Use a dedicated service account (e.g., `tutor-meetings@yourdomain.com`)
- Alternatively, use a personal account for testing (e.g., `epjbaxter28@gmail.com`)

**Verify the account:**
1. Login to [Microsoft Teams](https://teams.microsoft.com/) with the organizer email
2. Verify you can create meetings
3. Check that the account has a Teams license in the Microsoft 365 admin center

### 3. Set Environment Variables

**Backend (`tipu-api/.env`):**

```bash
# Microsoft Teams Integration
MICROSOFT_TENANT_ID=your-tenant-id-here
MICROSOFT_CLIENT_ID=your-client-id-here
MICROSOFT_CLIENT_SECRET=your-client-secret-here
TEAMS_ORGANIZER_EMAIL=your-organizer-email@yourdomain.com
```

**Important:**
- Never commit real credentials to Git (use `.env.example` with placeholders)
- Keep the client secret secure (treat it like a password)
- Update all four variables with your actual values

### 4. Install Dependencies

The required packages should already be installed, but verify:

```bash
cd tipu-api
npm install @microsoft/microsoft-graph-client @azure/identity @microsoft/microsoft-graph-client
```

### 5. Verify Configuration

Start the backend server:

```bash
cd tipu-api
npm run dev
```

Check the logs for:
```
Microsoft Graph client initialized successfully
```

If you see errors like "Missing required Microsoft Teams environment variables", double-check your `.env` file.

### 6. Application Access Policy Setup (Required)

**⚠️ CRITICAL:** This step is REQUIRED for the Teams integration to work. Without it, you'll get `403 Forbidden` errors.

**Why Required:**
When using Application Permissions to create meetings via the Online Meetings API, Microsoft requires an Application Access Policy to authorize the app to act on behalf of users.

**Steps:**

1. **Install Microsoft Teams PowerShell Module:**

   Open PowerShell as Administrator and run:
   ```powershell
   Install-Module -Name MicrosoftTeams -Force -AllowClobber
   ```

   If you get an error about NuGet provider:
   ```powershell
   Install-PackageProvider -Name NuGet -Force
   Set-PSRepository -Name PSGallery -InstallationPolicy Trusted
   Install-Module -Name MicrosoftTeams -Force -AllowClobber
   ```

2. **Connect to Microsoft Teams:**
   ```powershell
   Connect-MicrosoftTeams
   ```
   A browser window will open - sign in with your Microsoft 365 admin account.

3. **Get Your App Registration Client ID:**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Navigate to: **Microsoft Entra ID** → **App registrations**
   - Find your app (e.g., "Tipu Teams Integration")
   - Copy the **Application (client) ID**

   Or check your `tipu-api/.env` file for the `MICROSOFT_CLIENT_ID` value.

4. **Create Application Access Policy:**
   ```powershell
   # Replace with your actual App Registration Client ID
   $appId = "YOUR-APP-CLIENT-ID-HERE"

   New-CsApplicationAccessPolicy -Identity "Tipu-Teams-Policy" -AppIds $appId -Description "Allow Tipu app to create Teams meetings"
   ```

5. **Grant Policy to Organizer User:**
   ```powershell
   # Replace with your TEAMS_ORGANIZER_EMAIL value
   Grant-CsApplicationAccessPolicy -PolicyName "Tipu-Teams-Policy" -Identity "admin@tipu-learn.com"
   ```

   ⚠️ **Recommended:** Grant to specific user only (not globally) for better security.

6. **Wait for Propagation:**
   - **Minimum wait time:** 15 minutes
   - **Maximum wait time:** 24 hours (rare)
   - **Typical:** 10-20 minutes

   ☕ **Do NOT test immediately** - the policy needs time to propagate across Microsoft's servers.

7. **Verify Policy:**

   After waiting 15+ minutes:
   ```powershell
   Get-CsOnlineUser -Identity "admin@tipu-learn.com" | Select-Object UserPrincipalName, ApplicationAccessPolicy
   ```

   Expected output:
   ```
   UserPrincipalName        ApplicationAccessPolicy
   -----------------        -----------------------
   admin@tipu-learn.com     Tag:Tipu-Teams-Policy
   ```

8. **Disconnect from Teams:**
   ```powershell
   Disconnect-MicrosoftTeams
   ```

**Troubleshooting:**
- If you get `403 Forbidden` errors when creating meetings, ensure the policy has propagated (wait 15+ minutes)
- Verify the App ID matches between Azure Portal and PowerShell policy
- Check that the organizer email matches `TEAMS_ORGANIZER_EMAIL` in your `.env` file
- Ensure API permissions have admin consent granted in Azure Portal

**Reference:**
- [Microsoft Docs: Application Access Policy](https://learn.microsoft.com/en-us/graph/cloud-communication-online-meeting-application-access-policy)

---

## How It Works

### Automatic Meeting Generation (Primary Flow)

**When a student pays for a booking:**

1. **Payment Webhook Triggered** (`src/services/paymentService.ts:confirmPayment()`)
   - Stripe sends `payment_intent.succeeded` event
   - Webhook handler confirms payment in database
   - Updates booking status to "confirmed"

2. **Teams Meeting Created** (`src/services/teamsService.ts:generateMeetingForBooking()`)
   - Fetches booking data (subject, level, scheduled time, student, tutor)
   - Constructs meeting details:
     - **Subject:** `Tipu: [Subject] [Level] Lesson`
     - **Start time:** Booking scheduled time
     - **Duration:** Booking duration (default: 60 minutes)
     - **Participants:** Student email, tutor email
   - Calls Microsoft Graph API to create meeting
   - Retries up to 3 times with exponential backoff (1s, 2s, 4s)

3. **Database Updated**
   - Stores `meetingLink` (join URL) in booking document
   - Stores `teamsMeetingId` for future reference

4. **Frontend Display**
   - React Query refetches booking data
   - "Join Teams Meeting" button appears in booking card
   - Teams Meeting card appears in booking details page

**Graceful Degradation:**
- If Teams API fails, payment still succeeds (booking is confirmed)
- Error is logged but doesn't block payment flow
- Manual generation can be used to create the link later

### Manual Meeting Generation (Backup Flow)

**When to use:**
- Booking was created before Teams integration was deployed
- Automatic generation failed
- Meeting link was deleted or needs to be regenerated

**Endpoint:** `POST /api/v1/bookings/:id/generate-meeting`

**Authorization:**
- User must be the student, tutor, or admin
- Booking must be in "confirmed" status (paid)

**Frontend Implementation:**

1. **Booking Details Page** (`BookingDetails.tsx`)
   - If booking is confirmed but has no `meetingLink`
   - Shows "No meeting link available yet" message
   - Displays "Generate Meeting Link" button

2. **Click Handler** (`generateMeetingMutation`)
   - Calls API endpoint
   - Shows loading spinner during generation
   - On success: Refetches booking data and displays link
   - On error: Shows error message

**Example API Call:**
```typescript
const generateMeetingMutation = useMutation({
  mutationFn: () => bookingsApi.generateMeeting(bookingId),
  onSuccess: () => {
    queryClient.invalidateQueries(['booking', bookingId]);
  }
});
```

### Retry Logic

**Implementation:** `src/services/teamsService.ts:retryWithBackoff()`

**Retry Strategy:**
- **Attempt 1:** Immediate
- **Attempt 2:** Wait 1 second (1000ms)
- **Attempt 3:** Wait 2 seconds (2000ms)
- **Attempt 4:** Wait 4 seconds (4000ms)

**Why Retry?**
- Network transient errors
- Microsoft Graph API rate limiting (429 errors)
- Temporary service unavailability

**Exponential Backoff Formula:**
```typescript
delay = baseDelay * Math.pow(2, attempt - 1)
// Attempt 1: 1000 * 2^0 = 1000ms (1s)
// Attempt 2: 1000 * 2^1 = 2000ms (2s)
// Attempt 3: 1000 * 2^2 = 4000ms (4s)
```

---

## API Reference

### Create Teams Meeting

**Function:** `createTeamsMeeting()`
**Location:** `src/services/teamsService.ts`

**Microsoft Graph Endpoint:** `POST /users/{organizerUserId}/onlineMeetings`

**Why Online Meetings API?**
The implementation uses the **Online Meetings API** instead of the Calendar Events API because:
1. Full control over `lobbyBypassSettings` to allow meetings to start without the organizer
2. Direct meeting creation without requiring calendar event creation
3. Service account doesn't need calendar events

**Note:** Earlier versions used the Calendar Events API (`/calendar/events`), but this was changed to provide better lobby control and enable meetings to start independently.

**Parameters:**
```typescript
{
  subject: string,           // "Computer Science A-Level Lesson"
  startDateTime: string,     // ISO 8601: "2025-12-24T13:00:00Z"
  endDateTime: string,       // ISO 8601: "2025-12-24T14:00:00Z"
  studentEmail: string,      // "student@example.com"
  tutorEmail: string         // "tutor@example.com"
}
```

**Returns:**
```typescript
{
  meetingId: string,         // Teams meeting ID
  joinUrl: string,          // Meeting join link
  organizerId: string       // Organizer user ID
}
```

**Graph API Call:**
```typescript
POST https://graph.microsoft.com/v1.0/users/{organizerEmail}/onlineMeetings
Content-Type: application/json

{
  "subject": "Tipu: Computer Science A-Level Lesson",
  "startDateTime": "2025-12-24T13:00:00Z",
  "endDateTime": "2025-12-24T14:00:00Z",
  "participants": {
    "attendees": [
      { "identity": { "user": { "id": null, "displayName": null, "userPrincipalName": "student@example.com" } } },
      { "identity": { "user": { "id": null, "displayName": null, "userPrincipalName": "tutor@example.com" } } }
    ]
  }
}
```

**Response:**
```json
{
  "id": "MSoxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM",
  "joinUrl": "https://teams.microsoft.com/l/meetup-join/19%3ameeting_...",
  "subject": "Tipu: Computer Science A-Level Lesson",
  "startDateTime": "2025-12-24T13:00:00Z",
  "endDateTime": "2025-12-24T14:00:00Z"
}
```

### Manual Generation Endpoint

**Endpoint:** `POST /api/v1/bookings/:id/generate-meeting`
**Location:** `src/routes/bookings.ts`

**Request:**
```bash
curl -X POST http://localhost:8888/api/v1/bookings/abc123/generate-meeting \
  -H "Authorization: Bearer <firebase-jwt-token>" \
  -H "Content-Type: application/json"
```

**Response (Success):**
```json
{
  "message": "Teams meeting generated successfully",
  "meetingLink": "https://teams.microsoft.com/l/meetup-join/19%3ameeting_...",
  "meetingId": "MSoxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM"
}
```

**Response (Error - Not Confirmed):**
```json
{
  "error": "Booking must be confirmed (paid) before generating meeting link"
}
```

**Response (Error - Unauthorized):**
```json
{
  "error": "Unauthorized"
}
```

---

## Frontend Integration

### Booking Card Component

**Location:** `src/components/bookings/BookingCard.tsx`

**Display Logic:**
```tsx
{booking.status === 'confirmed' && (
  <div className="pt-2 border-t">
    {booking.meetingLink ? (
      // Show "Join Teams Meeting" button
      <Button className="w-full" asChild>
        <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer">
          <Video className="h-4 w-4" />
          Join Teams Meeting
        </a>
      </Button>
    ) : (
      // Show loading state
      <div className="w-full p-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent" />
          Generating meeting link...
        </div>
      </div>
    )}
  </div>
)}
```

### Booking Details Page

**Location:** `src/pages/bookings/BookingDetails.tsx`

**Features:**
- Full Teams Meeting card (larger, more prominent)
- "Join Meeting" button (opens in new tab)
- "Copy Meeting Link" button (clipboard)
- "Generate Meeting Link" button (manual generation)
- Loading states and error handling

**UI States:**

1. **Meeting link exists:**
   - Blue highlighted card
   - "Join Meeting" button (primary)
   - "Copy Meeting Link" button (outline)

2. **No meeting link (generating):**
   - Shows loading spinner
   - "Generating meeting link..." message

3. **No meeting link (manual generation available):**
   - "No meeting link available yet" message
   - "Generate Meeting Link" button
   - Error message if generation fails

---

## Testing

### Local Testing with Stripe CLI

**Test automatic meeting generation:**

1. **Start Stripe webhook listener:**
   ```bash
   stripe listen --forward-to localhost:8888/api/v1/payments/webhook
   ```

2. **Create a test booking** (via frontend or API)

3. **Trigger test payment:**
   ```bash
   stripe trigger payment_intent.succeeded
   ```
   Or use Stripe test cards in the frontend (e.g., `4242 4242 4242 4242`)

4. **Check backend logs:**
   ```
   Payment confirmed for booking: abc123
   Teams meeting generated for booking: abc123
   Teams meeting created: https://teams.microsoft.com/l/meetup-join/...
   ```

5. **Verify in frontend:**
   - Refresh booking details page
   - "Join Teams Meeting" button should appear

### Manual Testing

**Test manual meeting generation:**

1. **Find a confirmed booking without a meeting link:**
   - Option A: Create a booking, pay for it, then manually delete `meetingLink` from Firestore
   - Option B: Use a booking created before Teams integration

2. **Open booking details page in frontend**

3. **Click "Generate Meeting Link" button**

4. **Verify:**
   - Button shows loading spinner
   - After a few seconds, "Join Meeting" button appears
   - Clicking "Join Meeting" opens Teams in new tab

### API Testing with cURL

**Test manual generation endpoint directly:**

```bash
# 1. Get Firebase auth token (from browser console)
# In browser console: firebase.auth().currentUser.getIdToken().then(console.log)

# 2. Call API
curl -X POST http://localhost:8888/api/v1/bookings/abc123/generate-meeting \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6..." \
  -H "Content-Type: application/json"
```

**Expected response:**
```json
{
  "message": "Teams meeting generated successfully",
  "meetingLink": "https://teams.microsoft.com/l/meetup-join/...",
  "meetingId": "MSoxMjM0..."
}
```

---

## Troubleshooting

### Error: "Missing required Microsoft Teams environment variables"

**Cause:** One or more environment variables are not set in `.env`

**Fix:**
1. Check `tipu-api/.env` file exists
2. Verify all four variables are set:
   ```bash
   MICROSOFT_TENANT_ID=...
   MICROSOFT_CLIENT_ID=...
   MICROSOFT_CLIENT_SECRET=...
   TEAMS_ORGANIZER_EMAIL=...
   ```
3. Restart the backend server: `npm run dev`

### Error: "Failed to create Teams meeting" (401 Unauthorized)

**Cause:** Azure AD credentials are invalid or expired

**Possible Issues:**
1. **Client secret expired:**
   - Go to Azure Portal → App Registrations → Your App → Certificates & secrets
   - Check expiration date
   - Create a new secret if expired
   - Update `MICROSOFT_CLIENT_SECRET` in `.env`

2. **Incorrect tenant/client ID:**
   - Verify `MICROSOFT_TENANT_ID` and `MICROSOFT_CLIENT_ID` match Azure Portal values
   - Tenant ID should be a GUID (e.g., `a29ba91d-ff65-44f3-a25a-502dc2c9a7e0`)

3. **API permissions not granted:**
   - Go to Azure Portal → App Registrations → Your App → API permissions
   - Verify "Status" column shows green checkmarks for all permissions
   - If not, click "Grant admin consent for [Your Org]"

### Error: "Failed to create Teams meeting" (403 Forbidden)

**Cause:** Organizer email doesn't have proper permissions

**Possible Issues:**
1. **Organizer account has no Teams license:**
   - Login to [Microsoft 365 admin center](https://admin.microsoft.com/)
   - Go to Users → Active users → Find organizer account
   - Check "Licenses and apps" tab
   - Ensure Microsoft Teams license is assigned

2. **Organizer email not in the same tenant:**
   - Verify `TEAMS_ORGANIZER_EMAIL` belongs to the same Microsoft 365 tenant
   - Try logging in to [Teams](https://teams.microsoft.com/) with the organizer email

3. **Application permissions not granted:**
   - Re-check API permissions in Azure Portal (see setup instructions above)

### Error: "Booking must be confirmed (paid) before generating meeting link"

**Cause:** Trying to generate a meeting for a non-confirmed booking

**Fix:**
1. Verify booking status is "confirmed" (not "pending", "declined", "cancelled")
2. Check `isPaid: true` in Firestore booking document
3. If testing, manually update booking status:
   ```javascript
   // In Firestore console or via script
   db.collection('bookings').doc('abc123').update({
     status: 'confirmed',
     isPaid: true
   });
   ```

### Error: "Unauthorized" (403) when calling manual generation endpoint

**Cause:** User is not authorized to generate meeting link for this booking

**Authorized Users:**
- Student who booked the session
- Tutor assigned to the session
- Admin users

**Fix:**
1. Verify you're logged in as the correct user
2. Check Firebase JWT token is valid (not expired)
3. Verify user role in Firestore `users` collection
4. Check booking `studentId` and `tutorId` match current user

### Meeting link not appearing in frontend

**Debugging Steps:**

1. **Check booking data in Firestore:**
   - Open Firebase Console → Firestore Database
   - Navigate to `bookings/{bookingId}`
   - Verify `meetingLink` field exists and has a valid URL
   - Verify `status: "confirmed"`

2. **Check browser console for errors:**
   - Open DevTools → Console tab
   - Look for API errors or network failures
   - Verify React Query is refetching after payment

3. **Check network tab:**
   - Open DevTools → Network tab
   - Find request to `/api/v1/bookings/{id}`
   - Verify response includes `meetingLink` field

4. **Force React Query refetch:**
   - In browser console:
     ```javascript
     queryClient.invalidateQueries(['booking', 'abc123']);
     ```
   - Or refresh the page

5. **Check backend logs:**
   - Look for "Teams meeting generated" or error messages
   - Verify payment webhook was triggered

### Meeting link generation is slow

**Expected Behavior:**
- First attempt: 0-2 seconds (Microsoft Graph API latency)
- With retries: Up to 8 seconds (1s + 2s + 4s + API latency)

**If taking longer than 10 seconds:**
1. Check network connectivity to Microsoft Graph API
2. Verify no firewall blocking `https://graph.microsoft.com`
3. Check Microsoft 365 service status: https://status.office.com/
4. Review backend logs for specific error messages

### Rate Limiting (429 Too Many Requests)

**Cause:** Microsoft Graph API has rate limits

**Microsoft Graph Limits:**
- **Application permissions:** ~2000 requests per 10 seconds per app
- **Per-user limits:** Varies by endpoint

**Mitigation:**
- Retry logic with exponential backoff already implemented
- If hitting limits frequently, consider:
  - Caching meeting links (already implemented)
  - Batching meeting creation (for bulk operations)
  - Implementing a queue system for high-volume scenarios

---

## Security Considerations

### Application Permissions vs Delegated Permissions

**Current Implementation:** Application permissions (Client Credentials flow)

**Why Application Permissions?**
- No user interaction required (automated meeting creation)
- Works for any user without individual consent
- Scalable for multi-tenant scenarios

**Security Implications:**
- App can create meetings on behalf of ANY user in the tenant
- Requires admin consent
- Client secret must be kept secure (server-side only)

**Best Practices:**
- Never expose client secret in frontend code
- Use environment variables for credentials
- Rotate client secrets periodically (recommended: every 6-12 months)
- Limit Azure AD app scope to minimum required permissions

### Organizer Account Security

**Recommendations:**
1. Use a dedicated service account (not a personal account)
2. Enable multi-factor authentication (MFA) on the organizer account
3. Monitor organizer account activity for suspicious behavior
4. Restrict organizer account to Teams meeting creation only

### Meeting Link Security

**Current Implementation:**
- Meeting links are stored in Firestore (protected by security rules)
- Only student, tutor, parent, or admin can access booking data
- Links are only visible after payment (booking status: "confirmed")

**Lobby Bypass Configuration (Implemented):**

The Tipu platform configures Teams meetings with `lobbyBypassSettings.scope: 'everyone'` to allow meetings to start without the organizer (service account) being present.

**Current Implementation:**
```typescript
lobbyBypassSettings: {
  scope: 'everyone',              // All participants can join directly
  isDialInBypassEnabled: true     // Phone dial-in users also bypass
},
allowedPresenters: 'everyone',     // All participants can present
allowMeetingChat: 'enabled',       // Enable chat
isEntryExitAnnounced: false        // No join/leave sounds
```

**Why `scope: 'everyone'`?**
- **Meetings can start without organizer:** Students and tutors can begin their lesson even if the service account isn't present
- **No lobby waiting:** Participants join directly without waiting for admission
- **Better user experience:** Eliminates friction in starting lessons

**Security Considerations:**
- **Safe for Tipu:** Meetings are 1-on-1 (student + tutor), both pre-authenticated in the platform
- **Meeting links are unique:** Each booking gets a unique, non-guessable meeting URL
- **Access controlled:** Links only visible to authenticated students/tutors who booked the session
- **Not publicly shared:** Firestore security rules prevent unauthorized access to booking data

**Alternative Options (Not Used):**
- `scope: 'organization'` - Would require both parties to be in the same Microsoft 365 organization (not feasible for Tipu)
- `scope: 'organizer'` - Would require organizer to join first (defeats the purpose of automated meetings)
- `scope: 'invited'` - Similar to 'everyone' but more restrictive (unnecessary for 1-on-1 meetings)

**Additional Settings:**
1. **Meeting Options:** All participants can present, enable camera/mic
2. **Recording Policies:** Controlled by participant Teams account settings
3. **Meeting Expiration:** Meetings remain accessible for the scheduled time slot

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] Azure AD app created and configured
- [ ] API permissions granted and admin consent provided
- [ ] Client secret created and stored securely
- [ ] Organizer account verified (Teams license active)
- [ ] Environment variables set in production `.env`
- [ ] Test automatic meeting generation in staging environment
- [ ] Test manual meeting generation in staging environment
- [ ] Verify retry logic works (simulate network errors)
- [ ] Test graceful degradation (payment succeeds if Teams fails)
- [ ] Review backend logs for any warnings or errors

### Post-Deployment

- [ ] Monitor backend logs for Teams API errors
- [ ] Verify first production booking generates meeting link successfully
- [ ] Test meeting link works (can join Teams meeting)
- [ ] Monitor Microsoft Graph API usage (check for rate limiting)
- [ ] Set up alerts for Teams API failures (Sentry, CloudWatch, etc.)
- [ ] Document any production-specific configuration differences

### Monitoring

**Key Metrics to Track:**
1. **Meeting Generation Success Rate**
   - % of bookings with successful meeting link creation
   - Target: >99%

2. **Meeting Generation Latency**
   - Time from payment confirmation to meeting link available
   - Target: <5 seconds (average)

3. **Retry Rate**
   - % of meeting creations requiring retries
   - Target: <10%

4. **API Error Rate**
   - Microsoft Graph API errors (401, 403, 429, 500, etc.)
   - Target: <1%

**Logging Best Practices:**
```typescript
// Example logging in production
logger.info('Teams meeting generation started', {
  bookingId,
  subject,
  scheduledAt
});

logger.info('Teams meeting created successfully', {
  bookingId,
  meetingId,
  latency: endTime - startTime
});

logger.error('Teams meeting creation failed', {
  bookingId,
  error: error.message,
  statusCode: error.statusCode,
  attempt: attemptNumber
});
```

---

## Future Enhancements

### Planned Features

1. **Meeting Recording Management**
   - Auto-record all sessions
   - Upload recordings to Firebase Storage
   - Link recordings to booking documents
   - Automatic transcription (Azure AI)

2. **Meeting Analytics**
   - Track attendance (who joined, when, duration)
   - No-show detection
   - Automatic reminder emails if participants don't join

3. **Advanced Meeting Options**
   - Lobby settings per tutor preference
   - Breakout rooms for group sessions
   - Custom meeting backgrounds

4. **Calendar Integration**
   - Sync meetings to tutor and student calendars
   - Automatic reminders (15 min before session)
   - Timezone handling

5. **Meeting Deletion on Cancellation**
   - Implement `deleteTeamsMeeting()` function
   - Call on booking cancellation
   - Clean up unused meetings

### Optional: Delegated Permissions Approach

**Current:** Application permissions (service account creates all meetings)

**Alternative:** Delegated permissions (tutors create meetings from their own accounts)

**Pros:**
- Meetings appear in tutor's personal calendar
- More control for tutors
- Better audit trail

**Cons:**
- Requires OAuth consent flow for each tutor
- More complex authentication
- Token refresh management needed

**Implementation Notes:**
- Would require frontend OAuth flow
- Store refresh tokens securely
- Implement token refresh logic
- Handle permission revocation gracefully

---

## References

**Microsoft Graph Documentation:**
- [Create onlineMeeting](https://learn.microsoft.com/en-us/graph/api/application-post-onlinemeetings)
- [onlineMeeting resource type](https://learn.microsoft.com/en-us/graph/api/resources/onlinemeeting)
- [Microsoft Graph SDK for JavaScript](https://github.com/microsoftgraph/msgraph-sdk-javascript)

**Azure AD Documentation:**
- [Register an application](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [Application permissions vs delegated permissions](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)
- [Client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)

**Related Files:**
- `tipu-api/src/config/microsoft.ts` - Graph client initialization
- `tipu-api/src/services/teamsService.ts` - Teams meeting logic
- `tipu-api/src/services/paymentService.ts` - Payment webhook integration
- `tipu-api/src/routes/bookings.ts` - Manual generation endpoint
- `tipu-app/src/components/bookings/BookingCard.tsx` - Booking card UI
- `tipu-app/src/pages/bookings/BookingDetails.tsx` - Booking details UI

---

**Last Updated:** December 2025
**Version:** 1.0.0
**Status:** Production Ready
