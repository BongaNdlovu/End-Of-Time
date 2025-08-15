# Email Notification Setup

## Issue Fixed
The email notifications were not working because the Gmail SMTP configuration was using placeholder values instead of real credentials.

## What Was Fixed
1. **Removed placeholder values** - Stopped using 'your-email@gmail.com' and 'your-app-password' as fallbacks
2. **Added configuration validation** - Email functions now check if credentials are properly set
3. **Better error logging** - Clear error messages when email configuration is missing
4. **Improved error handling** - Failed emails are properly logged with specific error reasons

## Setting Up Email Notifications

### Prerequisites
- A Gmail account for sending notifications
- Gmail App Password (not your regular Gmail password)

### Step 1: Create Gmail App Password
1. Go to your Google Account settings
2. Enable 2-Factor Authentication if not already enabled
3. Go to Security → 2-Step Verification → App passwords
4. Generate a new app password for "Mail"
5. Save this 16-character password

### Step 2: Configure Firebase Functions Environment Variables

Run these commands in your terminal from the project root:

```bash
# Navigate to functions directory
cd functions

# Set your Gmail address
firebase functions:config:set email.user="your-actual-email@gmail.com"

# Set your Gmail app password (use the 16-character password from Step 1)
firebase functions:config:set email.pass="your-app-password-here"

# Deploy the updated configuration
firebase deploy --only functions
```

### Step 3: Update Environment Variables
The Cloud Functions now expect these environment variables:
- `EMAIL_USER` - Your Gmail address
- `EMAIL_PASS` - Your Gmail app password

### Step 4: Verify Setup
After deployment, email notifications should work properly. Check the Firebase Functions logs if issues persist:

```bash
firebase functions:log
```

## Security Notes
- Never commit real email credentials to version control
- Use environment variables for sensitive configuration
- The app password is different from your regular Gmail password
- App passwords are safer as they can be revoked without changing your main password

## Testing
After proper configuration, users who have enabled email notifications will receive:
- Prayer interaction notifications (when someone prays for their request)
- Comment notifications (when someone comments on their prayer)
- Weekly prayer summaries (if enabled)

## Troubleshooting
- If emails still don't work, check Firebase Functions logs for detailed error messages
- Ensure 2-Factor Authentication is enabled on your Gmail account
- Verify the app password is entered correctly (16 characters, no spaces)
- Make sure the Gmail account is not locked or suspended