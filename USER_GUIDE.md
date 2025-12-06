# Attendee Check-In App - User Guide

Welcome to the Attendee Check-In App! This guide will help you use the app to check in attendees at your event.

## Getting Started

### Understanding the Parameters

Before setting up the app, you need to understand what information is required:

#### 1. Sheet ID (Required)

**What it is:**
- A unique identifier for your Google Sheet

**Where to find it:**
1. Open your Google Sheet in your web browser
2. Look at the address bar at the top of your browser
3. You'll see a URL that looks like this:
   ```
   https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
   ```
4. The Sheet ID is the long string of letters, numbers, and characters between `/d/` and `/edit`
   - In the example above, the Sheet ID is: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
5. Copy this entire string (it's usually about 44 characters long)

**Example:**
- Full URL: `https://docs.google.com/spreadsheets/d/ABC123XYZ789/edit`
- Sheet ID: `ABC123XYZ789`

#### 2. Sheet Range (Optional)

**What it is:**
- Tells the app which part of your sheet to read
- Specifies which sheet tab and which columns to use
- Default value is `Sheet1!A:Z` which means "use the Sheet1 tab, columns A through Z"

**When to change it:**
- If your data is in a different sheet tab (not "Sheet1")

**How to format it:**
- Format: `SheetName!Columns`
- Examples:
  - `Sheet1!A:Z` - Sheet1 tab, columns A to Z (26 columns)
  - `Attendees!A:AA` - Attendees tab, columns A to AA (27 columns)
  - `Data!A:Z` - Data tab, columns A to Z

**Where to find it:**
- Look at the bottom of your Google Sheet for the tab names
- The default tab is usually called "Sheet1"
- If you renamed it, use the new name
- For columns, A-Z covers 26 columns (usually enough)

**Default value:** `Sheet1!A:Z`

#### 3. Webhook URL (Optional)

**What it is:**
- A special URL that receives notifications when someone checks in
- Only needed if you have a Google Apps Script set up to do something when attendees check in

**When you need it:**
- If you have automated processes that should run when someone checks in
- If you want to send notifications to another system

**Where to find it:**
- Your IT administrator or event coordinator will provide this
- It usually looks like: `https://script.google.com/macros/s/.../exec`
- If you don't have one, you can leave this field empty

**Default value:** Leave empty (not required for basic check-in functionality)

### Setting Up the App

You have **two ways** to configure the app:

#### Method 1: Using the Configuration Screen

When you first open the app, you'll see a configuration screen:

1. **Enter your Sheet ID** (required)
   - Paste the Sheet ID you copied from your Google Sheet URL
   - Make sure there are no extra spaces before or after

2. **Enter Sheet Range** (optional)
   - Leave as `Sheet1!A:Z` unless you know you need something different
   - If your sheet uses a different tab name, change "Sheet1" to match

3. **Enter Webhook URL** (optional)
   - Only fill this in if you were given a webhook URL

4. Click **Connect** to save your settings

**Note:** Your settings are saved in your browser, so you won't need to enter them again unless you clear your browser data or use a different browser.


#### Method 2: Using URL Parameters (Preferred for Sharing or Quick Setup)

You can also configure the app by adding parameters to the web address (URL). This is useful if:
- You want to share a link that automatically opens with specific settings
- You're setting up the app on multiple devices

**How to use URL parameters:**

1. Start with your app's base URL (e.g., `https://your-app.com` or `http://localhost:3000`)

2. Add a question mark `?` after the URL

3. Add your parameters separated by `&`:
   ```
   ?sheetId=YOUR_SHEET_ID&range=Sheet1!A:Z&webhookUrl=YOUR_WEBHOOK_URL
   ```

**Complete URL examples:**

**Basic setup (just Sheet ID):**
```
https://your-app.com?sheetId=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

**With Sheet ID and Range:**
```
https://your-app.com?sheetId=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&range=Attendees!A:Z
```

**With all parameters:**
```
https://your-app.com?sheetId=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&range=Sheet1!A:Z&webhookUrl=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

**Step-by-step URL setup:**

1. **Get your Sheet ID** (see instructions above)
2. **Open your app** in a web browser
3. **Look at the address bar** - you'll see something like `https://your-app.com` or `http://localhost:3000`
4. **Add parameters:**
   - Click at the end of the URL
   - Type: `?sheetId=`
   - Paste your Sheet ID
   - (Optional) Add: `&range=Sheet1!A:Z` if you need a different range
   - (Optional) Add: `&webhookUrl=YOUR_URL` if you have a webhook
5. **Press Enter** - the app will load with your settings

**Example walkthrough:**
- Starting URL: `https://checkin.example.com`
- After adding Sheet ID: `https://checkin.example.com?sheetId=ABC123XYZ789`
- After adding Range: `https://checkin.example.com?sheetId=ABC123XYZ789&range=Attendees!A:Z`
- Final URL with all parameters: `https://checkin.example.com?sheetId=ABC123XYZ789&range=Attendees!A:Z&webhookUrl=https://script.google.com/macros/s/SCRIPT123/exec`

**Tips for URL parameters:**
- Parameters are case-sensitive for the parameter names (`sheetId`, `range`, `webhookUrl`)
- Sheet IDs and URLs should be copied exactly as they appear
- If a parameter has special characters, they'll be automatically encoded
- You can bookmark the URL with parameters for quick access
- Settings from URL parameters are saved to your browser

**Priority order:**
If you use both methods (URL parameters and the configuration screen):
1. URL parameters take priority (highest)
2. Saved browser settings (if no URL parameters)
3. Configuration screen (if nothing is saved)

### Changing Settings Later

To change your sheet settings at any time:
- Click the gear icon (⚙️) in the top right corner of the app
- Update your Sheet ID, Range, or Webhook URL
- Click **Connect** to save

**Or** update the URL parameters in your browser's address bar and press Enter.





## Using the App

### Viewing Attendees

When you open the app, you'll see:
- **Total Leads**: The total number of attendees in your sheet
- **Checked In**: The number of attendees who have checked in
- A list of all attendees below

### Searching for Attendees

1. Type in the search box at the top
2. You can search by:
   - Attendee name
   - Company name
3. Results appear as you type (no need to press Enter)
4. To see all attendees again, clear the search box

### Checking In Attendees

1. Find the attendee you want to check in (use search if needed)
2. Click the checkbox on the left side of their card
3. The card will turn green and show a checkmark
4. The "Checked In" count at the top will update automatically

### Checking Out Attendees

1. Find the attendee who is already checked in
2. Click the checkbox again to uncheck it
3. The card will return to normal and the count will decrease

### Viewing Attendee Details

- **Show Details Toggle**: Use the "Show Details" checkbox to show or hide additional information about each attendee
- When enabled, you'll see fields like email, phone, title, department, dietary restrictions, notes, etc.
- Your preference is saved automatically

### Syncing with Google Sheet

If someone else has updated check-ins directly in the Google Sheet:

1. Click the **"Sync Sheet"** button in the top right
2. The app will refresh to show the latest check-in status from the sheet
3. Your displayed list will update automatically

## Understanding the Display

### Header Information

At the top of the app, you'll see:
- **Total Leads**: Total number of rows/attendees in your sheet
- **Checked In**: Number of people currently checked in
- These numbers update automatically every 23 seconds

### Attendee Cards

Each attendee is shown as a card with:

**Top Section (Always Visible):**
- **Name**: The attendee's name (large, on the left)
- **Company**: The attendee's company (large, in the center)
- **Print Status Badge**: Shows if badges have been printed (if your sheet has this information)
- **SPOC**: Shows the Single Point of Contact or Host (if your sheet has this information)
- **Color Pills**: Shows any color-coded information (like team colors, badge colors, etc.)

**Details Section (Toggle with "Show Details"):**
- All other information from your Google Sheet
- Examples: Email, Phone, Title, Department, Dietary Restrictions, Notes, etc.

### Color Coding

- **Green Card**: Attendee is checked in
- **Normal Card**: Attendee is not checked in
- **Green Flash**: Brief animation when someone checks in
- **Red Flash**: Brief animation when someone checks out

## Tips & Best Practices

### For Event Staff

1. **Keep the app open** during your event for real-time updates
2. **Use search** to quickly find attendees instead of scrolling
3. **Sync regularly** if multiple people are checking in attendees
4. **Check the counts** at the top to see overall attendance at a glance

### Searching Tips

- You don't need to type the full name - partial matches work
- Search works for both first and last names
- Company names are also searchable
- Clear the search to see everyone again

### Multiple Users

- Multiple people can use the app at the same time
- Check-ins update in real-time (updates every 23-45 seconds)
- Use the "Sync Sheet" button if you notice any discrepancies
- All check-ins are saved directly to your Google Sheet

## Troubleshooting

### "Sheet ID is required" Error

- Make sure you've entered your Sheet ID in the configuration
- Click the gear icon (⚙️) to open settings and verify your Sheet ID

### Can't Find an Attendee

- Try searching with just part of their name
- Check if you're searching by first name, last name, or company
- Make sure the attendee exists in your Google Sheet

### Check-in Not Working

- Check your internet connection
- Try clicking the checkbox again
- If it still doesn't work, click "Sync Sheet" to refresh
- Check that your Google Sheet is accessible

### Numbers Not Updating

- The counts update automatically every 23 seconds
- Click "Sync Sheet" for an immediate update
- Refresh the page if numbers seem stuck

### Wrong Information Showing

- Click "Sync Sheet" to get the latest data from Google Sheets
- The app refreshes automatically every 45 seconds
- Make sure your Google Sheet has the correct information

## Frequently Asked Questions

**Q: Do I need to save anything?**  
A: No, everything saves automatically to your Google Sheet.

**Q: Can multiple people use this at the same time?**  
A: Yes! Multiple staff members can check in attendees simultaneously.

**Q: What happens if I close the browser?**  
A: Your settings are saved, but you'll need to reopen the app. All check-ins are saved to your Google Sheet, so nothing is lost.

**Q: Can I check someone out if they checked in by mistake?**  
A: Yes, just click the checkbox again to uncheck them.

**Q: How do I see who has checked in?**  
A: Look for green cards - those are checked-in attendees. You can also check the "Checked In" count at the top.

**Q: Can I use this on my phone?**  
A: Yes! The app works on phones, tablets, and computers.

**Q: What if the app seems slow?**  
A: The app updates automatically. If it seems slow, try clicking "Sync Sheet" or refreshing the page.

## Need Help?

If you're having technical issues:
- Check that your Google Sheet is accessible
- Verify your Sheet ID is correct
- Make sure you have an internet connection
- Try refreshing the page

For setup and configuration help, contact your event administrator or IT support.

---

**Remember:** All check-ins are saved directly to your Google Sheet, so you can always verify the data there if needed!

