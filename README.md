# Whop Next.js App Template

A beginner-friendly Whop app built with Next.js, featuring authentication and easy expansion capabilities.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set Up Environment Variables
Create a `.env.local` file in the root directory with your Whop credentials:

```env
# Required: Get these from your Whop dashboard
NEXT_PUBLIC_WHOP_APP_ID=your_app_id_here
WHOP_API_KEY=your_api_key_here

# Optional: For advanced features
NEXT_PUBLIC_WHOP_AGENT_USER_ID=your_agent_user_id_here
NEXT_PUBLIC_WHOP_COMPANY_ID=your_company_id_here
```

### 3. Create Your Whop App
1. Go to your [Whop Developer Dashboard](https://whop.com/dashboard/developer/)
2. Create a new app
3. In the "Hosting" section, configure:
   - **Base URL**: Your domain (e.g., `https://your-app.vercel.app`)
   - **App path**: `/experiences/[experienceId]`
   - **Dashboard path**: `/dashboard/[companyId]`
   - **Discover path**: `/discover`

### 4. Run Development Server
```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

### 5. Test Your App
1. Go to a Whop in the same organization as your app
2. Navigate to the "Tools" section
3. Add your app
4. Test the integration

## 🚀 Deploying

### Deploy to Vercel (Recommended)
1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com/new) and import your repository
3. Add your environment variables in Vercel's dashboard
4. Deploy!

### Update Whop Settings
After deployment, update your Whop app settings:
- **Base URL**: Your deployed domain (e.g., `https://your-app.vercel.app`)
- **Webhook URLs**: Update if needed

## 🛠️ Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── discover/          # Discover page
│   └── experiences/       # Experience pages
├── lib/                   # Utilities and SDK setup
│   └── whop-sdk.ts        # Whop SDK configuration
└── .env.local            # Environment variables (create this)
```

## 🔧 Key Features

- **Authentication**: Built-in Whop authentication
- **Dashboard**: Company-specific dashboard pages
- **Experiences**: Dynamic experience pages
- **API Integration**: Ready-to-use Whop SDK
- **TypeScript**: Full TypeScript support
- **Tailwind CSS**: Modern styling framework

## 🐛 Troubleshooting

**App not loading?**
- Ensure "App path" is set to `/experiences/[experienceId]` in your Whop dashboard
- Check that your environment variables are correct

**Authentication issues?**
- Verify your `NEXT_PUBLIC_WHOP_APP_ID` and `WHOP_API_KEY` are correct
- Make sure your app is added to a Whop in the same organization

**Need help?**
- Check the [Whop Developer Docs](https://dev.whop.com/introduction)
- Review the template code in `/app` and `/lib` directories

## 🎯 Next Steps

1. **Customize the UI**: Modify components in `/app` directory
2. **Add Features**: Extend the SDK usage in `/lib/whop-sdk.ts`
3. **Create API Routes**: Add new endpoints in `/app/api`
4. **Style Your App**: Customize Tailwind classes and add your branding

Happy coding! 🎉
