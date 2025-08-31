# 🚀 Quick Deployment Checklist

## ✅ **Pre-Deployment Checklist**

- [ ] Google Sheets API enabled
- [ ] Service account created with Editor permissions
- [ ] Google Sheet shared with service account
- [ ] `credentials.json` file ready
- [ ] Git repository initialized (optional but recommended)

## 🌐 **Option 1: Heroku (Recommended)**

### **Step 1: Install & Setup**
```bash
# Install Heroku CLI
brew install heroku/brew/heroku  # macOS
# or download from: https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login
```

### **Step 2: Deploy**
```bash
# Use the deployment script
./deploy-heroku.sh your-app-name-here

# Or deploy manually:
heroku create your-app-name-here
git push heroku main
```

### **Step 3: Set Environment Variables**
```bash
# Copy your Google Sheet ID from the URL
heroku config:set GOOGLE_SHEET_ID=your_actual_sheet_id_here

# Copy the ENTIRE content of your credentials.json file
heroku config:set GOOGLE_APPLICATION_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# Set other variables
heroku config:set GOOGLE_SHEET_RANGE=Sheet1!A:Z
heroku config:set NODE_ENV=production
```

### **Step 4: Test & Share**
- [ ] Visit your app: `https://your-app-name.herokuapp.com`
- [ ] Test search functionality
- [ ] Test check-in functionality
- [ ] Share URL with your team

---

## 🚂 **Option 2: Railway (Simpler)**

### **Step 1: Deploy**
1. Go to [Railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository

### **Step 2: Set Environment Variables**
In Railway dashboard → Variables tab:
```
GOOGLE_SHEET_ID=your_actual_sheet_id_here
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}
GOOGLE_SHEET_RANGE=Sheet1!A:Z
NODE_ENV=production
```

### **Step 3: Deploy & Test**
- [ ] Click "Deploy"
- [ ] Wait for completion
- [ ] Test your app
- [ ] Share the URL

---

## 🎨 **Option 3: Render (Also Simple)**

### **Step 1: Deploy**
1. Go to [Render.com](https://render.com)
2. Sign in with GitHub
3. Click "New +" → "Web Service"
4. Connect your repository

### **Step 2: Configure**
- **Name**: `attendee-checkin`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free

### **Step 3: Set Environment Variables**
In Environment section:
```
GOOGLE_SHEET_ID=your_actual_sheet_id_here
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}
GOOGLE_SHEET_RANGE=Sheet1!A:Z
NODE_ENV=production
```

---

## 🔐 **Google Credentials Setup**

### **For Production**
1. **Open your `credentials.json` file**
2. **Copy ALL the content** (from `{` to `}`)
3. **Set as environment variable** in your deployment platform
4. **Remove `credentials.json`** from your repository (security)

### **Example Environment Variable**
```
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"my-project","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"service@my-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/service%40my-project.iam.gserviceaccount.com"}
```

---

## 🧪 **Testing After Deployment**

### **Basic Functionality**
- [ ] App loads without errors
- [ ] Search functionality works
- [ ] Check-in checkboxes work
- [ ] Attendance summary updates

### **Google Sheets Integration**
- [ ] Attendee data loads from sheet
- [ ] Check-ins update the sheet
- [ ] New columns are created automatically
- [ ] Sync button works

### **Team Access**
- [ ] Test from different devices
- [ ] Test from different networks
- [ ] Share URL with team members
- [ ] Verify team can access the app

---

## 🚨 **Common Issues & Solutions**

### **"Build failed"**
- Check `package.json` scripts
- Verify all dependencies are listed
- Check Node.js version compatibility

### **"Environment variables not set"**
- Double-check variable names
- Ensure JSON credentials are properly formatted
- Restart the app after setting variables

### **"Google Sheets API errors"**
- Verify service account has Editor permissions
- Check if API is enabled in Google Cloud Console
- Ensure sheet is shared with service account

### **"App crashes on startup"**
- Check deployment logs
- Verify all environment variables are set
- Test locally with the same configuration

---

## 📱 **After Successful Deployment**

1. **Share the URL** with your team
2. **Test thoroughly** from different devices
3. **Monitor usage** and performance
4. **Set up team permissions** in Google Sheets if needed
5. **Consider custom domain** for professional appearance

---

## 🆘 **Need Help?**

- **Heroku**: `heroku logs --tail -a your-app-name`
- **Railway**: Check dashboard logs
- **Render**: Check dashboard logs
- **General**: Check browser console and network tab

---

**🎉 You're ready to deploy! Choose your platform and follow the steps above.** 