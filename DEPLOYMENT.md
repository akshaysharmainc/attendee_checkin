# Deployment Guide

This guide covers multiple ways to deploy the Attendee Check-In app for your team.

## Quick Comparison

| Platform | Difficulty | Cost | Best For |
|----------|-----------|------|-----------|
| **Railway** | ⭐ Easy | Free tier available | Quick deployment, team sharing |
| **Render** | ⭐ Easy | Free tier available | Simple deployments |
| **Heroku** | ⭐⭐ Medium | Paid | Established platform |
| **Docker** | ⭐⭐⭐ Medium | Varies | Full control, any server |
| **VPS/Cloud** | ⭐⭐⭐⭐ Hard | Varies | Maximum control |

---

## Option 1: Railway (Recommended - Easiest)

Railway is the easiest option with a free tier and great team features.

### Steps:

1. **Sign up**: Go to [railway.app](https://railway.app) and sign up with GitHub

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Environment Variables**:
   - Go to your project → Variables tab
   - Add these variables:
     ```
     GOOGLE_SHEET_ID=your_sheet_id_here
     GOOGLE_APPLICATION_CREDENTIALS=<paste entire JSON content>
     GOOGLE_SHEET_RANGE=Sheet1!A:Z
     PORT=3000
     ```
   - For credentials: Copy the entire contents of your `credentials.json` file and paste it as the value

4. **Deploy**:
   - Railway will automatically detect your `package.json` and deploy
   - It will run `npm install` and `npm start`
   - Your app will be live at `https://your-app-name.up.railway.app`

5. **Share with Team**:
   - Add team members in Railway dashboard
   - Share the URL with your team
   - Each team member can use their own Google Sheet by setting their own environment variables

### Pros:
- ✅ Free tier (500 hours/month)
- ✅ Automatic deployments from GitHub
- ✅ Easy environment variable management
- ✅ Built-in HTTPS
- ✅ Team collaboration features

---

## Option 2: Render

Similar to Railway, great free tier.

### Steps:

1. **Sign up**: Go to [render.com](https://render.com) and sign up

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repo

3. **Configure**:
   - **Name**: `attendee-checkin` (or your choice)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for more resources)

4. **Set Environment Variables**:
   - Go to Environment tab
   - Add:
     ```
     GOOGLE_SHEET_ID
     GOOGLE_APPLICATION_CREDENTIALS (paste JSON)
     GOOGLE_SHEET_RANGE
     PORT=3000
     ```

5. **Deploy**:
   - Click "Create Web Service"
   - Render will build and deploy automatically
   - Your app will be at `https://your-app-name.onrender.com`

### Pros:
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Easy setup
- ✅ Auto-deploy from Git

---

## Option 3: Heroku

Classic platform, requires credit card for free tier.

### Steps:

1. **Install Heroku CLI**: [heroku.com/cli](https://devcenter.heroku.com/articles/heroku-cli)

2. **Login**:
   ```bash
   heroku login
   ```

3. **Create App**:
   ```bash
   heroku create your-app-name
   ```

4. **Set Environment Variables**:
   ```bash
   heroku config:set GOOGLE_SHEET_ID=your_sheet_id
   heroku config:set GOOGLE_APPLICATION_CREDENTIALS="$(cat credentials.json)"
   heroku config:set GOOGLE_SHEET_RANGE=Sheet1!A:Z
   ```

5. **Deploy**:
   ```bash
   git push heroku main
   ```

6. **Open**:
   ```bash
   heroku open
   ```

### Pros:
- ✅ Well-established platform
- ✅ Good documentation
- ✅ Add-ons available

---

## Option 4: Docker Deployment

Deploy anywhere Docker runs (AWS, DigitalOcean, your own server, etc.)

### Steps:

1. **Build Docker Image**:
   ```bash
   docker build -t attendee-checkin .
   ```

2. **Run Container**:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e GOOGLE_SHEET_ID=your_sheet_id \
     -e GOOGLE_APPLICATION_CREDENTIALS="$(cat credentials.json)" \
     -e GOOGLE_SHEET_RANGE=Sheet1!A:Z \
     --name attendee-checkin \
     attendee-checkin
   ```

3. **For Production** (with docker-compose):
   Create `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - GOOGLE_SHEET_ID=${GOOGLE_SHEET_ID}
         - GOOGLE_APPLICATION_CREDENTIALS=${GOOGLE_APPLICATION_CREDENTIALS}
         - GOOGLE_SHEET_RANGE=${GOOGLE_SHEET_RANGE}
         - PORT=3000
       restart: unless-stopped
   ```

   Then run:
   ```bash
   docker-compose up -d
   ```

### Pros:
- ✅ Works anywhere Docker runs
- ✅ Consistent environment
- ✅ Easy to scale

---

## Option 5: VPS/Cloud Server (DigitalOcean, AWS, etc.)

Full control over your deployment.

### Steps:

1. **Create Server**:
   - DigitalOcean Droplet, AWS EC2, or similar
   - Ubuntu 22.04 recommended
   - Minimum: 1GB RAM, 1 CPU

2. **SSH into Server**:
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install PM2** (process manager):
   ```bash
   sudo npm install -g pm2
   ```

5. **Clone and Setup**:
   ```bash
   git clone https://github.com/your-username/attendee-checkin.git
   cd attendee-checkin
   npm install
   npm run build
   ```

6. **Create .env file**:
   ```bash
   nano .env
   # Add your environment variables
   ```

7. **Start with PM2**:
   ```bash
   pm2 start server.js --name attendee-checkin
   pm2 save
   pm2 startup
   ```

8. **Setup Nginx** (reverse proxy):
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/attendee-checkin
   ```

   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable:
   ```bash
   sudo ln -s /etc/nginx/sites-available/attendee-checkin /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

9. **Setup SSL** (Let's Encrypt):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Pros:
- ✅ Full control
- ✅ Can be cheaper at scale
- ✅ Custom configuration

---

## Important Notes for Team Sharing

### Option A: Shared Instance (One Deployment)
- Deploy once with one Google Sheet
- Share the URL with your team
- Everyone uses the same sheet
- **Best for**: Single event, shared data

### Option B: Individual Instances (Multiple Deployments)
- Each team member deploys their own instance
- Each uses their own Google Sheet
- Each sets their own environment variables
- **Best for**: Different events, separate data

### Option C: Multi-Tenant (Advanced)
- One deployment, multiple Google Sheets
- Requires code changes to support tenant routing
- **Best for**: SaaS model

---

## Post-Deployment Checklist

- [ ] Test the health endpoint: `https://your-app.com/api/health`
- [ ] Verify Google Sheets connection works
- [ ] Test check-in functionality
- [ ] Share URL with team
- [ ] Document the URL and any access requirements
- [ ] Set up monitoring (optional but recommended)

---

## Troubleshooting

### App shows "Demo Mode"
- Check environment variables are set correctly
- Verify credentials JSON is valid
- Check `/api/health` endpoint for details

### Build fails
- Ensure `npm run build` works locally first
- Check Node.js version (needs >= 18.0.0)
- Review build logs in deployment platform

### Can't connect to Google Sheets
- Verify service account has access to the sheet
- Check sheet ID is correct
- Ensure credentials are properly formatted

---

## Recommended: Railway for Quick Start

For most teams, **Railway** is the best starting point:
- ✅ Fastest setup (5 minutes)
- ✅ Free tier
- ✅ Great for teams
- ✅ Automatic HTTPS
- ✅ Easy environment variable management

Get started: [railway.app](https://railway.app)

