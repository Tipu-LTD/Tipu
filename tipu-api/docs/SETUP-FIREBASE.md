# Firebase Configuration Guide

This guide will walk you through setting up Firebase for TIPU Academy, including Authentication, Firestore, and Storage.

---

## 📋 Prerequisites

- Google account
- Node.js 18+ installed
- Firebase CLI installed globally

Install Firebase CLI:
```bash
npm install -g firebase-tools
```

---

## 1️⃣ Create Firebase Project

### Step 1: Go to Firebase Console

Visit [console.firebase.google.com](https://console.firebase.google.com)

### Step 2: Create New Project

1. Click "Add project"
2. Project name: `tipu-academy` (or your preferred name)
3. Enable Google Analytics (optional, recommended for production)
4. Choose Analytics location: United Kingdom
5. Click "Create project"

### Step 3: Add Web App

1. In your new project, click the web icon (`</>`) to add a web app
2. App nickname: `TIPU Academy Web`
3. **Check** "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. **Save the configuration** (you'll need it later)

---

## 2️⃣ Enable Firebase Authentication

### Step 1: Navigate to Authentication

1. In Firebase Console, go to **Build → Authentication**
2. Click "Get started"

### Step 2: Enable Email/Password Sign-in

1. Go to **Sign-in method** tab
2. Click "Email/Password"
3. **Enable** the first toggle (Email/Password)
4. Leave "Email link" disabled
5. Click "Save"

### Step 3: (Optional) Enable Google Sign-in

1. Click "Google" provider
2. **Enable** the toggle
3. Select support email
4. Click "Save"

### Step 4: Add Authorized Domains

1. Go to **Settings** tab in Authentication
2. Under "Authorized domains", add:
   - `localhost` (for development)
   - Your production domain (e.g., `tipuacademy.com`)
   - Your Vercel domain (e.g., `tipu-academy.vercel.app`)

---

## 3️⃣ Set Up Firestore Database

### Step 1: Create Database

1. In Firebase Console, go to **Build → Firestore Database**
2. Click "Create database"

### Step 2: Choose Location

1. Select location: **europe-west2 (London)** (or closest to your users)
2. **Important:** Location cannot be changed later!

### Step 3: Start in Production Mode

1. Select **"Start in production mode"**
2. Click "Enable"

**Note:** We'll deploy custom security rules later, so production mode is safe.

### Step 4: Create Initial Collections

You can create these manually or let the app create them automatically on first use:

1. Click "Start collection"
2. Collection ID: `users`
3. Add a test document (optional):
   - Document ID: Auto-ID
   - Fields:
     - `email` (string): "test@example.com"
     - `role` (string): "student"
     - `createdAt` (timestamp): Now

Repeat for other collections:
- `bookings`
- `conversations`
- `resources`
- `tutor_availability`
- `schools`

---

## 4️⃣ Set Up Firebase Storage

### Step 1: Create Storage Bucket

1. In Firebase Console, go to **Build → Storage**
2. Click "Get started"

### Step 2: Start in Production Mode

1. Select **"Start in production mode"**
2. Click "Next"

### Step 3: Choose Location

1. Select same location as Firestore: **europe-west2 (London)**
2. Click "Done"

### Step 4: Create Folders (Optional)

In the Storage browser, create these folders:
- `recordings/` - Session recording videos
- `resources/` - Teaching materials
- `profile-photos/` - User profile pictures
- `homework/` - Homework file uploads

---

## 5️⃣ Get Firebase Configuration

### Step 1: Find Your Config

1. Go to **Project settings** (gear icon)
2. Scroll down to "Your apps"
3. Select your web app
4. Under "SDK setup and configuration", choose **"Config"**

You'll see something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tipu-academy.firebaseapp.com",
  projectId: "tipu-academy",
  storageBucket: "tipu-academy.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 2: Add to Environment Variables

Copy the values to your `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tipu-academy.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tipu-academy
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tipu-academy.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## 6️⃣ Install Firebase SDK

The Firebase SDK should already be in `package.json`, but if not:

```bash
npm install firebase
```

Current version (as of Dec 2024): `^10.7.0`

---

## 7️⃣ Initialize Firebase in Your App

The Firebase config should be in `src/lib/firebase/config.ts`:

```typescript
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
```

---

## 8️⃣ Deploy Security Rules

### Firestore Security Rules

Rules are defined in `firebase/firestore.rules`. To deploy:

```bash
firebase deploy --only firestore:rules
```

**Key security principles:**
- Users can only read/write their own data
- Tutors can access bookings assigned to them
- Parents can access their children's data
- Admins have full access
- Students under 18 cannot initiate chats

### Storage Security Rules

Rules are defined in `firebase/storage.rules`. To deploy:

```bash
firebase deploy --only storage:rules
```

**Key security principles:**
- Session recordings: only student + tutor can access
- Resources: enrolled students or public
- Profile photos: public read, owner write

### Deploy All Rules at Once

```bash
firebase deploy --only firestore:rules,storage:rules
```

---

## 9️⃣ Set Up Firebase CLI (Local Development)

### Step 1: Login to Firebase

```bash
firebase login
```

Follow the browser authentication flow.

### Step 2: Initialize Firebase in Your Project

```bash
firebase init
```

Select:
- **Firestore**: Configure security rules and indexes
- **Storage**: Configure security rules
- **Hosting**: (Optional) If using Firebase Hosting

Follow the prompts:
- Use existing project: Select your `tipu-academy` project
- Firestore rules file: `firebase/firestore.rules`
- Firestore indexes file: `firebase/firestore.indexes.json`
- Storage rules file: `firebase/storage.rules`

### Step 3: Test Locally with Emulators (Optional)

Install emulators:
```bash
firebase init emulators
```

Select:
- Authentication Emulator
- Firestore Emulator
- Storage Emulator

Run emulators:
```bash
firebase emulators:start
```

Update `.env.local` to use emulators:
```env
NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true
```

---

## 🔒 Firestore Security Rules

Here's the complete `firebase/firestore.rules` file:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function hasRole(role) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }

    function isAdult() {
      let user = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
      let birthDate = user.dateOfBirth;
      return birthDate == null ||
             (request.time.toMillis() - birthDate.toMillis()) >= 568024668000; // 18 years
    }

    function isParentOfStudent(studentId) {
      let parentData = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
      return studentId in parentData.childrenIds;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn() && (
        isOwner(userId) ||
        hasRole('admin') ||
        (hasRole('parent') && isParentOfStudent(userId))
      );
      allow create: if isSignedIn();
      allow update: if isSignedIn() && (isOwner(userId) || hasRole('admin'));
      allow delete: if hasRole('admin');
    }

    // Bookings collection
    match /bookings/{bookingId} {
      allow read: if isSignedIn() && (
        resource.data.studentId == request.auth.uid ||
        resource.data.tutorId == request.auth.uid ||
        hasRole('admin') ||
        (hasRole('parent') && isParentOfStudent(resource.data.studentId))
      );
      allow create: if isSignedIn();
      allow update: if isSignedIn() && (
        resource.data.tutorId == request.auth.uid ||
        resource.data.studentId == request.auth.uid ||
        hasRole('admin')
      );
      allow delete: if hasRole('admin');
    }

    // Conversations
    match /conversations/{conversationId} {
      allow read: if isSignedIn() && request.auth.uid in resource.data.participantIds;
      allow create: if isSignedIn();
      allow update: if isSignedIn() && request.auth.uid in resource.data.participantIds;

      // Messages subcollection
      match /messages/{messageId} {
        allow read: if isSignedIn() &&
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantIds;
        allow create: if isSignedIn() && (
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantIds &&
          (hasRole('tutor') || hasRole('parent') || (hasRole('student') && isAdult()))
        );
      }
    }

    // Resources
    match /resources/{resourceId} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn() && (hasRole('tutor') || hasRole('admin'));
      allow delete: if hasRole('admin');
    }

    // Tutor availability
    match /tutor_availability/{availabilityId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && (
        (hasRole('tutor') && request.auth.uid == resource.data.tutorId) ||
        hasRole('admin')
      );
    }

    // Schools
    match /schools/{schoolId} {
      allow read: if hasRole('admin');
      allow write: if hasRole('admin');
    }
  }
}
```

Deploy with:
```bash
firebase deploy --only firestore:rules
```

---

## 🗂️ Storage Security Rules

Here's the complete `firebase/storage.rules` file:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Profile photos (public read, owner write)
    match /profile-photos/{userId}/{fileName} {
      allow read: if true;  // Public
      allow write: if isSignedIn() && isOwner(userId);
    }

    // Session recordings (only student + tutor can access)
    match /recordings/{bookingId}/{fileName} {
      allow read: if isSignedIn();  // Check booking access in Firestore
      allow write: if isSignedIn();  // Tutors upload recordings
    }

    // Resources (public or enrolled students)
    match /resources/{resourceId}/{fileName} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();  // Tutors/admins upload
    }

    // Homework uploads
    match /homework/{studentId}/{fileName} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && isOwner(studentId);
    }
  }
}
```

Deploy with:
```bash
firebase deploy --only storage:rules
```

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Firebase project created
- [ ] Web app registered
- [ ] Authentication enabled (Email/Password)
- [ ] Authorized domains added (localhost + production)
- [ ] Firestore database created (europe-west2)
- [ ] Storage bucket created (same region)
- [ ] Configuration added to `.env.local`
- [ ] Firebase SDK installed
- [ ] Security rules deployed
- [ ] Firebase CLI authenticated
- [ ] Can create test account via app
- [ ] Can sign in/out successfully
- [ ] Can read/write to Firestore
- [ ] Can upload files to Storage

---

## 🆘 Troubleshooting

### "Firebase: Error (auth/unauthorized-domain)"
- Add your domain to authorized domains in Firebase Console
- For local development, ensure `localhost` is authorized

### "Missing or insufficient permissions"
- Deploy Firestore security rules: `firebase deploy --only firestore:rules`
- Check that user is authenticated
- Verify user role in Firestore

### "Storage object does not exist"
- Check file path and bucket name
- Deploy storage rules: `firebase deploy --only storage:rules`
- Verify file was uploaded successfully

### Environment variables not loading
- Restart Next.js dev server after changing `.env.local`
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Check for typos in variable names

---

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Storage Security](https://firebase.google.com/docs/storage/security)
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)

---

## 🔄 Next Steps

After Firebase is configured:

1. ✅ Continue to [SETUP-STRIPE.md](./SETUP-STRIPE.md) for payment integration
2. ✅ Review [API-REFERENCE.md](./API-REFERENCE.md) for using Firebase in your code
3. ✅ Check [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) for Firestore structure

---

**Firebase setup complete! 🎉**
