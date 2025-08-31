# 🚀 Deployment Guide

This guide will walk you through deploying your Attendee Check-In app to the web so your team can access it from anywhere.

## 📋 **Prerequisites**

Before deploying, make sure you have:
- ✅ Google Sheets API configured
- ✅ Service account credentials ready
- ✅ Your Google Sheet ID
- ✅ Git repository (optional but recommended)

## 🌐 **Option 1: Heroku (Recommended)**

### **Step 1: Install Heroku CLI**
```bash
# macOS
brew install heroku/brew/heroku

# Windows
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

### **Step 2: Login to Heroku**
```bash
heroku login
```

### **Step 3: Create Heroku App**
```bash
# Create a new app
heroku create your-app-name-here

# Or use existing app
heroku git:remote -a your-app-name-here
```

### **Step 4: Set Environment Variables**
```bash
# Set your Google Sheet ID
heroku config:set GOOGLE_SHEET_ID=your_actual_sheet_id_here

# Set your Google service account credentials (copy the entire JSON content)
heroku config:set GOOGLE_APPLICATION_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# Set sheet range (optional)
heroku config:set GOOGLE_SHEET_RANGE=Sheet1!A:Z

# Set environment
heroku config:set NODE_ENV=production
```

### **Step 5: Deploy**
```bash
# Add all files to git
git add .
git commit -m "Deploy to Heroku"

# Push to Heroku
git push heroku main

# Open your app
heroku open
```

### **Step 6: Verify Deployment**
- Check the logs: `heroku logs --tail`
- Test the app: Visit your Heroku URL
- Share with your team!

---

## 🚂 **Option 2: Railway**

### **Step 1: Connect to Railway**
1. Go to [Railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Choose "Deploy from GitHub repo"

### **Step 2: Configure Environment**
In your Railway project dashboard:
1. Go to "Variables" tab
2. Add these environment variables:
   ```
   GOOGLE_SHEET_ID=your_actual_sheet_id_here
   GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}
   GOOGLE_SHEET_RANGE=Sheet1!A:Z
   NODE_ENV=production
   ```

### **Step 3: Deploy**
1. Railway will automatically detect your app
2. Click "Deploy"
3. Wait for deployment to complete
4. Get your public URL

---

## 🎨 **Option 3: Render**

### **Step 1: Connect to Render**
1. Go to [Render.com](https://render.com)
2. Sign in with GitHub
3. Click "New +"
4. Choose "Web Service"

### **Step 2: Configure Service**
1. **Name**: `attendee-checkin`
2. **Environment**: `Node`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. **Plan**: Free

### **Step 3: Set Environment Variables**
In the "Environment" section, add:
```
GOOGLE_SHEET_ID=your_actual_sheet_id_here
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}
GOOGLE_SHEET_RANGE=Sheet1!A:Z
NODE_ENV=production
```

### **Step 4: Deploy**
1. Click "Create Web Service"
2. Wait for deployment
3. Get your public URL

---

## 🔐 **Important: Google Credentials Setup**

### **For Production Deployment**
Instead of using a `credentials.json` file, you'll need to:

1. **Copy the JSON content** from your `credentials.json` file
2. **Set it as an environment variable** in your deployment platform
3. **Update the server code** to handle string-based credentials

### **Update Server Code for Production**
Add this to your `server.js` before the Google Auth initialization:

```javascript
// Handle credentials from environment variable (production) or file (development)
let credentials;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('{')) {
    // Production: Parse JSON from environment variable
    credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
} else {
    // Development: Use credentials file
    credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json';
}

// Initialize Google Auth
let auth = null;
let sheets = null;
if (SHEET_ID && credentials) {
    try {
        if (typeof credentials === 'string') {
            // File path
            auth = new google.auth.GoogleAuth({
                keyFile: credentials,
                scopes: SCOPES,
            });
        } else {
            // JSON object
            auth = new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: SCOPES,
            });
        }
        sheets = google.sheets({ version: 'v4' });
        console.log('✅ Google Sheets integration enabled with write access');
    } catch (error) {
        console.log('⚠️  Google Sheets credentials not found, using demo mode');
    }
}
```

---

## 🌍 **Option 4: Vercel (Alternative)**

### **Step 1: Install Vercel CLI**
```bash
npm i -g vercel
```

### **Step 2: Deploy**
```bash
vercel
```

### **Step 3: Set Environment Variables**
```bash
vercel env add GOOGLE_SHEET_ID
vercel env add GOOGLE_APPLICATION_CREDENTIALS
vercel env add GOOGLE_SHEET_RANGE
```

---

## 📱 **Team Access Setup**

### **After Deployment**
1. **Share the URL** with your team
2. **Test the app** from different devices
3. **Verify Google Sheets access** from the deployed app
4. **Set up team permissions** in Google Sheets if needed

### **Team Permissions in Google Sheets**
1. Open your Google Sheet
2. Click "Share" (top right)
3. Add team member emails
4. Set appropriate permissions:
   - **Viewers**: Can see attendance data
   - **Commenters**: Can add notes
   - **Editors**: Can modify data (use with caution)

---

## 🔍 **Troubleshooting Deployment**

### **Common Issues**

1. **"Build failed"**
   - Check your `package.json` scripts
   - Ensure all dependencies are listed
   - Verify Node.js version compatibility

2. **"Environment variables not set"**
   - Double-check variable names
   - Ensure JSON credentials are properly formatted
   - Restart the app after setting variables

3. **"Google Sheets API errors"**
   - Verify service account has correct permissions
   - Check if API is enabled in Google Cloud Console
   - Ensure sheet is shared with service account

4. **"App crashes on startup"**
   - Check deployment logs
   - Verify all environment variables are set
   - Test locally with the same configuration

### **Debug Commands**

```bash
# Heroku
heroku logs --tail

# Railway
railway logs

# Render
# Check dashboard logs

# Local testing
NODE_ENV=production npm start
```

---

## 🎯 **Next Steps After Deployment**

1. **Test the app** thoroughly
2. **Share with your team**
3. **Monitor usage and performance**
4. **Set up monitoring** (optional)
5. **Configure custom domain** (optional)

---

## 📞 **Need Help?**

- **Heroku**: [Dev Center](https://devcenter.heroku.com/)
- **Railway**: [Documentation](https://docs.railway.app/)
- **Render**: [Documentation](https://render.com/docs)
- **Vercel**: [Documentation](https://vercel.com/docs)

---

**Happy Deploying! 🚀** 