# Attendee Check-In App

A modern web application for checking in attendees at corporate events with Google Sheets integration.

## Features

- 🔍 Real-time search by name or company
- 📊 Google Sheets integration for attendee data
- ✅ Simple checkbox check-in interface
- 📱 Responsive design for all devices
- 📈 Real-time attendance tracking

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Google Sheets Setup

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Google Sheets API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

#### Step 2: Create Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Give it a name (e.g., "attendee-checkin-service")
4. Click "Create and Continue"
5. Grant it the **Editor** role (or "Editor" role for the specific sheet)
6. Click "Done"
7. Click on the created service account
8. Go to the "Keys" tab
9. Click "Add Key" > "Create new key"
10. Select "JSON" format
11. Download the JSON key file and save it as `credentials.json` in the project root

#### Step 3: Prepare Google Sheet

1. Create a Google Sheet with your attendee data
2. **First row must contain headers** (e.g., Name, Company, Email, Phone, etc.)
3. **Optional columns** (automatically detected):
   - Columns with "color" or "colour" in the name → displayed as colored pills
   - Columns with "spoc" or "host" in the name → displayed in top section
   - Columns with "print" or "printed" in the name → displayed as print status badge
4. **Get your Sheet ID**:
   - Open your Google Sheet
   - Look at the URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`
   - Copy the `YOUR_SHEET_ID` part (the long string between `/d/` and `/edit`)
5. **Share the sheet**:
   - Click "Share" button in Google Sheets
   - Add the service account email (found in `credentials.json` as `client_email`)
   - Give it **Editor** access (required for writing check-in status)
   - Click "Send"

#### Step 4: Configure Sheet ID and Range

The app supports **three ways** to configure the Google Sheet:

##### Option A: Server-Side Configuration (Recommended for Single Team/Sheet)

Set environment variables in `.env` file:

```bash
cp env.example .env
```

Edit `.env`:
```env
GOOGLE_SHEET_ID=your_actual_sheet_id_here
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
GOOGLE_SHEET_RANGE=Sheet1!A:Z
DISABLE_CHECKIN_TIME_LOGGING=false
PORT=3000
```

**Notes:**
- `GOOGLE_SHEET_ID`: Your Google Sheet ID (required)
- `GOOGLE_SHEET_RANGE`: Sheet range to read (default: `Sheet1!A:Z`)
  - Format: `SheetName!A:Z` (e.g., `Sheet1!A:Z`, `Attendees!A:AA`)
  - Use `A:Z` to read columns A through Z
  - Use `A:AA` to read columns A through AA (27 columns)
  - The app will automatically create "Check-In Status" column (and "Check-In Time" column if time logging is enabled) if they don't exist
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to your service account JSON file
- `DISABLE_CHECKIN_TIME_LOGGING`: Set to `true` or `1` to disable check-in time logging (default: `false`)
  - When disabled, only the check-in status (true/false) will be written to the sheet
  - The "Check-In Time" column will not be created or updated
  - Useful if you only need to track attendance status without timestamps

##### Option B: Frontend Configuration (Recommended for Multiple Teams/Sheets)

1. **Don't set** `GOOGLE_SHEET_ID` in `.env` (or leave it empty)
2. When you open the app, a configuration modal will appear
3. Enter your Sheet ID and Range
4. The configuration is saved in your browser's localStorage
5. You can change it anytime using the gear icon (⚙️) in the header

**Benefits:**
- Different users can use different sheets
- No need to redeploy when switching sheets
- Configuration persists in browser

##### Option C: URL Parameters

You can also provide the sheet ID and range via URL:

```
http://localhost:3000?sheetId=YOUR_SHEET_ID&range=Sheet1!A:Z
```

**Priority Order:**
1. URL parameters (highest priority)
2. Browser localStorage (if configured via frontend)
3. Environment variables (if set in `.env`)

**⚠️ Security Note**: 
- Never commit `.env` or `credentials.json` to version control
- Each user/team should create their own Google Cloud project and service account
- The `.gitignore` file is already configured to exclude these files
- For production, use environment variables provided by your hosting platform

### 3. Run the App

**Development:**
```bash
npm run dev-build  # Build frontend
npm run dev        # Start server
```

**Production:**
```bash
npm run build      # Build frontend
npm start          # Start server
```

Visit `http://localhost:3000`

**Configuration Status:**
- If no sheet ID is configured (via environment variables, frontend modal, or URL), the app will show a **configuration modal** asking you to enter a Sheet ID
- **Demo mode** (sample data) is only available if both Google Sheets credentials AND sheet ID are completely missing - this is mainly for development/testing
- In normal usage, you should configure at least the credentials (for server-side) or use the frontend configuration modal
- Check `/api/health` endpoint to verify your configuration status
- The health endpoint shows detailed diagnostics about your Google Sheets setup

## Deployment

To deploy this app for your team, see **[DEPLOYMENT.md](./DEPLOYMENT.md)** for detailed step-by-step instructions.

**Quick Start with Railway** (recommended - easiest):
1. Sign up at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Set environment variables in Railway dashboard
4. Deploy automatically - your app will be live in minutes!

**Other options**: Render, Heroku, Docker, VPS - all covered in [DEPLOYMENT.md](./DEPLOYMENT.md)

## Usage

### Basic Operations

1. **Search**: Type a few letters to find attendees by name or company
   - Results appear as you type (debounced search)
   - Shows all attendees by default when search is empty
   
2. **Check-in**: Click the checkbox to mark attendance
   - Card color updates instantly (optimistic UI)
   - Count updates immediately, then syncs with server
   - Check-in status is written to Google Sheet as boolean `true`/`false`
   
3. **Sync**: Use the "Sync Sheet" button to sync existing check-ins from Google Sheet
   - Useful when check-ins were made directly in Google Sheets
   - Refreshes the displayed attendee list

4. **Configure Sheet**: Click the gear icon (⚙️) in the header to change sheet configuration
   - Enter new Sheet ID and Range
   - Configuration is saved in browser localStorage

### Attendee Display

Each attendee card is divided into two sections:

#### Main Section (Always Visible)

The main section displays the most important information in a structured layout:

**First Row (Header Row):**
- **Name** (left, large font): Automatically detected from columns containing "name" (e.g., "Name", "Full Name", "Attendee Name")
- **Company** (center, large font): Automatically detected from columns containing "company", "organization", or "employer"
- **Print Status Badge** (next to company): 
  - Detects columns with "print" or "printed" in the name (case-insensitive)
  - Shows only the **first** print field found
  - Displayed as a badge with color coding:
    - **Printed** (white background, black text): If value is `true`, "yes", "true", or "printed"
    - **Not Printed** (light red background, dark red text): If value is `false`, "no", "not printed", or any other negative value
  - Supports boolean values and text strings
- **SPOC/Host** (right-aligned): 
  - Detects columns with "spoc" or "host" in the name (case-insensitive)
  - Shows only the **first** SPOC field found
  - Always displays with label "SPOC:" (hardcoded, regardless of actual column name)
  - Example: Column named "Host Name" or "SPOC Contact" will show as "SPOC: [value]"

**Second Row (Color Row):**
- **Color/Colour Fields**: 
  - Detects **all** columns with "color" or "colour" in the name (case-insensitive)
  - **All** color columns are displayed (not just the first one)
  - Each color field is shown as a colored pill with:
    - Background color matching the color value (if valid)
    - Text color automatically adjusted for readability (black on light colors, white on dark colors)
    - Black border around each pill
    - Label uses the actual column name (e.g., "Team Color:", "Badge Colour:")
  - Supports common color names (e.g., "Red", "Blue", "Green", "Yellow")
  - Supports compound colors (e.g., "Crimson Red", "Charcoal Grey")
  - Falls back to plain text if color cannot be parsed

**Layout Structure:**
```
┌─────────────────────────────────────────┐
│ [Checkbox] Name | Company [Print Badge] │
│                 SPOC: [value]            │
│ Color1: [pill] Color2: [pill] ...      │
└─────────────────────────────────────────┘
```

#### Details Section (Toggle with "Show Details" Checkbox)

- **All other fields** from your Google Sheet that are not:
  - Name, Company (shown in header)
  - Print/Printed fields (shown as badge)
  - SPOC/Host fields (shown in header)
  - Color/Colour fields (shown as pills)
  - Internal fields (id, checkedIn, checkInTime)
- Examples: Email, Phone, Title, Department, Dietary Restrictions, Notes, etc.
- Fields are displayed as "Label: Value" pairs
- Empty fields are automatically hidden

#### Column Detection Rules

The app uses **flexible, case-insensitive matching**:
- **Name**: Looks for columns containing "name" (e.g., "Name", "Full Name", "Attendee Name")
- **Company**: Looks for "company", "organization", or "employer"
- **Print**: Looks for "print" or "printed" anywhere in column name
- **SPOC/Host**: Looks for "spoc" or "host" anywhere in column name
- **Color**: Looks for "color" or "colour" anywhere in column name

**Important Notes:**
- Multiple columns matching the same pattern are handled differently:
  - **Color fields**: All are displayed
  - **Print fields**: Only the first one is shown in header
  - **SPOC fields**: Only the first one is shown
- Column names are case-insensitive (e.g., "Team Color", "TEAM COLOR", "team color" all work)
- Partial matches work (e.g., "Print Status", "Printed", "Not Printed" all match)

### Automatic Column Detection

The app automatically:
- **Detects** columns by flexible name matching (case-insensitive, partial matches)
- **Creates** "Check-In Status" column if it doesn't exist
- **Creates** "Check-In Time" column if it doesn't exist and time logging is enabled (see `DISABLE_CHECKIN_TIME_LOGGING` configuration)
- **Places** new columns in empty columns to avoid overwriting existing data
- **Reads** check-in status directly from Google Sheet (source of truth)

### Real-time Updates

- **Count**: Updates every 5 seconds to reflect changes from other users
- **Attendee List**: Auto-refreshes every 30 seconds to show external changes
- **Check-in**: Updates instantly with optimistic UI, then syncs with server

## API Endpoints

### Attendee Endpoints

- `GET /api/attendees?sheetId=...&range=...` - Get all attendees
  - Optional query params: `sheetId`, `range` (uses defaults if not provided)
  
- `GET /api/attendees/search?query=...&sheetId=...&range=...` - Search attendees
  - Required: `query` (search term)
  - Optional: `sheetId`, `range`

- `POST /api/attendees/:id/checkin` - Check in/out attendee
  - Body: `{ checkedIn: boolean, sheetId?: string, range?: string }`
  - Returns: `{ success: boolean, checkedIn: boolean, checkInTime: string, totalCheckedIn: number }`

### Attendance Endpoints

- `GET /api/attendance/summary?sheetId=...&range=...` - Get attendance summary
  - Returns: `{ totalCheckedIn: number, checkIns: Array }`
  - Optional query params: `sheetId`, `range`

- `POST /api/attendance/sync-from-sheet` - Sync from Google Sheet
  - Body: `{ sheetId?: string, range?: string }`
  - Syncs check-in status from sheet to local cache

### Configuration Endpoints

- `GET /api/sheets/validate?sheetId=...&range=...` - Validate sheet access
  - Checks if service account can access the specified sheet
  - Returns validation result and error messages if any

- `GET /api/health?sheetId=...` - Health check and configuration diagnostics
  - Shows detailed configuration status
  - Helpful for troubleshooting setup issues

## Troubleshooting

### Common Issues

**"Failed to fetch attendees" or "Failed to connect to Google Sheet"**:
- ✅ Check that `credentials.json` exists and is valid
- ✅ Verify `GOOGLE_APPLICATION_CREDENTIALS` path in `.env` is correct
- ✅ Ensure Google Sheets API is enabled in your Google Cloud project
- ✅ Verify the sheet ID is correct (check the URL)
- ✅ Ensure the sheet is shared with the service account email (from `credentials.json`)
- ✅ Check that service account has **Editor** access (not Viewer)
- ✅ Visit `/api/health` endpoint for detailed diagnostics

**Check-ins not updating sheet**:
- ✅ Verify service account has **Editor** access (required for writing)
- ✅ Check that Google Sheets API is enabled
- ✅ Ensure "Check-In Status" column exists (app creates it automatically)
- ✅ Check browser console for error messages

**Card status not updating when sheet changes**:
- ✅ Card status auto-refreshes every 30 seconds
- ✅ Count updates every 5 seconds
- ✅ Use "Sync Sheet" button for immediate refresh
- ✅ Check that check-in status in sheet is boolean `true`/`false` or recognized text values

**"Sheet ID is required" error**:
- ✅ Set `GOOGLE_SHEET_ID` in `.env`, OR
- ✅ Configure via frontend modal (gear icon), OR
- ✅ Provide via URL parameter: `?sheetId=YOUR_ID`

**Configuration modal appears on page load**:
- ✅ This is normal if no sheet ID is configured
- ✅ Enter your Sheet ID and Range in the modal
- ✅ Configuration is saved in browser localStorage
- ✅ You can change it later using the gear icon (⚙️) in the header

**Demo data showing instead of real data**:
- ✅ Demo mode only appears if both credentials AND sheet ID are completely missing (development/testing scenario)
- ✅ In normal usage, configure credentials and provide sheet ID via environment variables, frontend modal, or URL parameters
- ✅ Check `/api/health` to see configuration status
- ✅ Verify sheet ID and credentials are correct
- ✅ Ensure sheet is shared with service account

**Column overwrite issue**:
- ✅ App now checks for empty columns before creating new ones
- ✅ Automatically finds first empty column to avoid overwriting data
- ✅ Supports columns beyond Z (AA, AB, etc.)

## Security

- Never commit `credentials.json` or `.env` files
- Use environment variables for production deployment
- Keep service account permissions minimal

## License

MIT
