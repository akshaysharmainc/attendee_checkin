# Google Sheets Setup Guide

This guide will walk you through setting up Google Sheets integration for your Attendee Check-In app with **real-time updates**.

## ⚠️ **Important Update**
The app now **automatically updates your Google Sheet** when attendees check in/out! This means:
- ✅ Check-in status is written to a new column
- ✅ Check-in timestamps are recorded
- ✅ Your sheet stays synchronized with the app
- ✅ Data persists even after server restarts

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "Attendee Check-In App")
5. Click "Create"

## Step 2: Enable Google Sheets API

1. In your new project, go to "APIs & Services" > "Library"
2. Search for "Google Sheets API"
3. Click on "Google Sheets API"
4. Click "Enable"

## Step 3: Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - **Service account name**: `attendee-checkin-service`
   - **Service account ID**: Will auto-generate
   - **Description**: `Service account for attendee check-in app with write access`
4. Click "Create and Continue"
5. **IMPORTANT**: For "Grant this service account access to project", select **"Editor"** (this is required for writing to sheets)
6. Click "Continue"
7. Click "Done"

## Step 4: Generate Service Account Key

1. In the credentials page, find your new service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create new key"
5. Select "JSON" format
6. Click "Create"
7. The JSON file will download automatically
8. **Rename this file to `credentials.json`** and place it in your project root

## Step 5: Prepare Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new spreadsheet
3. Name it something like "Event Attendees"
4. In the first row, add your column headers. Here's a recommended structure:

```
| Name | Company | Email | Phone | Title | Department | Dietary Restrictions | Notes |
|------|---------|-------|-------|-------|------------|---------------------|-------|
| John Doe | Acme Corp | john@acme.com | +1-555-0123 | Manager | Sales | None | VIP |
| Jane Smith | Tech Inc | jane@tech.com | +1-555-0456 | Developer | Engineering | Vegetarian | Speaker |
```

5. Add your attendee data below the headers
6. **Important**: Copy the Sheet ID from the URL
   - The URL looks like: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit`
   - Copy the long string between `/d/` and `/edit`

## Step 6: Share the Sheet with Service Account

1. In your Google Sheet, click "Share" (top right)
2. Click "Add people and groups"
3. In the email field, paste your service account email (found in the credentials.json file)
4. **Set permission to "Editor"** (this is required for the app to write check-in data)
5. **Uncheck** "Notify people" (to avoid sending emails to the service account)
6. Click "Share"

## Step 7: Configure Environment Variables

1. Copy the `env.example` file to `.env`:
   ```bash
   cp env.example .env
   ```

2. Edit the `.env` file with your actual values:
   ```env
   GOOGLE_SHEET_ID=your_actual_sheet_id_here
   GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
   GOOGLE_SHEET_RANGE=Sheet1!A:Z
   PORT=3000
   ```

3. **Place credentials**:
   - Rename your downloaded service account JSON file to `credentials.json`
   - Place it in the project root directory

## Step 8: Test the Integration

1. Start your server:
   ```bash
   npm start
   ```

2. Open your browser to `http://localhost:3000`
3. Try searching for an attendee by typing a few letters
4. **Check in an attendee** - you should see new columns appear in your sheet!
5. **Check out an attendee** - the status will update in real-time

## 🆕 **New Features You'll See**

### Automatic Column Creation
When you first check in an attendee, the app will automatically add:
- **"Check-In Status"** column - shows "Checked In" or "Not Checked In"
- **"Check-In Time"** column - shows the exact timestamp

### Real-Time Updates
- Every check-in/out action updates your Google Sheet immediately
- Check-in timestamps are recorded with each action
- Your sheet becomes a live attendance tracker

### Data Persistence
- Check-in data persists in your sheet even after server restarts
- The app can sync existing check-in data from your sheet
- Perfect for events that span multiple days or sessions

## Troubleshooting

### "Failed to fetch attendees" Error

- **Check credentials**: Ensure `credentials.json` is in the project root
- **Verify sheet ID**: Double-check the sheet ID in your `.env` file
- **Check permissions**: Ensure the service account has **Editor** access to the sheet
- **API enabled**: Confirm Google Sheets API is enabled in your project

### "Missing required parameters: spreadsheetId" Error

- **Environment variables**: Check that your `.env` file is properly configured
- **Sheet ID**: Verify the `GOOGLE_SHEET_ID` is correct
- **File location**: Ensure `.env` is in the project root directory

### "Invalid credentials" Error

- **Service account**: Verify the service account exists and has the correct permissions
- **Key file**: Ensure the JSON key file is valid and not corrupted
- **Project**: Make sure you're using the correct Google Cloud project

### "Sheet not found" Error

- **Sheet ID**: Verify the sheet ID is correct
- **Sharing**: Ensure the sheet is shared with the service account email
- **Range**: Check that the `GOOGLE_SHEET_RANGE` in your `.env` is correct

### Check-in Updates Not Working

- **Permissions**: Ensure service account has **Editor** (not just Viewer) access
- **API scope**: The app now requires write access to sheets
- **Column creation**: The app will automatically create check-in columns if they don't exist

## Security Best Practices

1. **Never commit credentials**: Keep `credentials.json` and `.env` out of version control
2. **Minimal permissions**: The service account only needs Editor access to the specific sheet
3. **Regular rotation**: Consider rotating service account keys periodically
4. **Access control**: Only share the sheet with necessary people

## Sample Sheet Structure (After Check-ins)

Your sheet will automatically look like this after some check-ins:

| Name | Company | Email | Phone | Title | Department | Dietary Restrictions | Notes | Check-In Status | Check-In Time |
|------|---------|-------|-------|-------|------------|---------------------|-------|-----------------|---------------|
| John Doe | Acme Corporation | john.doe@acme.com | +1-555-0123 | Senior Manager | Sales | None | VIP Guest | Checked In | 2025-08-31T12:15:10.684Z |
| Jane Smith | Tech Innovations Inc | jane.smith@techinc.com | +1-555-0456 | Lead Developer | Engineering | Vegetarian | Speaker | Not Checked In | |
| Mike Johnson | Global Solutions | mike.j@globalsol.com | +1-555-0789 | Director | Marketing | Gluten-Free | Panelist | Checked In | 2025-08-31T12:20:15.123Z |

## Next Steps

Once your Google Sheets integration is working with write access:

1. **Test check-ins**: Try checking in a few attendees to see the sheet update
2. **Monitor columns**: Watch as new check-in columns are automatically created
3. **Export data**: Use the updated sheet for reports and analytics
4. **Share access**: Give event staff access to view the live attendance sheet

## API Endpoints

- `GET /api/attendees` - Get all attendees
- `GET /api/attendees/search?query=...` - Search attendees
- `POST /api/attendees/:id/checkin` - Check in/out attendee (now updates sheet!)
- `GET /api/attendance/summary` - Get attendance summary
- `POST /api/attendance/sync-from-sheet` - Sync existing check-in data from sheet

---

**Need help?** Check the main README.md file for additional troubleshooting steps. 