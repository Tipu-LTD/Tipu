# TIPU Academy - Setup Guide

Welcome to TIPU Academy! This guide will help you set up the development environment and get the platform running locally.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **npm** or **pnpm** (npm comes with Node.js, pnpm is optional but recommended)
- **Git** ([Download](https://git-scm.com/))
- **Firebase Account** (free tier works for development)
- **Stripe Account** (test mode for development)
- **Code Editor** (VS Code recommended)

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/tipu-academy.git
cd tipu-academy
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using pnpm (faster):
```bash
pnpm install
```

### 3. Set Up Environment Variables

Copy the example environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Firebase and Stripe keys (see configuration guides below).

### 4. Configure Firebase

Follow the detailed guide: [SETUP-FIREBASE.md](./SETUP-FIREBASE.md)

**Quick summary:**
1. Create a Firebase project
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Create Storage bucket
5. Get your config keys and add to `.env.local`

### 5. Configure Stripe

Follow the detailed guide: [SETUP-STRIPE.md](./SETUP-STRIPE.md)

**Quick summary:**
1. Create Stripe account
2. Get test API keys
3. Set up webhook for local development
4. Add keys to `.env.local`

### 6. Deploy Firebase Security Rules

```bash
npm run firebase:deploy
```

Or manually:
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
tipu-academy/
├── src/
│   ├── components/          # React components
│   │   ├── dashboards/      # Role-specific dashboards
│   │   ├── booking/         # Booking flow components
│   │   ├── chat/            # Real-time chat components
│   │   ├── admin/           # Admin back-office components
│   │   └── shared/          # Reusable components
│   ├── lib/
│   │   ├── firebase/        # Firebase client & helpers
│   │   ├── stripe/          # Stripe integration
│   │   ├── hooks/           # Custom React hooks
│   │   └── api/             # API abstraction layer
│   ├── pages/
│   │   ├── index.tsx        # Landing page
│   │   ├── auth/            # Login/register pages
│   │   ├── dashboard/       # Dashboard pages (student, tutor, parent, admin)
│   │   ├── booking/         # Booking flow pages
│   │   └── api/             # Next.js API routes
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── public/                  # Static assets
├── firebase/                # Firebase configuration
├── docs/                    # Documentation (you are here!)
├── .env.local              # Environment variables (git-ignored)
├── .env.example            # Environment variables template
├── package.json
├── next.config.js
└── tsconfig.json
```

---

## 🗄️ Database Schema

For detailed Firestore collection schemas, see: [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md)

**Key Collections:**
- `users` - User profiles (students, tutors, parents, admins)
- `bookings` - Tutoring session bookings
- `conversations` - Chat conversations
- `messages` - Chat messages (subcollection)
- `resources` - Teaching materials and recordings
- `tutor_availability` - Tutor schedules
- `schools` - School tracking

---

## 🔌 API Reference

For detailed API function documentation, see: [API-REFERENCE.md](./API-REFERENCE.md)

**Key API Modules:**
- Authentication API
- Booking API
- Payment API (Stripe)
- Chat API
- Tutor API
- Resources API
- Admin API
- Notification API

---

## 🛠️ Development Workflow

### Running the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Building for Production

```bash
npm run build
```

### Running Production Build Locally

```bash
npm run build
npm run start
```

---

## 🧪 Testing Accounts

For local development, create test accounts for each role:

**Student Account:**
- Email: `student@test.com`
- Password: `test123`
- Role: Student

**Tutor Account:**
- Email: `tutor@test.com`
- Password: `test123`
- Role: Tutor

**Parent Account:**
- Email: `parent@test.com`
- Password: `test123`
- Role: Parent

**Admin Account:**
- Email: `admin@test.com`
- Password: `test123`
- Role: Admin

You can create these accounts through the registration flow or directly in Firebase Console.

---

## 🎨 UI Components

This project uses **shadcn/ui** components with **Tailwind CSS** for styling.

### Adding New shadcn/ui Components

```bash
npx shadcn-ui@latest add [component-name]
```

Example:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
```

### Customizing Theme

Edit `tailwind.config.js` to customize colors, fonts, and other design tokens.

---

## 🔐 Security

### Firestore Security Rules

Security rules are defined in `firebase/firestore.rules`. Key principles:

1. Users can only access their own data
2. Tutors can access bookings assigned to them
3. Parents can access their children's data
4. Admins have full access
5. Students under 18 cannot initiate chats

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

### Storage Security Rules

Storage rules are defined in `firebase/storage.rules`. Key principles:

1. Session recordings: only student + tutor can access
2. Resources: only enrolled students or public
3. Profile photos: public read, owner write

Deploy rules:
```bash
firebase deploy --only storage:rules
```

---

## 📧 Email Notifications

Email notifications are sent via **Resend** or **SendGrid** (configured in Next.js API routes).

### Setting Up Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Get API key
3. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_...
   ```

### Email Templates

Email templates are defined in `src/lib/email/templates/`:
- Booking request (to tutor)
- Booking confirmation (to student)
- Lesson reminder (24hr before)

---

## 🚀 Deployment

For detailed deployment instructions, see: [DEPLOYMENT.md](./DEPLOYMENT.md)

### Quick Deployment to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy!

```bash
npm install -g vercel
vercel
```

---

## 🆘 Troubleshooting

### Common Issues

**Issue: Firebase Auth not working**
- Check authorized domains in Firebase Console
- Verify API keys in `.env.local`
- Ensure Firebase SDK initialized correctly in `src/lib/firebase/config.ts`

**Issue: "Permission denied" in Firestore**
- Review security rules in `firebase/firestore.rules`
- Check user authentication status
- Verify role-based access logic

**Issue: Stripe webhook not triggering locally**
- Use Stripe CLI for local testing:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```
- Verify webhook secret matches `.env.local`

**Issue: TypeScript errors**
- Run `npm run type-check` to see all errors
- Ensure all dependencies are installed
- Check `tsconfig.json` configuration

**Issue: Module not found errors**
- Delete `node_modules` and reinstall:
  ```bash
  rm -rf node_modules
  npm install
  ```

---

## 📚 Additional Documentation

- [SETUP-FIREBASE.md](./SETUP-FIREBASE.md) - Firebase configuration guide
- [SETUP-STRIPE.md](./SETUP-STRIPE.md) - Stripe integration guide
- [API-REFERENCE.md](./API-REFERENCE.md) - Complete API documentation
- [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) - Firestore schema details
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide

---

## 🤝 Contributing

This is a private project for TIPU Academy. For questions or issues:

1. Check existing documentation
2. Review CLAUDE.MD in the root directory
3. Contact the development team

---

## 📝 Environment Variables Reference

See `.env.example` for a complete list of required environment variables.

**Required:**
- Firebase configuration (7 variables)
- Stripe keys (3 variables)
- Email service API key (1 variable)

**Optional:**
- Analytics keys
- Error tracking (Sentry)

---

## 🎯 Next Steps

After setup is complete:

1. **Create test accounts** for each role
2. **Test the booking flow** (student → tutor → payment)
3. **Test real-time chat** (tutor ↔ student)
4. **Upload a test resource** (tutor dashboard)
5. **Review admin dashboard** (user management, revenue)

For detailed feature implementation, refer to `CLAUDE.MD` in the root directory.

---

**Happy coding! 🚀**

For questions or support, contact: [your-email@example.com]
