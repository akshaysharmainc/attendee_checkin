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

// Configuration validation
function validateConfig() {
    const errors = [];
    const warnings = [];
    
    // Check for Sheet ID
    if (!process.env.GOOGLE_SHEET_ID) {
        warnings.push('GOOGLE_SHEET_ID not set - will run in demo mode');
    } else if (process.env.GOOGLE_SHEET_ID === 'your_google_sheet_id_here' || 
               process.env.GOOGLE_SHEET_ID === 'your_sheet_id_here') {
        warnings.push('GOOGLE_SHEET_ID appears to be a placeholder - will run in demo mode');
    }
    
    // Check for credentials
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        warnings.push('GOOGLE_APPLICATION_CREDENTIALS not set - will run in demo mode');
    } else {
        // Validate credentials format
        const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (creds.startsWith('{')) {
            // JSON string - validate it's parseable
            try {
                const parsed = JSON.parse(creds);
                if (!parsed.type || !parsed.project_id || !parsed.private_key) {
                    errors.push('GOOGLE_APPLICATION_CREDENTIALS JSON is missing required fields (type, project_id, private_key)');
                }
            } catch (e) {
                errors.push('GOOGLE_APPLICATION_CREDENTIALS is not valid JSON: ' + e.message);
            }
        } else {
            // File path - check if file exists
            const fs = require('fs');
            const path = require('path');
            const credPath = path.resolve(creds);
            if (!fs.existsSync(credPath)) {
                errors.push(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${credPath}`);
            }
        }
    }
    
    // Check for range (optional, has default)
    if (!process.env.GOOGLE_SHEET_RANGE) {
        // This is fine, we have a default
    }
    
    return { errors, warnings };
}

// Validate configuration on startup
const configValidation = validateConfig();
if (configValidation.errors.length > 0) {
    console.error('\n❌ Configuration Errors:');
    configValidation.errors.forEach(err => console.error(`   - ${err}`));
    console.error('\n⚠️  Server will start but Google Sheets integration will be disabled.\n');
}
if (configValidation.warnings.length > 0) {
    console.warn('\n⚠️  Configuration Warnings:');
    configValidation.warnings.forEach(warn => console.warn(`   - ${warn}`));
    console.warn('');
}

// Handle credentials from environment variable (production) or file (development)
let credentials;
let credentialsError = null;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('{')) {
    // Production: Parse JSON from environment variable
    try {
        credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        console.log('✅ Using production credentials from environment variable');
    } catch (error) {
        credentialsError = `Failed to parse credentials from environment variable: ${error.message}`;
        console.error(`❌ ${credentialsError}`);
        credentials = null;
    }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Development: Use credentials file
    const fs = require('fs');
    const path = require('path');
    const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(credPath)) {
        credentials = credPath;
        console.log(`✅ Using development credentials from file: ${credPath}`);
    } else {
        credentialsError = `Credentials file not found: ${credPath}`;
        console.error(`❌ ${credentialsError}`);
        credentials = null;
    }
} else {
    credentials = './credentials.json'; // Default fallback
    const fs = require('fs');
    if (!fs.existsSync(credentials)) {
        credentialsError = 'No credentials configured and default file not found';
        credentials = null;
    }
}

// Initialize Google Auth (only if credentials are available)
let auth = null;
let sheets = null;
let authError = null;
let isConfigured = false;

if (SHEET_ID && credentials && !credentialsError) {
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
        isConfigured = true;
        console.log('✅ Google Sheets integration enabled with write access');
        console.log(`   Sheet ID: ${SHEET_ID}`);
        console.log(`   Range: ${RANGE}`);
    } catch (error) {
        authError = `Failed to initialize Google Auth: ${error.message}`;
        console.error(`❌ ${authError}`);
        console.log('⚠️  Using demo mode due to authentication error');
    }
} else {
    const reasons = [];
    if (!SHEET_ID) reasons.push('GOOGLE_SHEET_ID not set');
    if (!credentials || credentialsError) {
        reasons.push(credentialsError || 'GOOGLE_APPLICATION_CREDENTIALS not configured');
    }
    console.log(`⚠️  Google Sheets not configured: ${reasons.join(', ')}`);
    console.log('📱 Running in demo mode with sample data');
}

// Store attendance data in memory (in production, use a database)
// Note: This is now primarily used as a cache. Check-in status is read from Google Sheets.
let attendanceData = new Map();

// Retry helper function for Google Sheets API calls
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            console.log(`Retry attempt ${attempt}/${maxRetries} after error:`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
}

// Function to ensure check-in columns exist (idempotent)
async function ensureCheckInColumns(authClient) {
    try {
        const response = await sheets.spreadsheets.values.get({
            auth: authClient,
            spreadsheetId: SHEET_ID,
            range: RANGE,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return { checkInStatusCol: -1, checkInTimeCol: -1 };
        }

        const headers = rows[0];
        
        let checkInStatusCol = headers.findIndex(h => 
            h.toLowerCase().includes('check-in') || 
            h.toLowerCase().includes('checked') || 
            h.toLowerCase().includes('attendance')
        );
        
        let checkInTimeCol = headers.findIndex(h => 
            h.toLowerCase().includes('time') || 
            h.toLowerCase().includes('timestamp')
        );

        // Create columns if they don't exist (idempotent - check again after potential creation)
        if (checkInStatusCol === -1) {
            const newRange = `${RANGE.split('!')[0]}!${String.fromCharCode(65 + headers.length)}1`;
            try {
                await retryOperation(async () => {
                    await sheets.spreadsheets.values.update({
                        auth: authClient,
                        spreadsheetId: SHEET_ID,
                        range: newRange,
                        valueInputOption: 'RAW',
                        resource: {
                            values: [['Check-In Status']]
                        }
                    });
                });
                // Re-fetch to get updated headers
                const updatedResponse = await sheets.spreadsheets.values.get({
                    auth: authClient,
                    spreadsheetId: SHEET_ID,
                    range: RANGE,
                });
                const updatedHeaders = updatedResponse.data.values[0];
                checkInStatusCol = updatedHeaders.findIndex(h => 
                    h.toLowerCase().includes('check-in') || 
                    h.toLowerCase().includes('checked') || 
                    h.toLowerCase().includes('attendance')
                );
            } catch (error) {
                // Column might have been created by another request - try to find it
                const updatedResponse = await sheets.spreadsheets.values.get({
                    auth: authClient,
                    spreadsheetId: SHEET_ID,
                    range: RANGE,
                });
                const updatedHeaders = updatedResponse.data.values[0];
                checkInStatusCol = updatedHeaders.findIndex(h => 
                    h.toLowerCase().includes('check-in') || 
                    h.toLowerCase().includes('checked') || 
                    h.toLowerCase().includes('attendance')
                );
            }
        }

        if (checkInTimeCol === -1) {
            const newRange = `${RANGE.split('!')[0]}!${String.fromCharCode(65 + (checkInStatusCol !== -1 ? checkInStatusCol + 1 : headers.length))}1`;
            try {
                await retryOperation(async () => {
                    await sheets.spreadsheets.values.update({
                        auth: authClient,
                        spreadsheetId: SHEET_ID,
                        range: newRange,
                        valueInputOption: 'RAW',
                        resource: {
                            values: [['Check-In Time']]
                        }
                    });
                });
                // Re-fetch to get updated headers
                const updatedResponse = await sheets.spreadsheets.values.get({
                    auth: authClient,
                    spreadsheetId: SHEET_ID,
                    range: RANGE,
                });
                const updatedHeaders = updatedResponse.data.values[0];
                checkInTimeCol = updatedHeaders.findIndex(h => 
                    h.toLowerCase().includes('time') || 
                    h.toLowerCase().includes('timestamp')
                );
            } catch (error) {
                // Column might have been created by another request - try to find it
                const updatedResponse = await sheets.spreadsheets.values.get({
                    auth: authClient,
                    spreadsheetId: SHEET_ID,
                    range: RANGE,
                });
                const updatedHeaders = updatedResponse.data.values[0];
                checkInTimeCol = updatedHeaders.findIndex(h => 
                    h.toLowerCase().includes('time') || 
                    h.toLowerCase().includes('timestamp')
                );
            }
        }

        return { checkInStatusCol, checkInTimeCol };
    } catch (error) {
        console.error('Error ensuring check-in columns:', error);
        return { checkInStatusCol: -1, checkInTimeCol: -1 };
    }
}

// Function to update Google Sheet with check-in status
async function updateSheetCheckInStatus(rowIndex, checkedIn, checkInTime) {
    if (!sheets || !auth) {
        console.log('Google Sheets not available, skipping sheet update');
        return { success: false, error: 'Google Sheets not configured' };
    }

    try {
        const authClient = await auth.getClient();
        
        // Ensure check-in columns exist (idempotent)
        const { checkInStatusCol, checkInTimeCol } = await ensureCheckInColumns(authClient);
        
        if (checkInStatusCol === -1) {
            throw new Error('Could not find or create check-in status column');
        }

        // Validate row index
        const response = await retryOperation(async () => {
            return await sheets.spreadsheets.values.get({
                auth: authClient,
                spreadsheetId: SHEET_ID,
                range: RANGE,
            });
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            throw new Error('No data found in sheet');
        }

        if (rowIndex < 1 || rowIndex >= rows.length) {
            throw new Error(`Invalid row index: ${rowIndex}. Sheet has ${rows.length - 1} data rows.`);
        }

        // Update the specific row with check-in status and time
        const statusRange = `${RANGE.split('!')[0]}!${String.fromCharCode(65 + checkInStatusCol)}${rowIndex + 1}`;
        const timeRange = checkInTimeCol !== -1 
            ? `${RANGE.split('!')[0]}!${String.fromCharCode(65 + checkInTimeCol)}${rowIndex + 1}`
            : null;

        // Update check-in status with retry (using boolean value)
        await retryOperation(async () => {
            await sheets.spreadsheets.values.update({
                auth: authClient,
                spreadsheetId: SHEET_ID,
                range: statusRange,
                valueInputOption: 'RAW',
                resource: {
                    values: [[checkedIn]]  // Write boolean true/false
                }
            });
        });

        // Update check-in time with retry (if column exists)
        if (timeRange && checkInTimeCol !== -1) {
            await retryOperation(async () => {
                await sheets.spreadsheets.values.update({
                    auth: authClient,
                    spreadsheetId: SHEET_ID,
                    range: timeRange,
                    valueInputOption: 'RAW',
                    resource: {
                        values: [[checkInTime || '']]
                    }
                });
            });
        }

        console.log(`✅ Updated sheet for row ${rowIndex + 1}: ${checkedIn ? 'Checked In' : 'Not Checked In'}`);
        return { success: true };
        
    } catch (error) {
        console.error('Error updating Google Sheet:', error);
        return { success: false, error: error.message };
    }
}

// Helper function to get attendees (either from Google Sheets or demo data)
async function getAttendees() {
    if (auth && SHEET_ID) {
        try {
            const authClient = await auth.getClient();
            
            const response = await retryOperation(async () => {
                return await sheets.spreadsheets.values.get({
                    auth: authClient,
                    spreadsheetId: SHEET_ID,
                    range: RANGE,
                });
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                return DEMO_ATTENDEES;
            }

            // Assume first row contains headers
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

            const attendees = rows.slice(1).map((row, index) => {
                const attendee = {
                    id: index + 1
                };
                
                // Read check-in status directly from Google Sheet (source of truth)
                if (checkInStatusCol !== -1 && row[checkInStatusCol] !== undefined && row[checkInStatusCol] !== '') {
                    const status = row[checkInStatusCol];
                    const isCheckedIn = (
                        status === true ||
                        status === 1 ||
                        (typeof status === 'string' && (
                            status.toLowerCase().includes('checked') ||
                            status.toLowerCase().includes('yes') ||
                            status.toLowerCase() === 'true'
                        ))
                    );
                    
                    attendee.checkedIn = isCheckedIn;
                    attendee.checkInTime = (isCheckedIn && checkInTimeCol !== -1 && row[checkInTimeCol]) 
                        ? row[checkInTimeCol] 
                        : null;
                } else if (checkInStatusCol !== -1 && row[checkInStatusCol] === false) {
                    // Handle explicit false boolean value
                    attendee.checkedIn = false;
                    attendee.checkInTime = null;
                } else {
                    // Fallback to in-memory cache if columns don't exist yet
                    attendee.checkedIn = attendanceData.has(index + 1) ? true : false;
                    attendee.checkInTime = attendanceData.has(index + 1) ? attendanceData.get(index + 1) : null;
                }
                
                // Map each column to a property
                headers.forEach((header, colIndex) => {
                    if (row[colIndex] !== undefined && row[colIndex] !== '') {
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
            checkedIn: attendanceData.has(attendee.id) ? true : false,
            checkInTime: attendanceData.has(attendee.id) ? attendanceData.get(attendee.id) : null
        }));
    }
}

// Health check endpoint to verify Google Sheets configuration
app.get('/api/health', (req, res) => {
    const health = {
        status: 'ok',
        googleSheetsConfigured: isConfigured,
        demoMode: !isConfigured,
        timestamp: new Date().toISOString(),
        configuration: {
            sheetId: SHEET_ID ? 'configured' : 'not set',
            range: RANGE,
            credentials: credentials ? 'configured' : 'not set'
        }
    };
    
    if (isConfigured) {
        health.message = 'Google Sheets integration active';
        health.details = {
            sheetId: SHEET_ID,
            range: RANGE
        };
    } else {
        health.message = 'Running in demo mode';
        health.details = {
            reason: 'Google Sheets not configured',
            errors: []
        };
        
        if (!SHEET_ID) {
            health.details.errors.push({
                field: 'GOOGLE_SHEET_ID',
                issue: 'Not set or invalid',
                fix: 'Set GOOGLE_SHEET_ID environment variable with your Google Sheet ID'
            });
        }
        
        if (credentialsError) {
            health.details.errors.push({
                field: 'GOOGLE_APPLICATION_CREDENTIALS',
                issue: credentialsError,
                fix: 'Set GOOGLE_APPLICATION_CREDENTIALS to a valid file path or JSON string'
            });
        } else if (!credentials) {
            health.details.errors.push({
                field: 'GOOGLE_APPLICATION_CREDENTIALS',
                issue: 'Not configured',
                fix: 'Set GOOGLE_APPLICATION_CREDENTIALS environment variable or place credentials.json in project root'
            });
        }
        
        if (authError) {
            health.details.errors.push({
                field: 'Authentication',
                issue: authError,
                fix: 'Check that your credentials are valid and have the correct permissions'
            });
        }
        
        health.details.setupInstructions = [
            '1. Create a Google Cloud project and enable Sheets API',
            '2. Create a service account and download JSON key',
            '3. Share your Google Sheet with the service account email',
            '4. Set GOOGLE_SHEET_ID and GOOGLE_APPLICATION_CREDENTIALS environment variables',
            '5. Restart the server'
        ];
    }
    
    res.json(health);
});

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
    
    // Validate input
    if (isNaN(attendeeId) || attendeeId < 1) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid attendee ID' 
        });
    }

    if (typeof checkedIn !== 'boolean') {
        return res.status(400).json({ 
            success: false, 
            error: 'checkedIn must be a boolean' 
        });
    }
    
    try {
        const checkInTime = checkedIn ? new Date().toISOString() : null;
        
        // Update Google Sheet first (source of truth)
        const sheetUpdate = await updateSheetCheckInStatus(attendeeId, checkedIn, checkInTime);
        
        if (!sheetUpdate.success) {
            // If sheet update fails, still update local cache but warn user
            console.warn(`Sheet update failed for attendee ${attendeeId}, but updating local cache`);
            if (checkedIn) {
                attendanceData.set(attendeeId, checkInTime);
            } else {
                attendanceData.delete(attendeeId);
            }
            
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to update Google Sheet: ' + sheetUpdate.error,
                checkedIn: checkedIn,
                checkInTime: checkInTime,
                warning: 'Check-in saved locally but may not be synced to sheet'
            });
        }
        
        // Update local cache only after successful sheet update
        if (checkedIn) {
            attendanceData.set(attendeeId, checkInTime);
        } else {
            attendanceData.delete(attendeeId);
        }
        
        res.json({ 
            success: true, 
            checkedIn: checkedIn,
            checkInTime: checkInTime
        });
    } catch (error) {
        console.error('Error in check-in endpoint:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error: ' + error.message 
        });
    }
});

// Get attendance summary
app.get('/api/attendance/summary', async (req, res) => {
    try {
        // Read from Google Sheets (source of truth) if available
        if (auth && SHEET_ID) {
            const attendees = await getAttendees();
            const checkedInAttendees = attendees.filter(a => a.checkedIn);
            
            return res.json({
                totalCheckedIn: checkedInAttendees.length,
                checkIns: checkedInAttendees.map(a => ({
                    id: a.id,
                    checkInTime: a.checkInTime
                }))
            });
        }
        
        // Fallback to in-memory cache
        const totalCheckedIn = attendanceData.size;
        const checkIns = Array.from(attendanceData.entries()).map(([id, time]) => ({
            id,
            checkInTime: time
        }));
        
        res.json({
            totalCheckedIn,
            checkIns
        });
    } catch (error) {
        console.error('Error getting attendance summary:', error);
        // Fallback to in-memory cache on error
        const totalCheckedIn = attendanceData.size;
        const checkIns = Array.from(attendanceData.entries()).map(([id, time]) => ({
            id,
            checkInTime: time
        }));
        
        res.json({
            totalCheckedIn,
            checkIns
        });
    }
});

// New endpoint to sync attendance data from sheet on startup
app.post('/api/attendance/sync-from-sheet', async (req, res) => {
    try {
        if (!auth || !SHEET_ID) {
            return res.status(400).json({ 
                error: 'Google Sheets not configured',
                message: 'Cannot sync: Google Sheets integration is not set up',
                details: {
                    sheetIdConfigured: !!SHEET_ID,
                    credentialsConfigured: !!credentials && !credentialsError,
                    authInitialized: !!auth
                },
                fix: 'Please configure GOOGLE_SHEET_ID and GOOGLE_APPLICATION_CREDENTIALS. Check /api/health for details.'
            });
        }

        const authClient = await auth.getClient();
        const response = await retryOperation(async () => {
            return await sheets.spreadsheets.values.get({
                auth: authClient,
                spreadsheetId: SHEET_ID,
                range: RANGE,
            });
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
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('='.repeat(60));
    
    if (isConfigured) {
        console.log('✅ Google Sheets Integration: ACTIVE');
        console.log(`   Sheet ID: ${SHEET_ID}`);
        console.log(`   Range: ${RANGE}`);
        console.log('   Write access: Enabled');
        console.log('   📝 Check-in status will be saved to Google Sheets');
    } else {
        console.log('📱 Google Sheets Integration: DEMO MODE');
        console.log('   Using sample data for testing');
        console.log('\n   To enable Google Sheets:');
        console.log('   1. Set GOOGLE_SHEET_ID environment variable');
        console.log('   2. Set GOOGLE_APPLICATION_CREDENTIALS (file path or JSON)');
        console.log('   3. Restart the server');
        console.log('\n   Check /api/health for detailed configuration status');
    }
    
    if (configValidation.errors.length > 0 || credentialsError || authError) {
        console.log('\n   ⚠️  Configuration Issues Detected:');
        if (configValidation.errors.length > 0) {
            configValidation.errors.forEach(err => console.log(`      - ${err}`));
        }
        if (credentialsError) {
            console.log(`      - ${credentialsError}`);
        }
        if (authError) {
            console.log(`      - ${authError}`);
        }
    }
    
    console.log('='.repeat(60));
    console.log(`🌐 Open http://localhost:${PORT} in your browser`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log('='.repeat(60) + '\n');
}); 