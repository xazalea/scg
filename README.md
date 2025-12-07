# SCG - Free Cloud Shell

**Powered by Magic ✨**

A free cloud shell service that provides instant access to Google Cloud Shell with seamless authentication.

## Features

- 🔐 **Secure Authentication**: Google OAuth2 with automatic token refresh
- ⚡ **Instant Access**: No setup required, just sign in and start coding
- 🎨 **Beautiful UI**: Modern, responsive design with magical branding
- 🔄 **Auto Token Refresh**: Seamless session management
- ☁️ **Vercel Ready**: Optimized for serverless deployment

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Project with OAuth2 credentials
- Vercel account (for deployment)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd gcloud
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Google OAuth**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Cloud Shell API
   - Go to "APIs & Services" > "Credentials"
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `http://localhost:3000/api/auth/callback` (for local)
   - Add authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback` (for production)

4. **Set up environment variables**

   Create a `.env.local` file:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_random_secret_here
   GOOGLE_CLOUD_PROJECT_ID=your_project_id_here
   ```

   For Vercel deployment, add these in your project settings under "Environment Variables".

5. **Run locally**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in project settings
   - Deploy!

   The `NEXTAUTH_URL` will be automatically set by Vercel, but you can override it if needed.

## Architecture

### Authentication Flow

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. After consent, callback receives authorization code
4. Exchange code for access and refresh tokens
5. Store tokens in encrypted session cookie
6. Use access token to authenticate Cloud Shell iframe

### Token Refresh

- Tokens are automatically refreshed when expired (within 5 minutes of expiry)
- Refresh happens transparently via `/api/auth/token` endpoint
- Session cookies are updated with new tokens

### API Routes

- `GET /api/auth/login` - Get Google OAuth URL
- `GET /api/auth/callback` - Handle OAuth callback
- `GET /api/auth/token` - Get or refresh access token
- `POST /api/auth/logout` - Clear session

## Important Notes

### Cloud Shell Embedding

Google Cloud Shell is embedded via iframe. For the iframe to work properly:

1. **User must be logged into Google**: The iframe requires the user to have an active Google session in the same browser
2. **HTTPS Required**: In production, the site must be served over HTTPS (Vercel handles this automatically)
3. **Same-Origin Policy**: The iframe may show a login prompt if the user's Google session has expired

### Authentication Flow

The authentication works as follows:
1. User clicks "Sign in with Google"
2. OAuth flow authenticates the user and grants necessary permissions
3. Access and refresh tokens are stored in an encrypted session cookie
4. The Cloud Shell iframe uses the user's Google session (established via OAuth)
5. Tokens are automatically refreshed when needed

## Security Considerations

- Session tokens are encrypted using JWT with HS256
- HTTP-only cookies prevent XSS attacks
- Secure flag enabled in production
- Tokens are refreshed automatically to minimize exposure
- OAuth scopes limited to necessary permissions
- All API routes are protected with session verification

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Google Auth Library** - OAuth2 authentication
- **JOSE** - JWT token handling
- **Vercel** - Serverless deployment platform

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Made with ✨ magic**

