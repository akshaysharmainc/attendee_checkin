# Code Cleanup Opportunities

## 1. Outdated Comments
**Location:** `src/index.js` lines 51, 56, 59
- Line 51: Comment says "13 seconds" but code uses 23000ms (23 seconds)
- Line 56: Comment says "30 seconds" but code uses 45000ms (45 seconds)
- Line 59: Comment says "30 seconds" but code uses 45000ms (45 seconds)

**Fix:** Update comments to match actual values

## 2. Magic Numbers Should Be Constants
**Location:** Throughout `src/index.js`
- `300` - Search debounce delay
- `23000` - Attendance summary polling interval
- `45000` - Auto-refresh interval
- `2000` - Success animation duration
- `3000` - Notification display duration

**Fix:** Extract to constants at top of file:
```javascript
const SEARCH_DEBOUNCE_MS = 300;
const ATTENDANCE_SUMMARY_INTERVAL_MS = 23000;
const AUTO_REFRESH_INTERVAL_MS = 45000;
const SUCCESS_ANIMATION_DURATION_MS = 2000;
const NOTIFICATION_DURATION_MS = 3000;
```

## 3. Code Duplication - Interval Setup
**Location:** `src/index.js` lines 52-59 and 177-187
- Same interval setup code appears twice

**Fix:** Extract to a method:
```javascript
startPolling() {
    if (!this.attendanceSummaryInterval) {
        this.attendanceSummaryInterval = setInterval(() => {
            this.loadAttendanceSummary();
        }, ATTENDANCE_SUMMARY_INTERVAL_MS);
    }
    
    if (!this.autoRefreshInterval) {
        this.autoRefreshInterval = setInterval(() => {
            this.autoRefreshAttendeeList();
        }, AUTO_REFRESH_INTERVAL_MS);
    }
}
```

## 4. Code Duplication - Error Rollback Logic
**Location:** `src/index.js` lines 716-719, 732-735, 753-756
- Error rollback logic is duplicated 3 times in `handleCheckIn`

**Fix:** Extract to a method:
```javascript
rollbackCheckIn(checkbox, checkedIn, row, currentCount) {
    checkbox.checked = !checkedIn;
    row.classList.toggle('checked-in', !checkedIn);
    this.checkedInCount.textContent = currentCount;
}
```

## 5. Code Duplication - Success Animations
**Location:** `src/index.js` lines 828-846
- `showCheckInSuccess` and `showCheckOutSuccess` are nearly identical

**Fix:** Consolidate:
```javascript
showCheckInAnimation(attendeeId, isCheckIn = true) {
    const row = document.querySelector(`[data-id="${attendeeId}"]`);
    if (row) {
        const className = isCheckIn ? 'checkin-success' : 'checkout-success';
        row.classList.add(className);
        setTimeout(() => {
            row.classList.remove(className);
        }, SUCCESS_ANIMATION_DURATION_MS);
    }
}
```

## 6. Code Duplication - Notification Methods
**Location:** `src/index.js` lines 915-947
- `showError` and `showSuccess` have very similar structure

**Fix:** Extract common logic:
```javascript
showNotification(message, type = 'error') {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `${type}-notification`;
    const icon = type === 'error' 
        ? '<i class="fas fa-exclamation-triangle"></i>'
        : '<i class="fas fa-check-circle"></i>';
    notificationDiv.innerHTML = `${icon}<span>${message}</span>`;
    
    document.body.appendChild(notificationDiv);
    
    setTimeout(() => {
        notificationDiv.remove();
    }, NOTIFICATION_DURATION_MS);
}

showError(message) {
    this.showNotification(message, 'error');
}

showSuccess(message) {
    this.showNotification(message, 'success');
}
```

## 7. Long Method - createAttendeeRow
**Location:** `src/index.js` lines 395-512
- Method is 116 lines long and does multiple things

**Fix:** Break into smaller methods:
- `getFieldCategories(attendee)` - Extract field detection
- `createAttendeeHeader(attendee, printFields, spocField)` - Header section
- `createColorPills(colorFields, attendee)` - Color pills section
- `createDetailsSection(detailFields, attendee)` - Details section

## 8. Large Color Map
**Location:** `src/index.js` lines 574-634
- 60+ line color map in `parseColorValue`

**Fix:** Extract to a constant at module level:
```javascript
const COLOR_MAP = {
    // Red variations
    'crimson red': 'crimson',
    'crimson': 'crimson',
    // ... rest of map
};
```

## 9. Field Detection Logic Duplication
**Location:** Multiple places in `createAttendeeRow` and helper methods
- Field detection patterns repeated

**Fix:** Create helper methods:
```javascript
findFieldsByPattern(attendee, pattern, excludeFields = []) {
    return Object.keys(attendee).filter(key => 
        pattern.test(key.toLowerCase()) && 
        !excludeFields.includes(key)
    );
}

getColorFields(attendee) {
    return this.findFieldsByPattern(
        attendee, 
        /color|colour/, 
        ['id', 'checkedIn', 'checkInTime']
    );
}
```

## 10. URL Parameter Handling
**Location:** `src/index.js` lines 155-168
- URL parameter update logic could be extracted

**Fix:** Extract to method:
```javascript
updateUrlParameters() {
    const url = new URL(window.location);
    url.searchParams.set('sheetId', this.sheetId);
    
    if (this.sheetRange !== DEFAULT_SHEET_RANGE) {
        url.searchParams.set('range', this.sheetRange);
    } else {
        url.searchParams.delete('range');
    }
    
    if (this.webhookUrl) {
        url.searchParams.set('webhookUrl', this.webhookUrl);
    } else {
        url.searchParams.delete('webhookUrl');
    }
    
    window.history.replaceState({}, '', url);
}
```

## 11. Inconsistent Error Handling
**Location:** Various places
- Some places use `console.error`, others use `console.debug`
- Error message formatting inconsistent

**Fix:** Standardize error handling patterns

## 12. Potential Memory Leaks
**Location:** `src/index.js` intervals
- Intervals are created but never explicitly cleared on cleanup

**Fix:** Add cleanup method:
```javascript
destroy() {
    if (this.attendanceSummaryInterval) {
        clearInterval(this.attendanceSummaryInterval);
    }
    if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
    }
    if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
    }
}
```

## Priority Recommendations

**High Priority:**
1. Fix outdated comments (quick win)
2. Extract magic numbers to constants
3. Consolidate error rollback logic
4. Extract interval setup to method

**Medium Priority:**
5. Consolidate success animation methods
6. Extract notification common logic
7. Break down `createAttendeeRow` method
8. Extract color map to constant

**Low Priority:**
9. Extract field detection helpers
10. Extract URL parameter handling
11. Standardize error handling
12. Add cleanup method for intervals

