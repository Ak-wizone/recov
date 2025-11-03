# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure these environment variables are set in your Replit Secrets:

**Required:**
- `DATABASE_URL` - Your PostgreSQL database connection string
- `SESSION_SECRET` - A secure random string for session encryption

**Optional (for features):**
- `PAYU_MERCHANT_KEY` - PayU payment gateway merchant key
- `PAYU_SALT_KEY` - PayU payment gateway salt key
- `PAYU_MODE` - PayU mode (test/production)

### 2. Build Process
The deployment automatically runs:
```bash
npm run build
```

This:
1. Builds the frontend (Vite) → `dist/public/`
2. Builds the backend (esbuild) → `dist/index.js`

### 3. Production Start
The deployment runs:
```bash
npm run start
```

Which executes: `NODE_ENV=production node dist/index.js`

## Common Issues & Solutions

### Issue: "Internal Server Error" after publishing

**Possible Causes:**

1. **Missing DATABASE_URL**
   - Error: `DATABASE_URL environment variable is not set in production`
   - Solution: Add DATABASE_URL to Replit Secrets

2. **Missing SESSION_SECRET**
   - Warning: Using default session secret
   - Solution: Add SESSION_SECRET to Replit Secrets with a random string

3. **Database Connection Failure**
   - Check if DATABASE_URL is correct
   - Verify database is accessible from production

### How to Check Production Logs

After publishing, check the deployment logs in Replit:
1. Go to the Deployments tab
2. Click on your latest deployment
3. View the logs for error messages

Look for these log messages:
- `[Production Mode] Starting server with production configuration` - Good!
- `[Startup Error] DATABASE_URL environment variable is not set` - Fix this!
- `[Server Error]` - Check the error details

## Production Error Logging

The server now logs detailed errors to help debug production issues:

```
[Server Error] {
  status: 500,
  message: "Error message here",
  stack: "Full error stack trace",
  NODE_ENV: "production"
}
```

## Security Checklist

✅ SESSION_SECRET is set (not using default)
✅ DATABASE_URL points to production database
✅ Secure cookies enabled in production
✅ HTTPS enforced (handled by Replit)

## Post-Deployment Verification

After publishing successfully:

1. ✅ Homepage loads without errors
2. ✅ Login works correctly
3. ✅ Database queries execute
4. ✅ Session persistence works
5. ✅ All API endpoints respond

## Need Help?

If you encounter issues:
1. Check deployment logs first
2. Verify all environment variables are set
3. Test database connectivity
4. Review error messages in logs
