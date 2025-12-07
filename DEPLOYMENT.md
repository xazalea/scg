# Deployment Guide for SCG

## Quick Deploy to Vercel

### Step 1: Prepare Your Repository

1. Initialize git (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: SCG Cloud Shell"
   ```

2. Push to GitHub:
   ```bash
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

### Step 2: Set Up Google Cloud OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable APIs:
   - Cloud Shell API
   - Cloud Platform API
4. Go to "APIs & Services" > "Credentials"
5. Click "Create Credentials" > "OAuth client ID"
6. Choose "Web application"
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback` (for local testing)
   - `https://your-app.vercel.app/api/auth/callback` (for production - update after deployment)

### Step 3: Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables:
   - `GOOGLE_CLIENT_ID` - Your OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Your OAuth client secret
   - `NEXTAUTH_SECRET` - Generate a random string (you can use: `openssl rand -base64 32`)
   - `GOOGLE_CLOUD_PROJECT_ID` - Your GCP project ID (optional but recommended)
5. Click "Deploy"

### Step 4: Update OAuth Redirect URI

After deployment, update your Google OAuth redirect URI to match your Vercel URL:
- Go back to Google Cloud Console
- Update the redirect URI to: `https://your-app.vercel.app/api/auth/callback`

### Step 5: Test Your Deployment

1. Visit your Vercel URL
2. Click "Sign in with Google"
3. Complete the OAuth flow
4. You should be redirected to the Cloud Shell interface

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | Yes |
| `NEXTAUTH_SECRET` | Secret for JWT encryption | Yes |
| `NEXTAUTH_URL` | Your app URL (auto-set by Vercel) | Auto |
| `GOOGLE_CLOUD_PROJECT_ID` | GCP Project ID | No |

## Troubleshooting

### "Redirect URI mismatch" error
- Ensure the redirect URI in Google Cloud Console matches exactly: `https://your-app.vercel.app/api/auth/callback`
- Check for trailing slashes or protocol mismatches

### Cloud Shell iframe not loading
- Ensure you're using HTTPS (Vercel provides this automatically)
- Check browser console for iframe errors
- Verify the user is logged into Google in the same browser

### Token refresh issues
- Check that `NEXTAUTH_SECRET` is set correctly
- Verify OAuth scopes include `offline` access
- Ensure refresh tokens are being stored (check OAuth consent screen settings)

## Custom Domain Setup

1. In Vercel, go to your project settings
2. Add your custom domain
3. Update the OAuth redirect URI in Google Cloud Console to match
4. Redeploy if necessary

---

**Need help?** Check the main [README.md](./README.md) for more details.

