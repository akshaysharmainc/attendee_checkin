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
// Legacy: Support environment variables for backward compatibility
const DEFAULT_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const DEFAULT_RANGE = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:Z';

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

// Helper function to validate sheet access
async function validateSheetAccess(sheetId, range = DEFAULT_RANGE) {
    if (!auth || !sheets || !sheetId) {
        return { valid: false, error: 'Google Sheets not configured or sheet ID not provided' };
    }
    
    try {
        const authClient = await auth.getClient();
        await retryOperation(async () => {
            return await sheets.spreadsheets.values.get({
                auth: authClient,
                spreadsheetId: sheetId,
                range: range,
            });
        });
        return { valid: true };
    } catch (error) {
        if (error.code === 403 || error.code === 404) {
            return { 
                valid: false, 
                error: `Cannot access sheet. Ensure the sheet is shared with the service account email and the sheet ID is correct.` 
            };
        }
        return { 
            valid: false, 
            error: `Error accessing sheet: ${error.message}` 
        };
    }
}

if (DEFAULT_SHEET_ID && credentials && !credentialsError) {
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
        if (DEFAULT_SHEET_ID) {
            console.log(`   Default Sheet ID: ${DEFAULT_SHEET_ID}`);
            console.log(`   Default Range: ${DEFAULT_RANGE}`);
        } else {
            console.log('   Sheet ID will be provided by frontend');
        }
    } catch (error) {
        authError = `Failed to initialize Google Auth: ${error.message}`;
        console.error(`❌ ${authError}`);
        console.log('⚠️  Using demo mode due to authentication error');
    }
} else {
    const reasons = [];
    if (!credentials || credentialsError) {
        reasons.push(credentialsError || 'GOOGLE_APPLICATION_CREDENTIALS not configured');
    }
    if (reasons.length > 0) {
        console.log(`⚠️  Google Sheets credentials not configured: ${reasons.join(', ')}`);
        console.log('📱 Running in demo mode with sample data');
    } else {
        console.log('✅ Google Sheets credentials configured');
        console.log('   Sheet ID will be provided by frontend');
    }
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

// Helper function to convert column index (0-based) to Google Sheets column letter (A, B, ..., Z, AA, AB, ...)
function columnIndexToLetter(index) {
    let result = '';
    index++; // Convert to 1-based
    while (index > 0) {
        index--; // Convert to 0-based for modulo
        result = String.fromCharCode(65 + (index % 26)) + result;
        index = Math.floor(index / 26);
    }
    return result;
}

// Function to ensure check-in columns exist (idempotent)
async function ensureCheckInColumns(authClient, sheetId, range) {
    try {
        const response = await sheets.spreadsheets.values.get({
            auth: authClient,
            spreadsheetId: sheetId,
            range: range,
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

        // Helper function to find the first empty column (no header, no data)
        const findEmptyColumn = (startFrom = 0) => {
            // Check up to 100 columns beyond the current range to find an empty one
            const maxCheck = Math.max(headers.length + 100, 100);
            for (let i = startFrom; i < maxCheck; i++) {
                // Check if this column index exists in headers and is empty
                if (i >= headers.length) {
                    // Beyond current range - this is safe to use
                    return i;
                }
                // Check if header is empty or undefined
                if (!headers[i] || headers[i].trim() === '') {
                    // Also check if there's any data in this column (check a few rows)
                    let hasData = false;
                    for (let rowIdx = 1; rowIdx < Math.min(rows.length, 10); rowIdx++) {
                        if (rows[rowIdx] && rows[rowIdx][i] !== undefined && rows[rowIdx][i] !== '') {
                            hasData = true;
                            break;
                        }
                    }
                    if (!hasData) {
                        return i;
                    }
                }
            }
            // Fallback: use the end of current headers (but this could overwrite)
            return headers.length;
        };

        // Create columns if they don't exist (idempotent - check again after potential creation)
        if (checkInStatusCol === -1) {
            const sheetName = range.split('!')[0];
            const emptyColIndex = findEmptyColumn();
            const columnLetter = columnIndexToLetter(emptyColIndex);
            const newRange = `${sheetName}!${columnLetter}1`;
            try {
                await retryOperation(async () => {
                    await sheets.spreadsheets.values.update({
                        auth: authClient,
                        spreadsheetId: sheetId,
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
                    spreadsheetId: sheetId,
                    range: range,
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
                    spreadsheetId: sheetId,
                    range: range,
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
            const sheetName = range.split('!')[0];
            // Find empty column starting after the status column (if it exists)
            const startFrom = checkInStatusCol !== -1 ? checkInStatusCol + 1 : 0;
            const emptyColIndex = findEmptyColumn(startFrom);
            const columnLetter = columnIndexToLetter(emptyColIndex);
            const newRange = `${sheetName}!${columnLetter}1`;
            try {
                await retryOperation(async () => {
                    await sheets.spreadsheets.values.update({
                        auth: authClient,
                        spreadsheetId: sheetId,
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
                    spreadsheetId: sheetId,
                    range: range,
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
                    spreadsheetId: sheetId,
                    range: range,
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
async function updateSheetCheckInStatus(rowIndex, checkedIn, checkInTime, sheetId, range) {
    if (!sheets || !auth) {
        console.log('Google Sheets not available, skipping sheet update');
        return { success: false, error: 'Google Sheets not configured' };
    }

    if (!sheetId) {
        return { success: false, error: 'Sheet ID is required' };
    }

    try {
        const authClient = await auth.getClient();
        
        // Ensure check-in columns exist (idempotent)
        const { checkInStatusCol, checkInTimeCol } = await ensureCheckInColumns(authClient, sheetId, range);
        
        if (checkInStatusCol === -1) {
            throw new Error('Could not find or create check-in status column');
        }

        // Validate row index
        const response = await retryOperation(async () => {
            return await sheets.spreadsheets.values.get({
                auth: authClient,
                spreadsheetId: sheetId,
                range: range,
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
        const sheetName = range.split('!')[0];
        const statusRange = `${sheetName}!${columnIndexToLetter(checkInStatusCol)}${rowIndex + 1}`;
        const timeRange = checkInTimeCol !== -1 
            ? `${sheetName}!${columnIndexToLetter(checkInTimeCol)}${rowIndex + 1}`
            : null;

        // Update check-in status with retry (using boolean value)
        await retryOperation(async () => {
            await sheets.spreadsheets.values.update({
                auth: authClient,
                spreadsheetId: sheetId,
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
                    spreadsheetId: sheetId,
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
async function getAttendees(sheetId, range) {
    // Use provided sheetId/range, or fall back to defaults for backward compatibility
    const targetSheetId = sheetId || DEFAULT_SHEET_ID;
    const targetRange = range || DEFAULT_RANGE;
    
    // If no sheet ID is provided and no default is configured, return demo data (demo mode)
    if (!targetSheetId) {
        if (!auth) {
            // Return demo data only when explicitly in demo mode (no auth, no sheet)
            return DEMO_ATTENDEES.map(attendee => ({
                ...attendee,
                checkedIn: attendanceData.has(attendee.id) ? true : false,
                checkInTime: attendanceData.has(attendee.id) ? attendanceData.get(attendee.id) : null
            }));
        } else {
            // Auth is configured but no sheet ID - this is an error
            throw new Error('Sheet ID is required');
        }
    }
    
    // If auth is not configured but sheet ID is provided, throw error
    if (!auth) {
        throw new Error('Google Sheets authentication not configured. Please check your credentials.');
    }
    
    // Try to fetch from Google Sheets
    const authClient = await auth.getClient();
    
    const response = await retryOperation(async () => {
        return await sheets.spreadsheets.values.get({
            auth: authClient,
            spreadsheetId: targetSheetId,
            range: targetRange,
        });
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
        // Return empty array instead of demo data when sheet is empty
        return [];
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
}

// Health check endpoint to verify Google Sheets configuration
app.get('/api/health', async (req, res) => {
    const { sheetId } = req.query;
    
    const health = {
        status: 'ok',
        credentialsConfigured: isConfigured,
        timestamp: new Date().toISOString(),
        configuration: {
            credentials: credentials ? 'configured' : 'not set',
            defaultSheetId: DEFAULT_SHEET_ID ? 'configured' : 'not set',
            mode: isConfigured ? 'frontend-provided-sheet' : 'demo'
        }
    };
    
    if (isConfigured) {
        health.message = 'Google Sheets credentials configured';
        health.details = {
            note: 'Sheet ID should be provided by frontend (URL parameter or localStorage)',
            defaultSheetId: DEFAULT_SHEET_ID || 'none'
        };
        
        // If sheetId provided, validate access
        if (sheetId) {
            const validation = await validateSheetAccess(sheetId);
            health.sheetValidation = validation;
        }
    } else {
        health.message = 'Running in demo mode';
        health.details = {
            reason: 'Google Sheets not configured',
            errors: []
        };
        
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
            '3. Set GOOGLE_APPLICATION_CREDENTIALS environment variable',
            '4. Share your Google Sheet with the service account email',
            '5. Provide Sheet ID from frontend (URL parameter or input)',
            '6. Restart the server'
        ];
    }
    
    res.json(health);
});

// Endpoint to validate sheet access
app.get('/api/sheets/validate', async (req, res) => {
    const { sheetId, range } = req.query;
    
    if (!sheetId) {
        return res.status(400).json({ 
            error: 'sheetId is required',
            valid: false 
        });
    }
    
    const targetRange = range || DEFAULT_RANGE;
    const validation = await validateSheetAccess(sheetId, targetRange);
    
    if (validation.valid) {
        res.json({ 
            valid: true, 
            message: 'Sheet access validated successfully',
            sheetId: sheetId,
            range: targetRange
        });
    } else {
        res.status(400).json({ 
            valid: false, 
            error: validation.error,
            sheetId: sheetId,
            range: targetRange
        });
    }
});

app.get('/api/attendees', async (req, res) => {
    try {
        const { sheetId, range } = req.query;
        
        if (!sheetId && !DEFAULT_SHEET_ID) {
            return res.status(400).json({ 
                error: 'Sheet ID is required. Provide sheetId as query parameter or set GOOGLE_SHEET_ID environment variable.' 
            });
        }
        
        const attendees = await getAttendees(sheetId, range);
        res.json(attendees);
    } catch (error) {
        console.error('Error fetching attendees:', error);
        res.status(500).json({ error: 'Failed to fetch attendees: ' + error.message });
    }
});

// Search attendees
app.get('/api/attendees/search', async (req, res) => {
    try {
        const { query, sheetId, range } = req.query;
        if (!query || query.trim().length === 0) {
            return res.json([]);
        }

        if (!sheetId && !DEFAULT_SHEET_ID) {
            return res.status(400).json({ 
                error: 'Sheet ID is required. Provide sheetId as query parameter or set GOOGLE_SHEET_ID environment variable.' 
            });
        }

        const attendees = await getAttendees(sheetId, range);
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
    const { checkedIn, sheetId, range } = req.body;
    const attendeeId = parseInt(id);
    
    const targetSheetId = sheetId || DEFAULT_SHEET_ID;
    const targetRange = range || DEFAULT_RANGE;
    
    if (!targetSheetId) {
        return res.status(400).json({ 
            success: false,
            error: 'Sheet ID is required. Provide sheetId in request body or set GOOGLE_SHEET_ID environment variable.' 
        });
    }
    
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
        const sheetUpdate = await updateSheetCheckInStatus(attendeeId, checkedIn, checkInTime, targetSheetId, targetRange);
        
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
        const { sheetId, range } = req.query;
        const targetSheetId = sheetId || DEFAULT_SHEET_ID;
        
        // Read from Google Sheets (source of truth) if available
        if (auth && targetSheetId) {
            const attendees = await getAttendees(targetSheetId, range);
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
        const { sheetId, range } = req.body;
        const targetSheetId = sheetId || DEFAULT_SHEET_ID;
        const targetRange = range || DEFAULT_RANGE;
        
        if (!auth) {
            return res.status(400).json({ 
                error: 'Google Sheets not configured',
                message: 'Cannot sync: Google Sheets integration is not set up',
                details: {
                    credentialsConfigured: !!credentials && !credentialsError,
                    authInitialized: !!auth
                },
                fix: 'Please configure GOOGLE_APPLICATION_CREDENTIALS. Check /api/health for details.'
            });
        }
        
        if (!targetSheetId) {
            return res.status(400).json({ 
                error: 'Sheet ID is required',
                message: 'Cannot sync: Sheet ID not provided',
                fix: 'Provide sheetId in request body or set GOOGLE_SHEET_ID environment variable.'
            });
        }

        const authClient = await auth.getClient();
        const response = await retryOperation(async () => {
            return await sheets.spreadsheets.values.get({
                auth: authClient,
                spreadsheetId: targetSheetId,
                range: targetRange,
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
        if (DEFAULT_SHEET_ID) {
            console.log(`   Default Sheet ID: ${DEFAULT_SHEET_ID}`);
            console.log(`   Default Range: ${DEFAULT_RANGE}`);
        } else {
            console.log('   Sheet ID: Provided by frontend (URL parameter or localStorage)');
        }
        console.log('   Write access: Enabled');
        console.log('   📝 Check-in status will be saved to Google Sheets');
    } else {
        console.log('📱 Google Sheets Integration: DEMO MODE');
        console.log('   Using sample data for testing');
        console.log('\n   To enable Google Sheets:');
        console.log('   1. Set GOOGLE_APPLICATION_CREDENTIALS (file path or JSON)');
        console.log('   2. Provide Sheet ID from frontend (URL parameter or input)');
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