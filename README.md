# Attendee Check-In App

A modern, responsive web application for checking in attendees at corporate events. Features real-time search, Google Sheets integration, and attendance tracking.

## Features

- 🔍 **Real-time Search**: Type a few letters to find attendees by name or company
- 📊 **Google Sheets Integration**: Connects directly to your Google Sheets for attendee data
- ✅ **Easy Check-in**: Simple checkbox interface for marking attendance
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- 🎨 **Modern UI**: Beautiful, intuitive interface with smooth animations
- 📈 **Attendance Summary**: Real-time tracking of check-ins and statistics

## Screenshots

The app features a clean, modern interface with:
- Large search bar for easy attendee lookup
- Attendee cards showing all relevant information
- Checkboxes for quick attendance marking
- Responsive design that works on all devices

## Prerequisites

- Node.js (v14 or higher)
- Google Cloud Platform account
- Google Sheets API enabled
- Service account credentials

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Google Sheets Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Sheets API

2. **Create Service Account**:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name (e.g., "attendee-checkin")
   - Grant "Editor" role for Google Sheets
   - Create and download the JSON key file

3. **Prepare Your Google Sheet**:
   - Create a new Google Sheet
   - Add headers in the first row (e.g., "Name", "Company", "Email", "Phone", etc.)
   - Add attendee data below the headers
   - Share the sheet with your service account email (with Editor access)

### 3. Environment Configuration

1. **Copy the environment file**:
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` file**:
   ```env
   GOOGLE_SHEET_ID=your_actual_sheet_id_here
   GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
   SHEET_RANGE=Sheet1!A:Z
   PORT=3000
   ```

3. **Place credentials**:
   - Rename your downloaded service account JSON file to `credentials.json`
   - Place it in the project root directory

### 4. Build and Run

**Development mode**:
```bash
npm run dev-build  # Build frontend assets
npm run dev        # Start server with auto-reload
```

**Production mode**:
```bash
npm run build      # Build frontend assets
npm start          # Start server
```

The app will be available at `http://localhost:3000`

## Usage

### For Event Staff

1. **Search for Attendees**:
   - Type the first few letters of a name or company
   - Results appear in real-time as you type

2. **Check-in Attendees**:
   - Click the checkbox next to an attendee's name
   - The row will highlight to show successful check-in
   - Check-in time is automatically recorded

3. **View Attendance Summary**:
   - See total number of checked-in attendees
   - Monitor check-in progress throughout the event

### Google Sheets Structure

Your Google Sheet should have headers in the first row. Common columns include:

| Name | Company | Email | Phone | Title | Department | Dietary Restrictions |
|------|---------|-------|-------|-------|------------|---------------------|
| John Doe | Acme Corp | john@acme.com | +1-555-0123 | Manager | Sales | None |
| Jane Smith | Tech Inc | jane@tech.com | +1-555-0456 | Developer | Engineering | Vegetarian |

**Important**: The app automatically detects column headers and displays all available information for each attendee.

## API Endpoints

- `GET /api/attendees` - Get all attendees
- `GET /api/attendees/search?query=...` - Search attendees
- `POST /api/attendees/:id/checkin` - Check in/out attendee
- `GET /api/attendance/summary` - Get attendance summary

## Customization

### Styling
- Edit `src/styles.css` to customize colors, fonts, and layout
- The app uses CSS custom properties for easy theming

### Search Fields
- Modify the search logic in `server.js` to search in different columns
- Currently searches in name and company fields

### Additional Features
- Add export functionality for attendance reports
- Integrate with other event management systems
- Add QR code scanning for faster check-ins

## Troubleshooting

### Common Issues

1. **"Failed to fetch attendees" error**:
   - Check your Google Sheets API credentials
   - Verify the sheet ID and range in your `.env` file
   - Ensure the service account has access to the sheet

2. **Search not working**:
   - Check browser console for JavaScript errors
   - Verify the server is running and accessible
   - Check network tab for failed API requests

3. **Styling issues**:
   - Run `npm run dev-build` to rebuild CSS
   - Clear browser cache
   - Check for CSS conflicts

### Debug Mode

Enable debug logging by adding to your `.env`:
```env
DEBUG=attendee-checkin:*
```

## Security Considerations

- **Never commit credentials**: Keep `credentials.json` and `.env` out of version control
- **Service account permissions**: Use minimal required permissions for the service account
- **HTTPS in production**: Always use HTTPS when deploying to production
- **Rate limiting**: Consider implementing rate limiting for production use

## Deployment

### Heroku
```bash
heroku create your-app-name
heroku config:set GOOGLE_SHEET_ID=your_sheet_id
heroku config:set GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
git push heroku main
```

### Docker
```bash
docker build -t attendee-checkin .
docker run -p 3000:3000 attendee-checkin
```

### Environment Variables
Make sure to set all required environment variables in your production environment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the Google Sheets API documentation
3. Open an issue on GitHub

---

**Happy Event Management! 🎉** 