# 🚀 Quick Deployment Alternatives (No Payment Verification Required)

Since Heroku now requires payment verification, here are **better alternatives** that are actually simpler and still free!

## 🌟 **Option 1: Railway (Recommended)**

### **Why Railway is Better:**
- ✅ **No payment verification required**
- ✅ **Free tier available**
- ✅ **Simpler deployment**
- ✅ **Automatic HTTPS**
- ✅ **Better performance than Heroku**

### **Step 1: Deploy to Railway**
1. Go to [Railway.app](https://railway.app)
2. Click "Start a New Project"
3. Choose "Deploy from GitHub repo"
4. Sign in with GitHub
5. Select your `attendee_checkin` repository
6. Click "Deploy Now"

### **Step 2: Set Environment Variables**
In your Railway project dashboard:
1. Go to "Variables" tab
2. Add these environment variables:

```
GOOGLE_SHEET_ID=your_actual_sheet_id_here
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
GOOGLE_SHEET_RANGE=Sheet1!A:Z
NODE_ENV=production
```

### **Step 3: Get Your URL**
- Railway will automatically deploy your app
- You'll get a URL like: `https://your-app-name.railway.app`
- Share this URL with your team!

---

## 🎨 **Option 2: Render (Also Excellent)**

### **Why Render is Great:**
- ✅ **No payment verification required**
- ✅ **Free tier available**
- ✅ **Very simple setup**
- ✅ **Automatic HTTPS**
- ✅ **Great performance**

### **Step 1: Deploy to Render**
1. Go to [Render.com](https://render.com)
2. Click "New +"
3. Choose "Web Service"
4. Connect your GitHub account
5. Select your `attendee_checkin` repository

### **Step 2: Configure Service**
- **Name**: `attendee-checkin`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free

### **Step 3: Set Environment Variables**
In the "Environment" section, add:
```
GOOGLE_SHEET_ID=your_actual_sheet_id_here
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
GOOGLE_SHEET_RANGE=Sheet1!A:Z
NODE_ENV=production
```

### **Step 4: Deploy**
- Click "Create Web Service"
- Wait for deployment (usually 2-3 minutes)
- Get your URL: `https://your-app-name.onrender.com`

---

## 🔐 **Google Credentials Setup (Important!)**

### **Step 1: Get Your Credentials**
1. Open your `credentials.json` file
2. **Copy ALL the content** (from the first `{` to the last `}`)
3. This will look like: `{"type":"service_account","project_id":"...",...}`

### **Step 2: Set Environment Variables**
In Railway/Render dashboard, set:
```
GOOGLE_APPLICATION_CREDENTIALS=PASTE_YOUR_ENTIRE_JSON_HERE
```

### **Step 3: Get Your Sheet ID**
1. Open your Google Sheet
2. Copy the ID from the URL:
   - URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit`
   - Copy: `YOUR_SHEET_ID_HERE`

---

## 🚀 **Deploy Right Now (Choose One)**

### **Railway (Recommended)**
1. Visit: [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Choose "Deploy from GitHub repo"
4. Follow the steps above

### **Render**
1. Visit: [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub and follow steps above

---

## ✅ **After Deployment**

1. **Test your app** at the provided URL
2. **Verify Google Sheets integration** works
3. **Test check-in functionality**
4. **Share the URL** with your team
5. **Test from different devices**

---

## 🎯 **Why These Are Better Than Heroku**

- **No payment verification** required
- **Faster deployment** (2-3 minutes vs 5-10 minutes)
- **Better free tier** limits
- **Simpler interface**
- **More reliable** performance
- **Automatic HTTPS** included

---

## 🆘 **Need Help?**

- **Railway**: Check their [documentation](https://docs.railway.app/)
- **Render**: Check their [documentation](https://render.com/docs)
- **Both platforms** have excellent support and community

---

**🎉 Choose Railway or Render and deploy your app in minutes!** 