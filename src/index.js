import './styles.css';

class AttendeeCheckInApp {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
        this.searchLoading = document.getElementById('searchLoading');
        this.checkedInCount = document.getElementById('checkedInCount');
        this.syncButton = document.getElementById('syncButton');
        this.showDetailsToggle = document.getElementById('showDetailsToggle');
        
        this.searchTimeout = null;
        
        // Load show details preference from localStorage (default: true)
        this.showDetails = localStorage.getItem('showDetails') !== 'false';
        if (this.showDetailsToggle) {
            this.showDetailsToggle.checked = this.showDetails;
        }
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadAttendanceSummary();
        this.loadDefaultResults();
        
        // Poll attendance summary every 5 seconds to keep count updated
        this.attendanceSummaryInterval = setInterval(() => {
            this.loadAttendanceSummary();
        }, 5000);
    }

    bindEvents() {
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        this.searchInput.addEventListener('focus', () => {
            this.searchInput.parentElement.classList.add('focused');
        });

        this.searchInput.addEventListener('blur', () => {
            this.searchInput.parentElement.classList.remove('focused');
        });

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
    }

    async handleSearch(query) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Show loading state for short queries
        if (query.length > 0) {
            this.showLoading(true);
        }

        // Debounce search to avoid too many API calls
        this.searchTimeout = setTimeout(async () => {
            if (query.trim().length === 0) {
                // When search is cleared, show default results again
                await this.loadDefaultResults();
                this.showLoading(false);
                return;
            }

            try {
                const results = await this.searchAttendees(query);
                this.displayResults(results);
            } catch (error) {
                console.error('Search error:', error);
                this.showError('Failed to search attendees');
            } finally {
                this.showLoading(false);
            }
        }, 300);
    }

    async searchAttendees(query) {
        const response = await fetch(`/api/attendees/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Search failed');
        }
        return await response.json();
    }

    async loadDefaultResults() {
        try {
            // Load all attendees on page load
            const response = await fetch('/api/attendees');
            if (response.ok) {
                const results = await response.json();
                // Show all results if available, otherwise show empty state
                if (results && results.length > 0) {
                    this.displayResults(results);
                } else {
                    this.showEmptyState();
                }
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Failed to load default results:', error);
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

        const detailsHTML = detailFields.map(field => {
            const value = attendee[field];
            if (value && value.trim()) {
                return `<span class="detail-item">
                    <span class="detail-label">${this.formatFieldName(field)}:</span>
                    <span class="detail-value">${value}</span>
                </span>`;
            }
            return '';
        }).filter(Boolean).join('');

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
                            ${printFields.length > 0 ? (() => {
                                // Show the first print field in the header row
                                const printField = printFields[0];
                                const printValue = attendee[printField];
                                if (printValue !== undefined && printValue !== null && printValue !== '') {
                                    const displayValue = typeof printValue === 'boolean' 
                                        ? (printValue ? 'Yes' : 'No')
                                        : String(printValue);
                                    
                                    // Determine if printed (positive values)
                                    const isPrinted = printValue === true || 
                                        String(printValue).toLowerCase() === 'yes' || 
                                        String(printValue).toLowerCase() === 'true' ||
                                        String(printValue).toLowerCase() === 'printed';
                                    
                                    return `
                                        <div class="attendee-print-header">
                                            <span class="print-badge ${isPrinted ? 'printed' : 'not-printed'}">${displayValue}</span>
                                        </div>
                                    `;
                                }
                                return '';
                            })() : ''}
                            ${this.getDisplaySpoc(attendee) ? `
                                <div class="attendee-spoc">
                                    <span class="spoc-label">SPOC:</span>
                                    <span class="spoc-value">${this.getDisplaySpoc(attendee)}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${colorFields.length > 0 ? (() => {
                            const colorPills = colorFields.map(colorField => {
                                const colorValue = attendee[colorField];
                                if (!colorValue) return '';
                                
                                const parsedColor = this.parseColorValue(colorValue);
                                if (parsedColor) {
                                    const textColor = this.getTextColorForBackground(parsedColor);
                                    const styleAttr = `style="background-color: ${parsedColor}; color: ${textColor};"`;
                                    return `
                                    <div class="attendee-color-item">
                                        <span class="color-label">${this.formatFieldName(colorField)}:</span>
                                        <span class="color-pill" ${styleAttr}>${colorValue}</span>
                                    </div>
                                `;
                                } else {
                                    return `
                                    <div class="attendee-color-item">
                                        <span class="color-label">${this.formatFieldName(colorField)}:</span>
                                        <span class="color-pill">${colorValue}</span>
                                    </div>
                                `;
                                }
                            }).filter(Boolean).join('');
                            
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
        const attendeeId = checkbox.id.replace('check-', '');
        const checkedIn = checkbox.checked;
        const row = checkbox.closest('.attendee-row');

        try {
            const response = await fetch(`/api/attendees/${attendeeId}/checkin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ checkedIn })
            });

            const result = await response.json();
            
            if (!response.ok || !result.success) {
                // Revert checkbox state on error
                checkbox.checked = !checkedIn;
                const errorMsg = result.error || result.warning || 'Check-in failed';
                this.showError(errorMsg);
                if (result.warning) {
                    // Show warning but don't revert UI if it's just a sync warning
                    console.warn('Check-in warning:', result.warning);
                }
                return;
            }
            
            if (checkedIn) {
                row.classList.add('checked-in');
                this.showCheckInSuccess(attendeeId);
            } else {
                row.classList.remove('checked-in');
                this.showCheckOutSuccess(attendeeId);
            }

            // Update attendance summary
            this.loadAttendanceSummary();
            
        } catch (error) {
            console.error('Check-in error:', error);
            // Revert checkbox state on error
            checkbox.checked = !checkedIn;
            this.showError('Failed to update attendance: ' + error.message);
        }
    }

    async syncFromSheet() {
        if (this.syncButton.classList.contains('syncing')) {
            return; // Already syncing
        }

        try {
            this.syncButton.classList.add('syncing');
            this.syncButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Syncing...</span>';

            const response = await fetch('/api/attendance/sync-from-sheet', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Sync failed');
            }

            const result = await response.json();
            
            // Show success message
            this.showSuccess(`✅ ${result.message}`);
            
            // Update attendance summary
            this.loadAttendanceSummary();
            
            // If there are search results, refresh them to show updated status
            const currentQuery = this.searchInput.value.trim();
            if (currentQuery) {
                this.handleSearch(currentQuery);
            }
            
        } catch (error) {
            console.error('Sync error:', error);
            this.showError('Failed to sync from Google Sheet');
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
        try {
            const response = await fetch('/api/attendance/summary');
            if (response.ok) {
                const summary = await response.json();
                // Update only the header count
                this.checkedInCount.textContent = summary.totalCheckedIn;
            }
        } catch (error) {
            console.error('Failed to load attendance summary:', error);
        }
    }

    showLoading(show) {
        this.searchLoading.style.display = show ? 'block' : 'none';
    }

    showEmptyState() {
        this.searchResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Start typing to search for attendees</p>
            </div>
        `;
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
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
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
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AttendeeCheckInApp();
}); 