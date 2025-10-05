# Whop Next.js App Template

A comprehensive Whop application built with Next.js 15, featuring real-time member tracking, webhook processing, and churn prediction capabilities. This template provides a solid foundation for building Whop apps with authentication, database integration, and advanced member management features.

## 📋 Overview

This project is a **Member Retention Guard** application designed to help Whop community creators track member engagement and predict churn risk. The app integrates with Whop's ecosystem to provide real-time member status tracking, payment processing, and retention analytics.

### Key Capabilities

- **Real-time Member Tracking**: Monitor member status and engagement across Whop experiences
- **Webhook Processing**: Secure webhook handling for membership and payment events
- **Churn Prediction**: Track member inactivity and renewal patterns to identify at-risk members
- **Multi-Experience Support**: Handle multiple Whop experiences and companies
- **Secure Authentication**: Built-in Whop authentication with access control
- **Database Integration**: Supabase-powered data persistence with type-safe operations

## ✨ Features

### 🔐 Authentication & Access Control
- **Whop Integration**: Seamless authentication using Whop's SDK
- **Role-based Access**: Support for admin, customer, and no-access levels
- **Token Verification**: Secure user token validation
- **Company & Experience Scoping**: Granular access control per organization

### 📊 Member Management
- **Real-time Status Tracking**: Monitor member validity across experiences
- **Churn Proxy Metrics**: Track last activity, renewal counts, and engagement patterns
- **Webhook-driven Updates**: Automatic member status updates via secure webhooks
- **Member Analytics**: Dashboard views for member retention insights

### 🔄 Webhook Processing
- **Secure Signature Verification**: HMAC-SHA256 webhook validation
- **Event Handling**: Support for membership and payment events
- **Async Processing**: Non-blocking webhook processing with Vercel's `waitUntil`
- **Error Handling**: Comprehensive error handling and logging

### 🗄️ Database & Data Management
- **Supabase Integration**: Type-safe database operations
- **Member Schema**: Optimized schema for member tracking and churn prediction
- **Row Level Security**: Secure data access with RLS policies
- **Performance Indexing**: Optimized queries for large datasets

### 🎨 User Interface
- **Modern Design**: Clean, responsive UI with Tailwind CSS
- **Whop Theme**: Integrated Whop design system
- **Dashboard Views**: Company and experience-specific dashboards
- **Discover Page**: App showcase and success stories

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.3.2** - React framework with App Router
- **React 19.0.0** - UI library with latest features
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
- **Whop React Components** - Pre-built Whop UI components

### Backend & APIs
- **Next.js API Routes** - Serverless API endpoints
- **Whop SDK** - Official Whop API integration
- **Vercel Functions** - Serverless function deployment

### Database & Storage
- **Supabase** - PostgreSQL database with real-time features
- **Row Level Security (RLS)** - Database-level security
- **Type-safe Queries** - Generated TypeScript types

### Development Tools
- **Biome** - Fast linter and formatter
- **PNPM** - Efficient package manager
- **ESLint** - Code quality checks
- **PostCSS** - CSS processing

### Deployment & Infrastructure
- **Vercel** - Hosting and deployment platform
- **Whop Proxy** - Development proxy for local testing
- **Environment Variables** - Secure configuration management

## 🚀 Installation

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **PNPM** - Package manager (recommended)
- **Whop Developer Account** - For app configuration
- **Supabase Account** - For database hosting

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd whop-nextjs-app-template

# Install dependencies
pnpm install
```

### 2. Environment Configuration

Create a `.env.local` file in the project root:

```env
# Required: Whop App Configuration
NEXT_PUBLIC_WHOP_APP_ID=your_app_id_here
WHOP_API_KEY=your_api_key_here

# Optional: Agent User Configuration
NEXT_PUBLIC_WHOP_AGENT_USER_ID=your_agent_user_id_here
NEXT_PUBLIC_WHOP_COMPANY_ID=your_company_id_here

# Required: Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key

# Required: Webhook Security
WHOP_WEBHOOK_SECRET=your_webhook_secret_here
```

### 3. Database Setup

Run the database schema in your Supabase SQL Editor:

```sql
-- Create the members table
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'invalid',
    last_valid_at TIMESTAMPTZ,
    renewal_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add unique constraint
ALTER TABLE public.members
ADD CONSTRAINT unique_experience_user UNIQUE (experience_id, user_id);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_members_experience_id ON public.members (experience_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members (user_id);
CREATE INDEX IF NOT EXISTS idx_members_last_valid_at ON public.members (last_valid_at);

-- Enable Row Level Security
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY members_service_role_access ON public.members
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
```

### 4. Whop App Configuration

1. Go to your [Whop Developer Dashboard](https://whop.com/dashboard/developer/)
2. Create a new app
3. Configure hosting settings:
   - **Base URL**: Your domain (e.g., `https://your-app.vercel.app`)
   - **App path**: `/experiences/[experienceId]`
   - **Dashboard path**: `/dashboard/[companyId]`
   - **Discover path**: `/discover`
4. Set up webhook endpoints:
   - **Webhook URL**: `https://your-app.vercel.app/api/webhooks`
   - **Events**: `membership.went_valid`, `membership.went_invalid`, `payment.succeeded`

### 5. Start Development Server

```bash
# Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`

## 📖 Usage

### Basic App Structure

The app follows Next.js 15 App Router patterns with three main entry points:

```typescript
// Main landing page
app/page.tsx

// Experience-specific pages (for Whop users)
app/experiences/[experienceId]/page.tsx

// Company dashboard (for admins)
app/dashboard/[companyId]/page.tsx

// App discovery page
app/discover/page.tsx
```

### Authentication Example

```typescript
import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";

export default async function ProtectedPage() {
  const headersList = await headers();
  
  // Verify user token from Whop
  const { userId } = await whopSdk.verifyUserToken(headersList);
  
  // Get user information
  const user = await whopSdk.users.getUser({ userId });
  
  return <div>Welcome, {user.name}!</div>;
}
```

### Access Control Example

```typescript
// Check company access
const result = await whopSdk.access.checkIfUserHasAccessToCompany({
  userId,
  companyId,
});

if (result.hasAccess) {
  // User has admin access to company
  console.log(`Access level: ${result.accessLevel}`);
}

// Check experience access
const experienceResult = await whopSdk.access.checkIfUserHasAccessToExperience({
  userId,
  experienceId,
});

if (experienceResult.hasAccess) {
  // User has access to experience
  console.log(`Access level: ${experienceResult.accessLevel}`);
}
```

### Database Operations

```typescript
import { supabase } from "@/lib/supabase";

// Create a member record
const { data, error } = await supabase
  .from("members")
  .insert({
    experience_id: "exp_123",
    user_id: "user_456",
    status: "valid",
    last_valid_at: new Date().toISOString(),
    renewal_count: 1,
  });

// Query members by experience
const { data: members } = await supabase
  .from("members")
  .select("*")
  .eq("experience_id", "exp_123")
  .eq("status", "valid");

// Update member status
const { error } = await supabase
  .from("members")
  .update({ status: "invalid" })
  .eq("user_id", "user_456")
  .eq("experience_id", "exp_123");
```

### Webhook Handling

The app automatically processes Whop webhooks for member status updates:

```typescript
// Webhook events are handled automatically in app/api/webhooks/route.ts
// Supported events:
// - membership.went_valid: Member gains access
// - membership.went_invalid: Member loses access  
// - payment.succeeded: Payment processed (increments renewal_count)
```

### Testing Database Connection

```bash
# Test Supabase connection
curl http://localhost:3000/api/test-supabase \
  -H "Authorization: Bearer YOUR_WHOP_TOKEN"

# Create test member record
curl -X POST http://localhost:3000/api/test-supabase \
  -H "Content-Type: application/json" \
  -d '{"experience_id": "test_exp_123"}'
```

## 📁 Project Structure

```
whop-nextjs-app-template/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── test-supabase/        # Database testing endpoint
│   │   │   └── route.ts          # GET/POST for Supabase testing
│   │   └── webhooks/             # Webhook handlers
│   │       └── route.ts          # Whop webhook processing
│   ├── dashboard/                # Company dashboards
│   │   └── [companyId]/          # Dynamic company routes
│   │       └── page.tsx          # Company-specific dashboard
│   ├── discover/                 # App discovery
│   │   └── page.tsx              # App showcase page
│   ├── experiences/              # Experience pages
│   │   └── [experienceId]/       # Dynamic experience routes
│   │       └── page.tsx          # Experience-specific app
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout with WhopApp wrapper
│   └── page.tsx                  # Landing page
├── docs/                         # Documentation
│   ├── database/                 # Database documentation
│   │   └── database_structure.md # Schema and setup guide
│   └── webhooks/                 # Webhook documentation
│       ├── WEBHOOK_IMPLEMENTATION.md # Implementation details
│       └── WEBHOOK_TESTING.md    # Testing guide
├── lib/                          # Core utilities
│   ├── supabase.ts               # Supabase client configuration
│   └── whop-sdk.ts               # Whop SDK setup
├── models/                       # TypeScript interfaces
│   ├── index.ts                  # Model exports
│   └── members.ts                # Member data model
├── scripts/                      # Utility scripts
│   └── test-webhook.js           # Webhook testing script
├── utils/                        # Helper functions
│   ├── authUtils.ts              # Authentication utilities
│   └── index.ts                  # Utility exports
├── .env.local                    # Environment variables (create this)
├── biome.json                    # Biome linter configuration
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies and scripts
├── pnpm-lock.yaml               # Lock file
├── postcss.config.mjs           # PostCSS configuration
├── tailwind.config.ts           # Tailwind CSS configuration
└── tsconfig.json                # TypeScript configuration
```

### Key Files Explained

- **`app/layout.tsx`**: Root layout with WhopApp wrapper for authentication
- **`app/page.tsx`**: Landing page with setup instructions
- **`app/experiences/[experienceId]/page.tsx`**: Main app interface for Whop users
- **`app/dashboard/[companyId]/page.tsx`**: Admin dashboard for company management
- **`app/api/webhooks/route.ts`**: Webhook handler for member status updates
- **`lib/whop-sdk.ts`**: Whop SDK configuration and initialization
- **`lib/supabase.ts`**: Supabase client with type-safe database operations
- **`models/members.ts`**: TypeScript interface for member data
- **`docs/`**: Comprehensive documentation for database and webhook setup

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start development server with Whop proxy
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run linter

# Testing
node scripts/test-webhook.js valid     # Test membership.went_valid webhook
node scripts/test-webhook.js invalid   # Test membership.went_invalid webhook
node scripts/test-webhook.js payment   # Test payment.succeeded webhook
```

### Code Quality

- **TypeScript**: Full type safety with strict mode
- **Biome**: Fast linting and formatting
- **ESLint**: Additional code quality checks
- **Prettier**: Code formatting (via Biome)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_WHOP_APP_ID` | ✅ | Whop app identifier |
| `WHOP_API_KEY` | ✅ | Whop API key for server-side requests |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_KEY` | ✅ | Supabase service role key |
| `WHOP_WEBHOOK_SECRET` | ✅ | Webhook signature verification secret |
| `NEXT_PUBLIC_WHOP_AGENT_USER_ID` | ⚠️ | Agent user ID for API requests |
| `NEXT_PUBLIC_WHOP_COMPANY_ID` | ⚠️ | Default company ID for API requests |

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository**:
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard
   - Deploy!

3. **Update Whop Settings**:
   - Update webhook URLs to production domain
   - Configure app paths in Whop dashboard
   - Test webhook delivery

### Environment Setup

Ensure all environment variables are configured in your deployment platform:

```env
# Production environment variables
NEXT_PUBLIC_WHOP_APP_ID=prod_app_id
WHOP_API_KEY=prod_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=prod_service_role_key
WHOP_WEBHOOK_SECRET=prod_webhook_secret
```

## 🧪 Testing

### Webhook Testing

```bash
# Test webhook signature generation
export WHOP_WEBHOOK_SECRET="your_secret"
node scripts/test-webhook.js valid

# Test invalid signature
node scripts/test-webhook.js valid --test-invalid
```

### Database Testing

```bash
# Test Supabase connection
curl http://localhost:3000/api/test-supabase

# Create test member
curl -X POST http://localhost:3000/api/test-supabase \
  -H "Content-Type: application/json" \
  -d '{"experience_id": "test_123"}'
```

## 🐛 Troubleshooting

### Common Issues

**App not loading in Whop?**
- Verify app paths are correctly configured in Whop dashboard
- Check that `NEXT_PUBLIC_WHOP_APP_ID` matches your app ID
- Ensure your app is installed in the same organization

**Authentication errors?**
- Verify `WHOP_API_KEY` is correct and has proper permissions
- Check that `NEXT_PUBLIC_WHOP_AGENT_USER_ID` is valid
- Ensure user has access to the experience/company

**Database connection issues?**
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check that database schema is properly set up
- Test connection using `/api/test-supabase` endpoint

**Webhook not processing?**
- Verify `WHOP_WEBHOOK_SECRET` matches Whop dashboard
- Check webhook URL is correctly configured
- Ensure webhook events are subscribed in Whop dashboard
- Check server logs for signature verification errors

### Debug Mode

Enable debug logging by checking the console output:

```bash
# Development server shows detailed logs
pnpm dev

# Check webhook processing logs
tail -f /var/log/vercel/webhooks.log
```

## 📚 Additional Resources

- [Whop Developer Documentation](https://dev.whop.com/introduction)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vercel Deployment Guide](https://vercel.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` directory for detailed guides
- **Issues**: Open an issue on GitHub for bug reports
- **Discussions**: Use GitHub Discussions for questions and feature requests
- **Whop Support**: Contact Whop support for platform-specific issues

---

**Built with ❤️ using Next.js, Whop SDK, and Supabase**