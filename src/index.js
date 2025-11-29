import './styles.css';

// Constants
const DEFAULT_SHEET_RANGE = 'Sheet1!A:Z';

class AttendeeCheckInApp {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.checkedInCount = document.getElementById('checkedInCount');
        this.syncButton = document.getElementById('syncButton');
        this.showDetailsToggle = document.getElementById('showDetailsToggle');
        
        // Sheet configuration elements
        this.sheetConfigModal = document.getElementById('sheetConfigModal');
        this.sheetConfigForm = document.getElementById('sheetConfigForm');
        this.sheetIdInput = document.getElementById('sheetIdInput');
        this.rangeInput = document.getElementById('rangeInput');
        this.cancelConfigBtn = document.getElementById('cancelConfigBtn');
        this.configGearBtn = document.getElementById('configGearBtn');
        this.configError = document.getElementById('configError');
        
        this.searchTimeout = null;
        
        // Sheet configuration
        this.sheetId = null;
        this.sheetRange = DEFAULT_SHEET_RANGE;
        this.webhookUrl = null;
        
        // Load show details preference from localStorage (default: true)
        this.showDetails = localStorage.getItem('showDetails') !== 'false';
        if (this.showDetailsToggle) {
            this.showDetailsToggle.checked = this.showDetails;
        }
        
        this.init();
    }

    init() {
        this.loadSheetConfiguration();
        this.bindEvents();
        
        // Only load data if sheet is configured
        if (this.sheetId) {
            this.loadAttendanceSummary();
            this.loadDefaultResults();
            
            // Poll attendance summary every 13 seconds to keep count updated
            this.attendanceSummaryInterval = setInterval(() => {
                this.loadAttendanceSummary();
            }, 23000);
            
            // Auto-refresh attendee list every 30 seconds to pick up external changes
            this.autoRefreshInterval = setInterval(() => {
                this.autoRefreshAttendeeList();
            }, 45000); // 30 seconds
        } else {
            // Show configuration modal if no sheet ID found
            this.showSheetConfigModal();
        }
    }
    
    loadSheetConfiguration() {
        // Priority 1: Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const sheetIdFromUrl = urlParams.get('sheetId');
        const rangeFromUrl = urlParams.get('range');
        const webhookUrlFromUrl = urlParams.get('webhookUrl');
        
        if (sheetIdFromUrl) {
            this.sheetId = sheetIdFromUrl;
            this.sheetRange = rangeFromUrl || DEFAULT_SHEET_RANGE;
            // Save to localStorage for persistence
            localStorage.setItem('googleSheetId', this.sheetId);
            localStorage.setItem('googleSheetRange', this.sheetRange);
        }
        
        // Load webhook URL from URL parameter or localStorage
        if (webhookUrlFromUrl) {
            this.webhookUrl = webhookUrlFromUrl;
            localStorage.setItem('appsScriptWebhookUrl', this.webhookUrl);
        } else {
            const storedWebhookUrl = localStorage.getItem('appsScriptWebhookUrl');
            if (storedWebhookUrl) {
                this.webhookUrl = storedWebhookUrl;
            }
        }
        
        // Priority 2: Check localStorage for sheet config
        if (!this.sheetId) {
            const storedSheetId = localStorage.getItem('googleSheetId');
            const storedRange = localStorage.getItem('googleSheetRange');
            
            if (storedSheetId) {
                this.sheetId = storedSheetId;
                this.sheetRange = storedRange || DEFAULT_SHEET_RANGE;
            }
        }
        
        // Priority 3: No configuration found - will show modal
        if (!this.sheetId) {
            this.sheetId = null;
        }
    }
    
    showSheetConfigModal() {
        if (this.sheetConfigModal) {
            this.sheetConfigModal.style.display = 'flex';
            if (this.sheetIdInput && this.sheetId) {
                this.sheetIdInput.value = this.sheetId;
            }
            if (this.rangeInput && this.sheetRange) {
                this.rangeInput.value = this.sheetRange;
            }
        }
    }
    
    hideSheetConfigModal() {
        if (this.sheetConfigModal) {
            this.sheetConfigModal.style.display = 'none';
            this.configError.style.display = 'none';
        }
    }
    
    async validateAndSetSheet(sheetId, range) {
        try {
            // Validate sheet access
            const response = await fetch(`/api/sheets/validate?sheetId=${encodeURIComponent(sheetId)}&range=${encodeURIComponent(range || DEFAULT_SHEET_RANGE)}`);
            const data = await response.json();
            
            if (data.valid) {
                this.sheetId = sheetId;
                this.sheetRange = range || DEFAULT_SHEET_RANGE;
                
                // Save to localStorage
                localStorage.setItem('googleSheetId', this.sheetId);
                localStorage.setItem('googleSheetRange', this.sheetRange);
                
                // Update URL without reload (optional - for sharing)
                const url = new URL(window.location);
                url.searchParams.set('sheetId', this.sheetId);
                if (this.sheetRange !== DEFAULT_SHEET_RANGE) {
                    url.searchParams.set('range', this.sheetRange);
                }
                window.history.replaceState({}, '', url);
                
                this.hideSheetConfigModal();
                
                // Load data
                this.loadAttendanceSummary();
                this.loadDefaultResults();
                
                // Start polling
                if (!this.attendanceSummaryInterval) {
                    this.attendanceSummaryInterval = setInterval(() => {
                        this.loadAttendanceSummary();
                    }, 23000);
                }
                
                if (!this.autoRefreshInterval) {
                    this.autoRefreshInterval = setInterval(() => {
                        this.autoRefreshAttendeeList();
                    }, 45000);
                }
                
                return true;
            } else {
                this.showConfigError(data.error || 'Failed to validate sheet access');
                return false;
            }
        } catch (error) {
            console.error('Validation error:', error);
            this.showConfigError('Failed to connect to sheet. Please check your Sheet ID and ensure the sheet is shared with the service account.');
            return false;
        }
    }
    
    showConfigError(message) {
        if (this.configError) {
            this.configError.textContent = message;
            this.configError.style.display = 'block';
        }
    }

    bindEvents() {
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
            this.updateClearButton(e.target.value);
        });

        this.searchInput.addEventListener('focus', () => {
            this.searchInput.parentElement.classList.add('focused');
        });

        this.searchInput.addEventListener('blur', () => {
            this.searchInput.parentElement.classList.remove('focused');
        });

        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => {
                this.searchInput.value = '';
                this.searchInput.focus();
                this.handleSearch('');
                this.updateClearButton('');
            });
        }

        this.syncButton.addEventListener('click', () => {
            this.syncFromSheet();
        });

        if (this.showDetailsToggle) {
            this.showDetailsToggle.addEventListener('change', (e) => {
                this.showDetails = e.target.checked;
                localStorage.setItem('showDetails', this.showDetails);
                this.updateDetailsVisibility();
            });
        }
        
        // Sheet configuration events
        if (this.sheetConfigForm) {
            this.sheetConfigForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const sheetId = this.sheetIdInput.value.trim();
                const range = this.rangeInput.value.trim() || DEFAULT_SHEET_RANGE;
                
                if (!sheetId) {
                    this.showConfigError('Sheet ID is required');
                    return;
                }
                
                await this.validateAndSetSheet(sheetId, range);
            });
        }
        
        if (this.cancelConfigBtn) {
            this.cancelConfigBtn.addEventListener('click', () => {
                if (this.sheetId) {
                    this.hideSheetConfigModal();
                } else {
                    // Can't cancel if no sheet configured - show error
                    this.showConfigError('Sheet ID is required to use the application');
                }
            });
        }
        
        if (this.configGearBtn) {
            this.configGearBtn.addEventListener('click', () => {
                this.showSheetConfigModal();
            });
        }
    }

    updateClearButton(value) {
        if (this.clearSearchBtn) {
            this.clearSearchBtn.style.display = value.trim().length > 0 ? 'flex' : 'none';
        }
    }

    async handleSearch(query) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Debounce search to avoid too many API calls
        this.searchTimeout = setTimeout(async () => {
            if (query.trim().length === 0) {
                // When search is cleared, show default results again
                await this.loadDefaultResults();
                return;
            }

            try {
                const results = await this.searchAttendees(query);
                this.displayResults(results);
            } catch (error) {
                console.error('Search error:', error);
                this.showError(error.message || 'Failed to search attendees');
                // Clear results on error to avoid showing stale/misleading data
                this.showEmptyState();
            }
        }, 300);
    }

    async searchAttendees(query) {
        if (!this.sheetId) {
            throw new Error('Sheet not configured');
        }
        const url = `/api/attendees/search?query=${encodeURIComponent(query)}&sheetId=${encodeURIComponent(this.sheetId)}&range=${encodeURIComponent(this.sheetRange)}`;
        const response = await fetch(url);
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to search attendees' }));
            const errorMsg = error.error || 'Failed to search attendees';
            // Provide more specific error message for connection issues
            if (errorMsg.includes('Failed to fetch') || errorMsg.includes('network')) {
                throw new Error('Connection failed. Please check your internet connection and try again.');
            }
            throw new Error(errorMsg);
        }
        return await response.json();
    }

    async loadDefaultResults() {
        if (!this.sheetId) {
            return;
        }
        try {
            // Load all attendees on page load
            const url = `/api/attendees?sheetId=${encodeURIComponent(this.sheetId)}&range=${encodeURIComponent(this.sheetRange)}`;
            const response = await fetch(url);
            if (response.ok) {
                const results = await response.json();
                // Show all results if available, otherwise show empty state
                if (results && results.length > 0) {
                    this.displayResults(results);
                } else {
                    this.showEmptyState();
                }
            } else {
                const error = await response.json().catch(() => ({ error: 'Failed to load attendees' }));
                if (error.error && error.error.includes('Sheet ID is required')) {
                    this.showSheetConfigModal();
                } else {
                    const errorMsg = error.error || 'Failed to load attendees from Google Sheet';
                    this.showError(errorMsg);
                    this.showEmptyState();
                }
            }
        } catch (error) {
            console.error('Failed to load default results:', error);
            this.showError('Failed to connect to Google Sheet. Please check your connection and try again.');
            this.showEmptyState();
        }
    }

    displayResults(attendees) {
        if (attendees.length === 0) {
            this.showNoResults();
            return;
        }

        const resultsHTML = attendees.map(attendee => this.createAttendeeRow(attendee)).join('');
        this.searchResults.innerHTML = resultsHTML;

        // Bind checkbox events
        this.bindCheckboxEvents();
        
        // Update details visibility based on toggle state
        this.updateDetailsVisibility();
        
        // Update attendance summary when results are displayed
        this.loadAttendanceSummary();
    }

    updateDetailsVisibility() {
        const detailsSections = document.querySelectorAll('.attendee-details');
        detailsSections.forEach(section => {
            if (this.showDetails) {
                section.style.display = 'flex';
            } else {
                section.style.display = 'none';
            }
        });
    }

    createAttendeeRow(attendee) {
        // Find all color, print, and spoc fields to exclude from details section
        const colorFields = Object.keys(attendee).filter(key => 
            (key.toLowerCase().includes('color') || key.toLowerCase().includes('colour')) &&
            !['id', 'checkedIn', 'checkInTime'].includes(key)
        );
        const printFields = Object.keys(attendee).filter(key => 
            (key.toLowerCase().includes('print') || key.toLowerCase().includes('printed')) &&
            !['id', 'checkedIn', 'checkInTime'].includes(key)
        );
        const spocField = Object.keys(attendee).find(key => 
            (key.toLowerCase().includes('spoc') || key.toLowerCase().includes('host')) &&
            !['id', 'checkedIn', 'checkInTime'].includes(key)
        );
        
        // Get all attendee details (excluding internal fields and top section fields)
        const detailFields = Object.keys(attendee).filter(key => 
            !['id', 'checkedIn', 'checkInTime'].includes(key) &&
            !colorFields.includes(key) &&
            !printFields.includes(key) &&
            key !== spocField
        );

        const detailsHTML = detailFields
            .filter(field => attendee[field] && String(attendee[field]).trim())
            .map(field => `
                <span class="detail-item">
                    <span class="detail-label">${this.formatFieldName(field)}:</span>
                    <span class="detail-value">${attendee[field]}</span>
                </span>
            `)
            .join('');

        return `
            <div class="attendee-row ${attendee.checkedIn ? 'checked-in' : ''}" data-id="${attendee.id}">
                <div class="attendee-main">
                    <div class="checkbox-container">
                        <input 
                            type="checkbox" 
                            id="check-${attendee.id}" 
                            class="checkin-checkbox"
                            ${attendee.checkedIn ? 'checked' : ''}
                        >
                        <label for="check-${attendee.id}" class="checkbox-label">
                            <i class="fas fa-check"></i>
                        </label>
                    </div>
                    <div class="attendee-info">
                        <div class="attendee-header-row">
                            <div class="attendee-name">
                                ${this.getDisplayName(attendee)}
                            </div>
                            <div class="attendee-company">
                                ${this.getDisplayCompany(attendee)}
                            </div>
                            ${printFields.length > 0 && attendee[printFields[0]] !== undefined && attendee[printFields[0]] !== null && attendee[printFields[0]] !== '' ? (() => {
                                const printField = printFields[0];
                                const printValue = attendee[printField];
                                const displayValue = typeof printValue === 'boolean' 
                                    ? (printValue ? 'Yes' : 'No')
                                    : String(printValue);
                                
                                const isPrinted = printValue === true || 
                                    String(printValue).toLowerCase() === 'yes' || 
                                    String(printValue).toLowerCase() === 'true' ||
                                    String(printValue).toLowerCase() === 'printed';
                                
                                return `
                                    <div class="attendee-print-header">
                                        <span class="print-badge ${isPrinted ? 'printed' : 'not-printed'}">${displayValue}</span>
                                    </div>
                                `;
                            })() : ''}
                            ${this.getDisplaySpoc(attendee) ? `
                                <div class="attendee-spoc">
                                    <span class="spoc-label">SPOC:</span>
                                    <span class="spoc-value">${this.getDisplaySpoc(attendee)}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${colorFields.length > 0 ? (() => {
                            const colorPills = colorFields
                                .filter(colorField => attendee[colorField])
                                .map(colorField => {
                                    const colorValue = attendee[colorField];
                                    const parsedColor = this.parseColorValue(colorValue);
                                    const colorLabel = this.formatFieldName(colorField);
                                    
                                    if (parsedColor) {
                                        const textColor = this.getTextColorForBackground(parsedColor);
                                        const styleAttr = `style="background-color: ${parsedColor}; color: ${textColor};"`;
                                        return `
                                            <div class="attendee-color-item">
                                                <span class="color-label">${colorLabel}:</span>
                                                <span class="color-pill" ${styleAttr}>${colorValue}</span>
                                            </div>
                                        `;
                                    }
                                    
                                    return `
                                        <div class="attendee-color-item">
                                            <span class="color-label">${colorLabel}:</span>
                                            <span class="color-pill">${colorValue}</span>
                                        </div>
                                    `;
                                })
                                .join('');
                            
                            return colorPills ? `<div class="attendee-color-row">${colorPills}</div>` : '';
                        })() : ''}
                    </div>
                </div>
                <div class="attendee-details">
                    ${detailsHTML}
                </div>
            </div>
        `;
    }

    getDisplayName(attendee) {
        return attendee.name || attendee.full_name || attendee.attendee_name || 'Name not provided';
    }

    getDisplayCompany(attendee) {
        return attendee.company || attendee.organization || attendee.employer || 'Company not provided';
    }

    getDisplaySpoc(attendee) {
        const spocField = Object.keys(attendee).find(key => 
            key.toLowerCase().includes('spoc') || key.toLowerCase().includes('host')
        );
        return spocField ? attendee[spocField] : null;
    }

    formatFieldName(field) {
        return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getTextColorForBackground(bgColor) {
        // Create a temporary element to get computed RGB values
        const tempDiv = document.createElement('div');
        tempDiv.style.backgroundColor = bgColor;
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        document.body.appendChild(tempDiv);
        
        const computedColor = window.getComputedStyle(tempDiv).backgroundColor;
        document.body.removeChild(tempDiv);
        
        // Parse RGB values from "rgb(r, g, b)" or "rgba(r, g, b, a)" format
        const rgbMatch = computedColor.match(/\d+/g);
        if (!rgbMatch || rgbMatch.length < 3) {
            return '#2d3748'; // Default dark text
        }
        
        const r = parseInt(rgbMatch[0]);
        const g = parseInt(rgbMatch[1]);
        const b = parseInt(rgbMatch[2]);
        
        // Calculate relative luminance (per WCAG)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Use white text for dark backgrounds, dark text for light backgrounds
        return luminance > 0.5 ? '#2d3748' : '#ffffff';
    }

    parseColorValue(colorValue) {
        if (!colorValue) return null;
        
        const trimmed = colorValue.trim();
        
        // First, check if it's already a valid CSS color (hex, rgb, hsl, named color)
        const testDiv = document.createElement('div');
        testDiv.style.color = trimmed;
        if (testDiv.style.color !== '') {
            return trimmed;
        }
        
        // Map common color descriptions to CSS colors
        const colorMap = {
            // Red variations
            'crimson red': 'crimson',
            'crimson': 'crimson',
            'dark red': '#8B0000',
            'light red': '#FF6B6B',
            'bright red': '#FF0000',
            'scarlet': '#FF2400',
            'burgundy': '#800020',
            
            // Blue variations
            'navy blue': '#000080',
            'sky blue': '#87CEEB',
            'royal blue': '#4169E1',
            'baby blue': '#89CFF0',
            'midnight blue': '#191970',
            'steel blue': '#4682B4',
            
            // Green variations
            'forest green': '#228B22',
            'lime green': '#32CD32',
            'olive green': '#808000',
            'emerald green': '#50C878',
            'mint green': '#98FB98',
            'sage green': '#9CAF88',
            
            // Grey/Gray variations
            'charcoal grey': '#36454F',
            'charcoal gray': '#36454F',
            'charcoal': '#36454F',
            'slate grey': '#708090',
            'slate gray': '#708090',
            'silver grey': '#C0C0C0',
            'silver gray': '#C0C0C0',
            'light grey': '#D3D3D3',
            'light gray': '#D3D3D3',
            'dark grey': '#A9A9A9',
            'dark gray': '#A9A9A9',
            
            // Other common colors
            'gold': '#FFD700',
            'silver': '#C0C0C0',
            'bronze': '#CD7F32',
            'ivory': '#FFFFF0',
            'cream': '#FFFDD0',
            'beige': '#F5F5DC',
            'tan': '#D2B48C',
            'khaki': '#F0E68C',
            'maroon': '#800000',
            'teal': '#008080',
            'turquoise': '#40E0D0',
            'coral': '#FF7F50',
            'salmon': '#FA8072',
            'lavender': '#E6E6FA',
            'violet': '#8A2BE2',
            'indigo': '#4B0082',
            'magenta': '#FF00FF',
            'fuchsia': '#FF00FF',
            'cyan': '#00FFFF',
            'aqua': '#00FFFF',
        };
        
        // Try to find a match (case-insensitive)
        const lowerValue = trimmed.toLowerCase();
        if (colorMap[lowerValue]) {
            return colorMap[lowerValue];
        }
        
        // Try to extract a base color from compound names
        // Split by space and try each word
        const words = lowerValue.split(/\s+/);
        for (const word of words) {
            if (colorMap[word]) {
                return colorMap[word];
            }
            // Try the word as a direct CSS color
            testDiv.style.color = word;
            if (testDiv.style.color !== '') {
                return word;
            }
        }
        
        // If no match found, return null to use default styling
        return null;
    }

    bindCheckboxEvents() {
        const checkboxes = document.querySelectorAll('.checkin-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleCheckIn(e.target);
            });
        });
    }

    async handleCheckIn(checkbox) {
        if (!this.sheetId) {
            this.showError('Sheet not configured');
            checkbox.checked = !checkbox.checked; // Revert checkbox
            return;
        }
        
        const attendeeId = checkbox.id.replace('check-', '');
        const checkedIn = checkbox.checked;
        const row = checkbox.closest('.attendee-row');

        // OPTIMISTIC UI UPDATE: Apply visual changes immediately
        row.classList.toggle('checked-in', checkedIn);
        if (checkedIn) {
            this.showCheckInSuccess(attendeeId);
        } else {
            this.showCheckOutSuccess(attendeeId);
        }

        // OPTIMISTIC COUNT UPDATE: Update count immediately
        const currentCount = parseInt(this.checkedInCount.textContent) || 0;
        const newCount = checkedIn ? currentCount + 1 : Math.max(0, currentCount - 1);
        this.checkedInCount.textContent = newCount;

        // Disable checkbox during request
        checkbox.disabled = true;

        try {
            const response = await fetch(`/api/attendees/${attendeeId}/checkin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    checkedIn,
                    sheetId: this.sheetId,
                    range: this.sheetRange,
                    webhookUrl: this.webhookUrl
                })
            });

            if (!response.ok) {
                // Try to parse error response, but handle network errors gracefully
                const error = await response.json().catch(() => ({ 
                    error: 'Failed to connect to Google Sheet. Please check your connection and try again.' 
                }));
                
                // ROLLBACK: Revert optimistic updates on error
                checkbox.checked = !checkedIn;
                row.classList.toggle('checked-in', !checkedIn);
                this.checkedInCount.textContent = currentCount; // Revert count
                
                const errorMsg = error.error || error.warning || 'Check-in failed';
                this.showError(errorMsg);
                if (error.warning) {
                    console.warn('Check-in warning:', error.warning);
                }
                return;
            }

            const result = await response.json();
            
            if (!result.success) {
                // ROLLBACK: Revert optimistic updates on error
                checkbox.checked = !checkedIn;
                row.classList.toggle('checked-in', !checkedIn);
                this.checkedInCount.textContent = currentCount; // Revert count
                
                const errorMsg = result.error || result.warning || 'Check-in failed';
                this.showError(errorMsg);
                if (result.warning) {
                    console.warn('Check-in warning:', result.warning);
                }
                return;
            }
            
            // SYNC: Update count with accurate value from server
            if (result.totalCheckedIn !== undefined) {
                this.checkedInCount.textContent = result.totalCheckedIn;
            }
            
        } catch (error) {
            console.error('Check-in error:', error);
            
            // ROLLBACK: Revert optimistic updates on error
            checkbox.checked = !checkedIn;
            row.classList.toggle('checked-in', !checkedIn);
            this.checkedInCount.textContent = currentCount; // Revert count
            
            const errorMsg = error.message || 'Failed to connect to Google Sheet. Please check your connection and try again.';
            this.showError('Failed to update attendance: ' + errorMsg);
        } finally {
            checkbox.disabled = false;
        }
    }

    async syncFromSheet() {
        if (!this.sheetId) {
            this.showError('Sheet not configured');
            return;
        }
        
        if (this.syncButton.classList.contains('syncing')) {
            return; // Already syncing
        }

        try {
            this.syncButton.classList.add('syncing');
            this.syncButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Syncing...</span>';

            const response = await fetch('/api/attendance/sync-from-sheet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sheetId: this.sheetId,
                    range: this.sheetRange
                })
            });

            if (!response.ok) {
                throw new Error('Sync failed');
            }

            const result = await response.json();
            
            // Show success message
            this.showSuccess(`✅ ${result.message}`);
            
            // Update attendance summary
            this.loadAttendanceSummary();
            
            // Refresh the displayed results to show updated status from sheet
            const currentQuery = this.searchInput.value.trim();
            if (currentQuery) {
                // Refresh search results
                try {
                    const results = await this.searchAttendees(currentQuery);
                    this.displayResults(results);
                } catch (searchError) {
                    // Error already shown by searchAttendees, just log
                    console.error('Failed to refresh search results after sync:', searchError);
                }
            } else {
                // Refresh default results
                await this.loadDefaultResults();
            }
            
        } catch (error) {
            console.error('Sync error:', error);
            const errorMsg = error.message || 'Failed to sync from Google Sheet';
            this.showError(errorMsg);
        } finally {
            this.syncButton.classList.remove('syncing');
            this.syncButton.innerHTML = '<i class="fas fa-sync-alt"></i><span>Sync Sheet</span>';
        }
    }

    showCheckInSuccess(attendeeId) {
        const row = document.querySelector(`[data-id="${attendeeId}"]`);
        if (row) {
            row.classList.add('checkin-success');
            setTimeout(() => {
                row.classList.remove('checkin-success');
            }, 2000);
        }
    }

    showCheckOutSuccess(attendeeId) {
        const row = document.querySelector(`[data-id="${attendeeId}"]`);
        if (row) {
            row.classList.add('checkout-success');
            setTimeout(() => {
                row.classList.remove('checkout-success');
            }, 2000);
        }
    }

    async loadAttendanceSummary() {
        if (!this.sheetId) {
            return;
        }
        try {
            const url = `/api/attendance/summary?sheetId=${encodeURIComponent(this.sheetId)}&range=${encodeURIComponent(this.sheetRange)}`;
            const response = await fetch(url);
            if (response.ok) {
                const summary = await response.json();
                // Update only the header count
                this.checkedInCount.textContent = summary.totalCheckedIn;
            } else {
                // Don't show error for summary failures (it's less critical)
                // Just log it silently to avoid spamming the user
                console.debug('Failed to load attendance summary:', response.status);
            }
        } catch (error) {
            // Don't show error for summary failures (it's less critical)
            console.debug('Failed to load attendance summary:', error);
        }
    }

    async autoRefreshAttendeeList() {
        if (!this.sheetId) {
            return;
        }
        
        // Only refresh if there are currently displayed results
        const currentQuery = this.searchInput.value.trim();
        if (currentQuery) {
            // If user is searching, refresh the search results
            try {
                const results = await this.searchAttendees(currentQuery);
                this.displayResults(results);
            } catch (error) {
                // Silently fail - don't interrupt user experience
                console.debug('Auto-refresh failed:', error);
            }
        } else {
            // If showing default results, refresh them
            try {
                await this.loadDefaultResults();
            } catch (error) {
                // Silently fail - don't interrupt user experience
                console.debug('Auto-refresh failed:', error);
            }
        }
    }

    showEmptyState() {
        // Just clear the results - no message needed
        this.searchResults.innerHTML = '';
    }

    showNoResults() {
        this.searchResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No attendees found matching your search</p>
                <small>Try a different search term</small>
            </div>
        `;
    }

    showError(message) {
        // Create a temporary error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }

    showSuccess(message) {
        // Create a temporary success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'success-notification';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(successDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AttendeeCheckInApp();
}); 