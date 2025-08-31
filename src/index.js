import './styles.css';

class AttendeeCheckInApp {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
        this.searchLoading = document.getElementById('searchLoading');
        this.checkedInCount = document.getElementById('checkedInCount');
        this.attendanceSummary = document.getElementById('attendanceSummary');
        this.syncButton = document.getElementById('syncButton');
        
        this.searchTimeout = null;
        this.attendees = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadAttendanceSummary();
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
                this.showEmptyState();
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

    displayResults(attendees) {
        if (attendees.length === 0) {
            this.showNoResults();
            return;
        }

        const resultsHTML = attendees.map(attendee => this.createAttendeeRow(attendee)).join('');
        this.searchResults.innerHTML = resultsHTML;

        // Bind checkbox events
        this.bindCheckboxEvents();
    }

    createAttendeeRow(attendee) {
        const checkInTime = attendee.checkInTime ? new Date(attendee.checkInTime).toLocaleTimeString() : '';
        
        // Get all attendee details (excluding internal fields)
        const detailFields = Object.keys(attendee).filter(key => 
            !['id', 'checkedIn', 'checkInTime'].includes(key)
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
                        <div class="attendee-name">
                            ${this.getDisplayName(attendee)}
                        </div>
                        <div class="attendee-company">
                            ${this.getDisplayCompany(attendee)}
                        </div>
                        ${checkInTime ? `<div class="checkin-time">Checked in at ${checkInTime}</div>` : ''}
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

    formatFieldName(field) {
        return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

            if (!response.ok) {
                throw new Error('Check-in failed');
            }

            const result = await response.json();
            
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
            this.showError('Failed to update attendance');
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
                this.updateAttendanceSummary(summary);
            }
        } catch (error) {
            console.error('Failed to load attendance summary:', error);
        }
    }

    updateAttendanceSummary(summary) {
        this.checkedInCount.textContent = summary.totalCheckedIn;
        
        // Show summary section if there are check-ins
        if (summary.totalCheckedIn > 0) {
            this.attendanceSummary.style.display = 'block';
            document.getElementById('totalCheckedIn').textContent = summary.totalCheckedIn;
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