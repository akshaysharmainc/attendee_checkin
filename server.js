const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Google Sheets configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']; // Updated to include write access
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:Z'; // Adjust based on your sheet structure

// Demo data for testing when Google Sheets is not configured
const DEMO_ATTENDEES = [
    {
        id: 1,
        name: 'John Doe',
        company: 'Acme Corporation',
        email: 'john.doe@acme.com',
        phone: '+1-555-0123',
        title: 'Senior Manager',
        department: 'Sales',
        dietary_restrictions: 'None',
        notes: 'VIP Guest'
    },
    {
        id: 2,
        company: 'Tech Innovations Inc',
        name: 'Jane Smith',
        email: 'jane.smith@techinc.com',
        phone: '+1-555-0456',
        title: 'Lead Developer',
        department: 'Engineering',
        dietary_restrictions: 'Vegetarian',
        notes: 'Speaker'
    },
    {
        id: 3,
        name: 'Mike Johnson',
        company: 'Global Solutions',
        email: 'mike.j@globalsol.com',
        phone: '+1-555-0789',
        title: 'Director',
        department: 'Marketing',
        dietary_restrictions: 'Gluten-Free',
        notes: 'Panelist'
    },
    {
        id: 4,
        name: 'Sarah Wilson',
        company: 'Startup XYZ',
        email: 'sarah.w@startupxyz.com',
        phone: '+1-555-0321',
        title: 'CEO',
        department: 'Executive',
        dietary_restrictions: 'None',
        notes: 'Keynote'
    },
    {
        id: 5,
        name: 'David Chen',
        company: 'Innovation Labs',
        email: 'david.chen@inno.com',
        phone: '+1-555-0654',
        title: 'CTO',
        department: 'Technology',
        dietary_restrictions: 'None',
        notes: 'Workshop Leader'
    }
];

// Handle credentials from environment variable (production) or file (development)
let credentials;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('{')) {
    // Production: Parse JSON from environment variable
    try {
        credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        console.log('✅ Using production credentials from environment variable');
    } catch (error) {
        console.log('⚠️  Failed to parse credentials from environment variable');
        credentials = null;
    }
} else {
    // Development: Use credentials file
    credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json';
    console.log('✅ Using development credentials from file');
}

// Initialize Google Auth (only if credentials are available)
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
        console.error('Auth error:', error.message);
    }
} else {
    console.log('⚠️  Google Sheets not configured, using demo mode');
}

// Store attendance data in memory (in production, use a database)
let attendanceData = new Map();

// Function to update Google Sheet with check-in status
async function updateSheetCheckInStatus(rowIndex, checkedIn, checkInTime) {
    if (!sheets || !auth) {
        console.log('Google Sheets not available, skipping sheet update');
        return;
    }

    try {
        const authClient = await auth.getClient();
        
        // First, let's get the current sheet structure to see where to add check-in columns
        const response = await sheets.spreadsheets.values.get({
            auth: authClient,
            spreadsheetId: SHEET_ID,
            range: RANGE,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found in sheet');
            return;
        }

        const headers = rows[0];
        
        // Find or create check-in status and timestamp columns
        let checkInStatusCol = headers.findIndex(h => 
            h.toLowerCase().includes('check-in') || 
            h.toLowerCase().includes('checked') || 
            h.toLowerCase().includes('attendance')
        );
        
        let checkInTimeCol = headers.findIndex(h => 
            h.toLowerCase().includes('time') || 
            h.toLowerCase().includes('timestamp')
        );

        // If columns don't exist, we'll add them
        if (checkInStatusCol === -1) {
            // Add check-in status column
            const newRange = `${RANGE.split('!')[0]}!${String.fromCharCode(65 + headers.length)}1`;
            await sheets.spreadsheets.values.update({
                auth: authClient,
                spreadsheetId: SHEET_ID,
                range: newRange,
                valueInputOption: 'RAW',
                resource: {
                    values: [['Check-In Status']]
                }
            });
            checkInStatusCol = headers.length;
            console.log('✅ Added Check-In Status column to sheet');
        }

        if (checkInTimeCol === -1) {
            // Add check-in time column
            const newRange = `${RANGE.split('!')[0]}!${String.fromCharCode(66 + headers.length)}1`;
            await sheets.spreadsheets.values.update({
                auth: authClient,
                spreadsheetId: SHEET_ID,
                range: newRange,
                valueInputOption: 'RAW',
                resource: {
                    values: [['Check-In Time']]
                }
            });
            checkInTimeCol = headers.length + 1;
            console.log('✅ Added Check-In Time column to sheet');
        }

        // Update the specific row with check-in status and time
        const statusRange = `${RANGE.split('!')[0]}!${String.fromCharCode(65 + checkInStatusCol)}${rowIndex + 1}`;
        const timeRange = `${RANGE.split('!')[0]}!${String.fromCharCode(65 + checkInTimeCol)}${rowIndex + 1}`;

        // Update check-in status
        await sheets.spreadsheets.values.update({
            auth: authClient,
            spreadsheetId: SHEET_ID,
            range: statusRange,
            valueInputOption: 'RAW',
            resource: {
                values: [[checkedIn === true]]
            }
        });

        // Update check-in time
        await sheets.spreadsheets.values.update({
            auth: authClient,
            spreadsheetId: SHEET_ID,
            range: timeRange,
            valueInputOption: 'RAW',
            resource: {
                values: [[checkInTime || '']]
            }
        });

        console.log(`✅ Updated sheet for row ${rowIndex + 1}: ${checkedIn ? 'Checked In' : 'Not Checked In'}`);
        
    } catch (error) {
        console.error('Error updating Google Sheet:', error);
        // Don't throw error - we still want the check-in to work locally
    }
}

// Helper function to get attendees (either from Google Sheets or demo data)
async function getAttendees() {
    if (auth && SHEET_ID) {
        try {
            const authClient = await auth.getClient();
            
            const response = await sheets.spreadsheets.values.get({
                auth: authClient,
                spreadsheetId: SHEET_ID,
                range: RANGE,
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                return DEMO_ATTENDEES;
            }

            // Assume first row contains headers
            const headers = rows[0];
            const attendees = rows.slice(1).map((row, index) => {
                const attendee = {
                    id: index + 1,
                    checkedIn: attendanceData.has(index + 1) ? attendanceData.get(index + 1) : false,
                    checkInTime: attendanceData.has(index + 1) ? attendanceData.get(index + 1) : null
                };
                
                // Map each column to a property
                headers.forEach((header, colIndex) => {
                    if (row[colIndex]) {
                        attendee[header.toLowerCase().replace(/\s+/g, '_')] = row[colIndex];
                    }
                });
                
                return attendee;
            });

            return attendees;
        } catch (error) {
            console.error('Error fetching from Google Sheets:', error);
            console.log('Falling back to demo data');
            return DEMO_ATTENDEES;
        }
    } else {
        // Return demo data with attendance status
        return DEMO_ATTENDEES.map(attendee => ({
            ...attendee,
            checkedIn: attendanceData.has(attendee.id) ? attendanceData.get(attendee.id) : false,
            checkInTime: attendanceData.has(attendee.id) ? attendanceData.get(attendee.id) : null
        }));
    }
}

// Get attendees from Google Sheets or demo data
app.get('/api/attendees', async (req, res) => {
    try {
        const attendees = await getAttendees();
        res.json(attendees);
    } catch (error) {
        console.error('Error fetching attendees:', error);
        res.status(500).json({ error: 'Failed to fetch attendees' });
    }
});

// Search attendees
app.get('/api/attendees/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.trim().length === 0) {
            return res.json([]);
        }

        const attendees = await getAttendees();
        const queryLower = query.toLowerCase();
        
        const results = attendees
            .filter(attendee => {
                // Search in name and company fields
                const name = attendee.name || attendee.full_name || attendee.attendee_name || '';
                const company = attendee.company || attendee.organization || attendee.employer || '';
                
                return name.toLowerCase().includes(queryLower) || 
                       company.toLowerCase().includes(queryLower);
            })
            .slice(0, 20); // Limit results to top 20

        res.json(results);
    } catch (error) {
        console.error('Error searching attendees:', error);
        res.status(500).json({ error: 'Failed to search attendees' });
    }
});

// Check in/out attendee
app.post('/api/attendees/:id/checkin', async (req, res) => {
    const { id } = req.params;
    const { checkedIn } = req.body;
    const attendeeId = parseInt(id);
    
    if (checkedIn) {
        const checkInTime = new Date().toISOString();
        attendanceData.set(attendeeId, checkInTime);
        
        // Update Google Sheet
        await updateSheetCheckInStatus(attendeeId, true, checkInTime);
    } else {
        attendanceData.delete(attendeeId);
        
        // Update Google Sheet
        await updateSheetCheckInStatus(attendeeId, false, null);
    }
    
    res.json({ 
        success: true, 
        checkedIn: checkedIn,
        checkInTime: checkedIn ? attendanceData.get(attendeeId) : null
    });
});

// Get attendance summary
app.get('/api/attendance/summary', (req, res) => {
    const totalCheckedIn = attendanceData.size;
    const checkIns = Array.from(attendanceData.entries()).map(([id, time]) => ({
        id,
        checkInTime: time
    }));
    
    res.json({
        totalCheckedIn,
        checkIns
    });
});

// New endpoint to sync attendance data from sheet on startup
app.post('/api/attendance/sync-from-sheet', async (req, res) => {
    try {
        if (!auth || !SHEET_ID) {
            return res.status(400).json({ error: 'Google Sheets not configured' });
        }

        const authClient = await auth.getClient();
        const response = await sheets.spreadsheets.values.get({
            auth: authClient,
            spreadsheetId: SHEET_ID,
            range: RANGE,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.json({ message: 'No data found in sheet' });
        }

        const headers = rows[0];
        
        // Find check-in status and time columns
        const checkInStatusCol = headers.findIndex(h => 
            h.toLowerCase().includes('check-in') || 
            h.toLowerCase().includes('checked') || 
            h.toLowerCase().includes('attendance')
        );
        
        const checkInTimeCol = headers.findIndex(h => 
            h.toLowerCase().includes('time') || 
            h.toLowerCase().includes('timestamp')
        );

        if (checkInStatusCol !== -1) {
            // Clear existing attendance data
            attendanceData.clear();
            
            // Sync from sheet
            rows.slice(1).forEach((row, index) => {
                const status = row[checkInStatusCol];
                const time = checkInTimeCol !== -1 ? row[checkInTimeCol] : null;
                
                // Accept 'checked', 'yes', boolean true, string 'true' (case-insensitive), and 1 as checked-in
                if (
                    status &&
                    (
                        (typeof status === 'string' && (
                            status.toLowerCase().includes('checked') ||
                            status.toLowerCase().includes('yes') ||
                            status.toLowerCase() === 'true'
                        )) ||
                        status === true ||
                        status === 1
                    )
                ) {
                    attendanceData.set(index + 1, time || new Date().toISOString());
                }
            });
            
            console.log(`✅ Synced ${attendanceData.size} check-ins from Google Sheet`);
            res.json({ 
                message: `Synced ${attendanceData.size} check-ins from sheet`,
                totalCheckedIn: attendanceData.size
            });
        } else {
            res.json({ message: 'No check-in status column found in sheet' });
        }
        
    } catch (error) {
        console.error('Error syncing from sheet:', error);
        res.status(500).json({ error: 'Failed to sync from sheet' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    if (auth && SHEET_ID) {
        console.log('✅ Connected to Google Sheets with write access');
        console.log('📝 Will automatically update sheet with check-in status');
    } else {
        console.log('📱 Demo mode active - using sample data');
        console.log('📖 See GOOGLE_SHEETS_SETUP.md to connect to your Google Sheet');
    }
    console.log(`🌐 Open http://localhost:${PORT} in your browser`);
}); 