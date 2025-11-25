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
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets', // Sheets API access
    'https://www.googleapis.com/auth/script.projects' // Apps Script API access (optional, for calling Apps Script functions)
];
// Legacy: Support environment variables for backward compatibility
const DEFAULT_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const DEFAULT_RANGE = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:Z';
// Check-in time logging configuration
const DISABLE_CHECKIN_TIME_LOGGING = process.env.DISABLE_CHECKIN_TIME_LOGGING === 'true' || process.env.DISABLE_CHECKIN_TIME_LOGGING === '1';
// Google Apps Script webhook configuration
const APPS_SCRIPT_WEBHOOK_URL = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL;

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
        let authClient;
        try {
            authClient = await auth.getClient();
        } catch (authError) {
            return {
                valid: false,
                error: 'Authentication failed. Please check your Google Sheets credentials.',
                authError: true,
                errorCode: authError.code
            };
        }
        
        await retryOperation(async () => {
            return await sheets.spreadsheets.values.get({
                auth: authClient,
                spreadsheetId: sheetId,
                range: range,
            });
        });
        return { valid: true };
    } catch (error) {
        let errorMessage = error.message;
        let errorType = 'unknown';
        
        if (error.code === 401) {
            errorMessage = 'Authentication failed. Please check your Google Sheets credentials.';
            errorType = 'authentication';
        } else if (error.code === 403) {
            errorMessage = 'Permission denied. Ensure the sheet is shared with the service account email and the service account has Editor access.';
            errorType = 'permission';
        } else if (error.code === 404) {
            errorMessage = 'Sheet not found. Please verify the Sheet ID is correct.';
            errorType = 'not_found';
        } else if (error.code === 429) {
            errorMessage = 'Rate limit exceeded. Please try again in a moment.';
            errorType = 'rate_limit';
        } else if (error.code === 503) {
            errorMessage = 'Google Sheets service temporarily unavailable. Please try again.';
            errorType = 'service_unavailable';
        }
        
        return { 
            valid: false, 
            error: errorMessage,
            errorType: errorType,
            errorCode: error.code
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

// Retry helper function for Google Sheets API calls with improved error handling
async function retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            // Don't retry on authentication/authorization errors (401, 403)
            if (error.code === 401 || error.code === 403) {
                console.error(`Authentication/Authorization error (${error.code}):`, error.message);
                throw error;
            }
            
            // Don't retry on client errors (400, 404) - these won't be fixed by retrying
            if (error.code === 400 || error.code === 404) {
                console.error(`Client error (${error.code}):`, error.message);
                throw error;
            }
            
            // If this is the last attempt, throw the error
            if (attempt === maxRetries) {
                console.error(`Max retries (${maxRetries}) reached. Final error:`, error.message);
                throw error;
            }
            
            // Calculate delay with exponential backoff and jitter
            let delay;
            if (error.code === 429 || error.code === 503) {
                // Rate limit or service unavailable - use longer exponential backoff
                const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
                const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
                delay = exponentialDelay + jitter;
                console.log(`Rate limit/service unavailable (${error.code}). Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms`);
            } else {
                // Other errors - use linear backoff
                delay = baseDelay * attempt;
                console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms. Error:`, error.message);
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Helper function to call Google Apps Script functions
// Requires: Apps Script API enabled in Google Cloud Console
// Usage: await callAppsScriptFunction('SCRIPT_ID', 'functionName', [param1, param2])
async function callAppsScriptFunction(scriptId, functionName, parameters = []) {
    if (!auth || !scriptId || !functionName) {
        throw new Error('Apps Script call requires auth, scriptId, and functionName');
    }
    
    try {
        const authClient = await auth.getClient();
        const script = google.script({ version: 'v1', auth: authClient });
        
        const request = {
            scriptId: scriptId,
            resource: {
                function: functionName,
                parameters: parameters
            }
        };
        
        const response = await retryOperation(async () => {
            return await script.scripts.run(request);
        });
        
        if (response.data.error) {
            throw new Error(`Apps Script error: ${JSON.stringify(response.data.error)}`);
        }
        
        return {
            success: true,
            result: response.data.response?.result,
            error: response.data.error
        };
    } catch (error) {
        console.error('Error calling Apps Script function:', error);
        throw error;
    }
}

// Helper to invoke Google Apps Script web app endpoints (HTTP POST)
async function notifyAppsScriptWebhook(payload) {
    if (!APPS_SCRIPT_WEBHOOK_URL) {
        return { success: false, skipped: true, reason: 'Webhook URL not configured' };
    }

    try {
        const response = await fetch(APPS_SCRIPT_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const rawBody = await response.text();
        let parsedBody = null;
        try {
            parsedBody = rawBody ? JSON.parse(rawBody) : null;
        } catch (parseError) {
            parsedBody = rawBody;
        }

        if (!response.ok) {
            throw new Error(`Webhook request failed with status ${response.status}: ${rawBody}`);
        }

        return { success: true, response: parsedBody };
    } catch (error) {
        console.error('Apps Script webhook error:', error.message);
        return { success: false, error: error.message };
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
            h && (h.trim().toLowerCase().includes('check-in') || 
                  h.trim().toLowerCase().includes('checked') || 
                  h.trim().toLowerCase().includes('attendance'))
        );
        
        let checkInTimeCol = headers.findIndex(h => 
            h && (h.trim().toLowerCase().includes('time') || 
                  h.trim().toLowerCase().includes('timestamp'))
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
                    h && (h.trim().toLowerCase().includes('check-in') || 
                          h.trim().toLowerCase().includes('checked') || 
                          h.trim().toLowerCase().includes('attendance'))
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
                    h && (h.trim().toLowerCase().includes('check-in') || 
                          h.trim().toLowerCase().includes('checked') || 
                          h.trim().toLowerCase().includes('attendance'))
                );
            }
        }

        // Only create check-in time column if time logging is enabled
        if (checkInTimeCol === -1 && !DISABLE_CHECKIN_TIME_LOGGING) {
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
                    h && (h.trim().toLowerCase().includes('time') || 
                          h.trim().toLowerCase().includes('timestamp'))
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
                    h && (h.trim().toLowerCase().includes('time') || 
                          h.trim().toLowerCase().includes('timestamp'))
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
        const sheetName = (range && range.includes('!'))
            ? range.split('!')[0]
            : (range || 'Sheet1');
        const sheetRowNumber = rowIndex + 1; // +1 to account for header row

        // Get auth client with error handling
        let authClient;
        try {
            authClient = await auth.getClient();
        } catch (authError) {
            console.error('Failed to get authentication client:', authError.message);
            return { 
                success: false, 
                error: 'Authentication failed. Please check your Google Sheets credentials.',
                authError: true
            };
        }
        
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

        // Update check-in time with retry (if column exists and time logging is enabled)
        if (timeRange && checkInTimeCol !== -1 && !DISABLE_CHECKIN_TIME_LOGGING) {
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
        return { success: true, sheetName, sheetRowNumber };
        
    } catch (error) {
        console.error('Error updating Google Sheet:', error);
        
        // Provide user-friendly error messages based on error type
        let userMessage = error.message;
        let errorType = 'unknown';
        
        if (error.code === 401) {
            userMessage = 'Authentication failed. Please check your Google Sheets credentials.';
            errorType = 'authentication';
        } else if (error.code === 403) {
            userMessage = 'Permission denied. Ensure the service account has Editor access to the sheet.';
            errorType = 'permission';
        } else if (error.code === 429) {
            userMessage = 'Rate limit exceeded. Please try again in a moment.';
            errorType = 'rate_limit';
        } else if (error.code === 503) {
            userMessage = 'Google Sheets service temporarily unavailable. Please try again.';
            errorType = 'service_unavailable';
        } else if (error.code === 404) {
            userMessage = 'Sheet not found. Please verify the Sheet ID is correct.';
            errorType = 'not_found';
        } else if (error.message && error.message.includes('network') || error.message.includes('timeout')) {
            userMessage = 'Network error. Please check your connection and try again.';
            errorType = 'network';
        }
        
        return { 
            success: false, 
            error: userMessage,
            errorType: errorType,
            errorCode: error.code
        };
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
    let authClient;
    try {
        authClient = await auth.getClient();
    } catch (authError) {
        console.error('Failed to get authentication client in getAttendees:', authError.message);
        throw new Error('Authentication failed. Please check your Google Sheets credentials.');
    }
    
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
        h && (h.trim().toLowerCase().includes('check-in') || 
              h.trim().toLowerCase().includes('checked') || 
              h.trim().toLowerCase().includes('attendance'))
    );
    
    const checkInTimeCol = headers.findIndex(h => 
        h && (h.trim().toLowerCase().includes('time') || 
              h.trim().toLowerCase().includes('timestamp'))
    );

    const attendees = rows.slice(1).map((row, index) => {
        const attendee = {
            id: index + 1
        };
        
        // Read check-in status directly from Google Sheet (source of truth)
        if (checkInStatusCol !== -1 && row[checkInStatusCol] !== undefined && row[checkInStatusCol] !== '') {
            const status = row[checkInStatusCol];
            
            // Handle boolean false explicitly (Google Sheets may return boolean false)
            if (status === false) {
                attendee.checkedIn = false;
                attendee.checkInTime = null;
            } else {
                // Check for positive values
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
            }
        } else if (checkInStatusCol !== -1 && row[checkInStatusCol] === false) {
            // Handle explicit false boolean value (when cell is empty but column exists)
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
                // Trim whitespace from header before normalizing
                const normalizedHeader = header ? header.trim().toLowerCase().replace(/\s+/g, '_') : '';
                if (normalizedHeader) {
                    attendee[normalizedHeader] = row[colIndex];
                }
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
        
        // Test authentication
        try {
            const testAuthClient = await auth.getClient();
            health.authentication = {
                status: 'ok',
                message: 'Authentication client initialized successfully'
            };
        } catch (authTestError) {
            health.authentication = {
                status: 'error',
                message: 'Failed to initialize authentication client',
                error: authTestError.message,
                errorCode: authTestError.code
            };
            health.status = 'degraded';
        }
        
        // If sheetId provided, validate access
        if (sheetId) {
            const validation = await validateSheetAccess(sheetId);
            health.sheetValidation = validation;
            if (!validation.valid) {
                health.status = 'degraded';
            }
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
        
        let statusCode = 500;
        let errorMessage = 'Failed to fetch attendees: ' + error.message;
        
        if (error.message.includes('Authentication failed')) {
            statusCode = 401;
            errorMessage = 'Authentication failed. Please check your Google Sheets credentials.';
        } else if (error.message.includes('not configured')) {
            statusCode = 503;
            errorMessage = 'Google Sheets integration not configured.';
        }
        
        res.status(statusCode).json({ 
            error: errorMessage,
            errorCode: error.code
        });
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
        
        let statusCode = 500;
        let errorMessage = 'Failed to search attendees';
        
        if (error.message && error.message.includes('Authentication failed')) {
            statusCode = 401;
            errorMessage = 'Authentication failed. Please check your Google Sheets credentials.';
        } else if (error.message && error.message.includes('not configured')) {
            statusCode = 503;
            errorMessage = 'Google Sheets integration not configured.';
        } else if (error.message) {
            errorMessage = 'Failed to search attendees: ' + error.message;
        }
        
        res.status(statusCode).json({ 
            error: errorMessage,
            errorCode: error.code
        });
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
            // Determine appropriate status code based on error type
            let statusCode = 500;
            if (sheetUpdate.errorType === 'authentication') {
                statusCode = 401;
            } else if (sheetUpdate.errorType === 'permission') {
                statusCode = 403;
            } else if (sheetUpdate.errorType === 'rate_limit' || sheetUpdate.errorType === 'service_unavailable') {
                statusCode = 503;
            } else if (sheetUpdate.errorType === 'not_found') {
                statusCode = 404;
            }
            
            // For non-critical errors, still update local cache but warn user
            // For auth/permission errors, don't cache (they need to be fixed)
            if (sheetUpdate.errorType !== 'authentication' && sheetUpdate.errorType !== 'permission') {
                console.warn(`Sheet update failed for attendee ${attendeeId}, but updating local cache`);
                if (checkedIn) {
                    attendanceData.set(attendeeId, checkInTime);
                } else {
                    attendanceData.delete(attendeeId);
                }
            }
            
            return res.status(statusCode).json({ 
                success: false, 
                error: sheetUpdate.error || 'Failed to update Google Sheet',
                errorType: sheetUpdate.errorType,
                errorCode: sheetUpdate.errorCode,
                checkedIn: checkedIn,
                checkInTime: checkInTime,
                warning: (sheetUpdate.errorType !== 'authentication' && sheetUpdate.errorType !== 'permission') 
                    ? 'Check-in saved locally but may not be synced to sheet' 
                    : undefined
            });
        }
        
        // Update local cache only after successful sheet update
        if (checkedIn) {
            attendanceData.set(attendeeId, checkInTime);
        } else {
            attendanceData.delete(attendeeId);
        }
        
        // Notify Apps Script webhook after check-in (only when marking as checked-in)
        let webhookStatus = null;
        if (checkedIn) {
            const derivedSheetName = sheetUpdate.sheetName || ((targetRange && targetRange.includes('!')) ? targetRange.split('!')[0] : (targetRange || 'Sheet1'));
            const derivedRowIndex = sheetUpdate.sheetRowNumber || (attendeeId + 1);
            const payload = {
                sheetName: derivedSheetName,
                rowIndex: derivedRowIndex
            };
            const webhookResponse = await notifyAppsScriptWebhook(payload);
            webhookStatus = webhookResponse;
            if (!webhookResponse.success && !webhookResponse.skipped) {
                console.warn('Apps Script webhook notification failed:', webhookResponse.error);
            }
        }
        
        // Calculate updated count from Google Sheets (source of truth)
        let totalCheckedIn = attendanceData.size; // Fallback to cache
        try {
            const attendees = await getAttendees(targetSheetId, targetRange);
            const checkedInAttendees = attendees.filter(a => a.checkedIn);
            totalCheckedIn = checkedInAttendees.length;
        } catch (error) {
            // If we can't fetch from sheet, use cache count
            console.warn('Could not fetch updated count from sheet, using cache:', error.message);
        }
        
        res.json({ 
            success: true, 
            checkedIn: checkedIn,
            checkInTime: checkInTime,
            totalCheckedIn: totalCheckedIn,
            webhookStatus: webhookStatus && !webhookStatus.skipped ? webhookStatus : undefined
        });
    } catch (error) {
        console.error('Error in check-in endpoint:', error);
        
        let statusCode = 500;
        let errorMessage = 'Internal server error: ' + error.message;
        
        if (error.message && error.message.includes('Authentication failed')) {
            statusCode = 401;
            errorMessage = 'Authentication failed. Please check your Google Sheets credentials.';
        } else if (error.code === 429) {
            statusCode = 503;
            errorMessage = 'Rate limit exceeded. Please try again in a moment.';
        } else if (error.code === 503) {
            statusCode = 503;
            errorMessage = 'Google Sheets service temporarily unavailable. Please try again.';
        }
        
        res.status(statusCode).json({ 
            success: false, 
            error: errorMessage,
            errorCode: error.code
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

        let authClient;
        try {
            authClient = await auth.getClient();
        } catch (authError) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Cannot sync: Failed to authenticate with Google Sheets',
                fix: 'Please check your GOOGLE_APPLICATION_CREDENTIALS. Check /api/health for details.'
            });
        }
        
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
            h && (h.trim().toLowerCase().includes('check-in') || 
                  h.trim().toLowerCase().includes('checked') || 
                  h.trim().toLowerCase().includes('attendance'))
        );
        
        const checkInTimeCol = headers.findIndex(h => 
            h && (h.trim().toLowerCase().includes('time') || 
                  h.trim().toLowerCase().includes('timestamp'))
        );

        if (checkInStatusCol !== -1) {
            // Clear existing attendance data
            attendanceData.clear();
            
            // Sync from sheet
            rows.slice(1).forEach((row, index) => {
                const status = row[checkInStatusCol];
                const time = checkInTimeCol !== -1 ? row[checkInTimeCol] : null;
                
                // Accept 'checked', 'yes', boolean true, string 'true' (case-insensitive), and 1 as checked-in
                // Explicitly handle boolean false
                if (status === false) {
                    // Explicitly not checked in
                } else if (
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
        
        let statusCode = 500;
        let errorMessage = 'Failed to sync from sheet';
        
        if (error.code === 401) {
            statusCode = 401;
            errorMessage = 'Authentication failed. Please check your Google Sheets credentials.';
        } else if (error.code === 403) {
            statusCode = 403;
            errorMessage = 'Permission denied. Ensure the service account has Editor access to the sheet.';
        } else if (error.code === 404) {
            statusCode = 404;
            errorMessage = 'Sheet not found. Please verify the Sheet ID is correct.';
        } else if (error.code === 429) {
            statusCode = 503;
            errorMessage = 'Rate limit exceeded. Please try again in a moment.';
        } else if (error.code === 503) {
            statusCode = 503;
            errorMessage = 'Google Sheets service temporarily unavailable. Please try again.';
        } else if (error.message) {
            errorMessage = 'Failed to sync from sheet: ' + error.message;
        }
        
        res.status(statusCode).json({ 
            error: errorMessage,
            errorCode: error.code
        });
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