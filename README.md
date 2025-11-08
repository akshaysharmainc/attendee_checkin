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

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Google Sheets API

2. **Create Service Account**:
   - Go to "IAM & Admin" > "Service Accounts"
   - Create a new service account with "Editor" role
   - Download the JSON key file

3. **Prepare Google Sheet**:
   - Create a Google Sheet with headers in the first row (Name, Company, Email, etc.)
   - **Optional columns**: Columns with "color"/"colour" or "spoc"/"host" in the name will be displayed prominently in the top section
   - Share the sheet with your service account email (Editor access)
   - Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`

### 3. Configure Environment

```bash
cp env.example .env
```

Edit `.env`:
```env
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
GOOGLE_SHEET_RANGE=Sheet1!A:Z
PORT=3000
```

Place your downloaded service account JSON file as `credentials.json` in the project root.

### 4. Run the App

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

## Usage

1. **Search**: Type a few letters to find attendees by name or company
2. **Check-in**: Click the checkbox to mark attendance
3. **Sync**: Use the "Sync Sheet" button to sync existing check-ins from Google Sheets

### Attendee Display

Each attendee card shows:
- **Top section**: Name, Company, Color/Colour field (if exists), and SPOC/Host field (if exists)
- **Details section**: All other fields from your Google Sheet (email, phone, etc.)

The app automatically detects columns containing "color"/"colour" or "spoc"/"host" in their names and displays them in the top section.

The app automatically creates "Check-In Status" and "Check-In Time" columns in your Google Sheet.

## Deployment

### Railway (Recommended)

1. Go to [railway.app](https://railway.app)
2. Deploy from GitHub repo
3. Set environment variables:
   - `GOOGLE_SHEET_ID` - Your sheet ID
   - `GOOGLE_APPLICATION_CREDENTIALS` - Full JSON content from credentials.json
   - `GOOGLE_SHEET_RANGE` - Sheet1!A:Z
   - `NODE_ENV` - production

### Render

1. Go to [render.com](https://render.com)
2. Create new Web Service from GitHub
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Set the same environment variables as above

### Docker

```bash
docker build -t attendee-checkin .
docker run -p 3000:3000 -e GOOGLE_SHEET_ID=... attendee-checkin
```

## API Endpoints

- `GET /api/attendees` - Get all attendees
- `GET /api/attendees/search?query=...` - Search attendees
- `POST /api/attendees/:id/checkin` - Check in/out attendee
- `GET /api/attendance/summary` - Get attendance summary
- `POST /api/attendance/sync-from-sheet` - Sync from Google Sheet

## Troubleshooting

**"Failed to fetch attendees"**:
- Check Google Sheets API credentials
- Verify sheet ID and service account permissions
- Ensure sheet is shared with service account

**Check-ins not updating sheet**:
- Verify service account has Editor (not Viewer) access
- Check that Google Sheets API is enabled

## Security

- Never commit `credentials.json` or `.env` files
- Use environment variables for production deployment
- Keep service account permissions minimal

## License

MIT
