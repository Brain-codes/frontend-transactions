# CSV Organization Import Feature - Testing Guide

## Overview

This guide covers testing the new CSV Organization Import feature that allows super admin users to bulk import/update partner organizations from external system CSV files.

## Prerequisites

### Access Requirements

- **User Role**: Super Admin only
- **Authentication**: Valid JWT token required
- **Page Access**: Partner Organizations page (`/partners`)

### Test Data Setup

1. Valid CSV file with correct format
2. Test organizations with known Partner IDs
3. Mix of new and existing Partner IDs for testing upsert logic

## Feature Location

The CSV import functionality is accessible from the Partner Organizations page:

- **Button**: "Import Organizations" (blue button with Building2 icon)
- **Location**: Top-right action buttons area
- **Modal**: OrganizationCSVImportModal

## Test Scenarios

### 1. Access Control Testing

#### Test 1.1: Super Admin Access

**Steps:**

1. Log in as super admin user
2. Navigate to `/partners` page
3. Look for "Import Organizations" button

**Expected Result:**

- Button is visible and enabled
- Button has blue styling with Building2 icon
- Clicking opens the import modal

#### Test 1.2: Non-Super Admin Access

**Steps:**

1. Log in as regular admin or agent user
2. Navigate to `/partners` page

**Expected Result:**

- User is redirected to unauthorized page
- Cannot access partners page at all

### 2. File Upload Testing

#### Test 2.1: Valid CSV Upload

**Steps:**

1. Click "Import Organizations" button
2. Upload a valid CSV file with correct headers
3. Verify file is accepted

**Expected Result:**

- File upload succeeds
- File information displays (name, size)
- No error messages
- Import button becomes enabled

#### Test 2.2: Invalid File Types

**Steps:**

1. Try uploading non-CSV files (.txt, .xlsx, .pdf)
2. Verify error handling

**Expected Result:**

- Error message: "Please select a valid CSV file"
- File is rejected
- Import button remains disabled

#### Test 2.3: File Size Limits

**Steps:**

1. Upload CSV file larger than 5MB
2. Verify size limit enforcement

**Expected Result:**

- Error message about file size limit
- Recommendation to split into smaller batches
- File is rejected

#### Test 2.4: Drag and Drop

**Steps:**

1. Drag a valid CSV file into the upload area
2. Verify drag-and-drop functionality

**Expected Result:**

- Visual feedback during drag (border color change)
- File is accepted when dropped
- Same validation as regular upload

### 3. CSV Format Validation

#### Test 3.1: Required Headers

**CSV with missing required headers:**

```csv
Sales Reference,Sales Date,Customer,State,Branch
TR-4591A1,9/18/2025,LAPO MFB,Cross River,OBUBRA
```

**Expected Result:**

- Error message listing missing headers
- Import is blocked until fixed

#### Test 3.2: Valid CSV Format

**Use the template CSV:**

```csv
Sales Reference,Sales Date,Customer,State,Branch,Quantity,Downloaded by,Stove IDs,Sales Factory,Sales Rep,Partner ID,Partner Address,Partner Contact Person,Partner Contact Phone,Partner Alternative Phone,Partner Email
TR-4591A1,9/18/2025,LAPO MFB,Cross River,OBUBRA,40,ACSL Admin,"101034734, 101034900",Asaba,Ejiro Emeotu,9CF111,Mile 1 park by former first bank obubra,ANIEFIOK UDO,7046023589,N/A,N/A
```

**Expected Result:**

- File is accepted and parsed successfully
- No validation errors
- Ready for import

#### Test 3.3: Missing Required Data

**CSV with empty required fields:**

```csv
Sales Reference,Sales Date,Customer,State,Branch,Quantity,Downloaded by,Stove IDs,Sales Factory,Sales Rep,Partner ID,Partner Address,Partner Contact Person,Partner Contact Phone,Partner Alternative Phone,Partner Email
TR-4591A1,9/18/2025,,Cross River,OBUBRA,40,ACSL Admin,"101034734, 101034900",Asaba,Ejiro Emeotu,9CF111,Mile 1 park by former first bank obubra,ANIEFIOK UDO,7046023589,N/A,N/A
```

**Expected Result:**

- Validation error indicating missing Customer name
- Row number referenced in error message
- Import blocked until fixed

### 4. Data Processing Testing

#### Test 4.1: New Organization Creation

**Steps:**

1. Use CSV with new Partner IDs (not in database)
2. Ensure all required fields are present
3. Submit import

**Expected Result:**

- New organizations created successfully
- Admin users created for new organizations
- Success message with creation count
- Organizations appear in the main table

#### Test 4.2: Existing Organization Updates

**Steps:**

1. Use CSV with existing Partner IDs
2. Modify some organization data
3. Submit import

**Expected Result:**

- Existing organizations updated
- Updated data reflects in the database
- Success message with update count
- Changes visible in main table

#### Test 4.3: Mixed Create/Update

**Steps:**

1. Use CSV with mix of new and existing Partner IDs
2. Submit import

**Expected Result:**

- New organizations created
- Existing organizations updated
- Summary shows both created and updated counts
- All operations succeed

#### Test 4.4: Duplicate Partner IDs in CSV

**CSV with duplicate Partner IDs:**

```csv
Sales Reference,Sales Date,Customer,State,Branch,Quantity,Downloaded by,Stove IDs,Sales Factory,Sales Rep,Partner ID,Partner Address,Partner Contact Person,Partner Contact Phone,Partner Alternative Phone,Partner Email
TR-4591A1,9/18/2025,LAPO MFB,Cross River,OBUBRA,40,ACSL Admin,"101034734, 101034900",Asaba,Ejiro Emeotu,9CF111,Mile 1 park by former first bank obubra,ANIEFIOK UDO,7046023589,N/A,N/A
TR-4591B2,9/18/2025,Another Org,Lagos,LAGOS,25,ACSL Admin,"101034735, 101034901",Lagos,John Doe,9CF111,123 Main Street,Jane Doe,8023456789,N/A,N/A
```

**Expected Result:**

- Validation error about duplicate Partner IDs
- Import blocked until duplicates removed
- Clear error message with duplicate IDs listed

### 5. Error Handling Testing

#### Test 5.1: Network Errors

**Steps:**

1. Start import process
2. Disconnect internet during import
3. Verify error handling

**Expected Result:**

- Clear error message about network issues
- User can retry after connection restored
- No partial data corruption

#### Test 5.2: Authentication Errors

**Steps:**

1. Start import with expired token
2. Verify authentication error handling

**Expected Result:**

- Error message about authentication
- User prompted to log in again
- No security issues

#### Test 5.3: Server Errors

**Steps:**

1. Import with data that causes server validation errors
2. Verify error response handling

**Expected Result:**

- Server errors displayed clearly
- Specific row information where available
- User can fix data and retry

### 6. Results Display Testing

#### Test 6.1: Success Results

**Steps:**

1. Complete successful import
2. Review results display

**Expected Result:**

- Summary cards show correct counts
- Created organizations listed with details
- Updated organizations listed with details
- Partner IDs displayed for reference

#### Test 6.2: Error Results

**Steps:**

1. Import CSV with some invalid rows
2. Review error display

**Expected Result:**

- Errors section shows failed rows
- Clear error messages for each failure
- Error types categorized properly
- Partner IDs shown where available

#### Test 6.3: Mixed Results

**Steps:**

1. Import CSV with mix of valid and invalid data
2. Review complete results

**Expected Result:**

- Success and error sections both displayed
- Accurate counts in summary
- User can see what succeeded and what failed
- Option to fix errors and re-import

### 7. UI/UX Testing

#### Test 7.1: Loading States

**Steps:**

1. Monitor loading indicators during import
2. Verify all loading states work properly

**Expected Result:**

- File processing loading indicator
- Import progress messages
- Disabled buttons during processing
- Smooth transitions between states

#### Test 7.2: Modal Behavior

**Steps:**

1. Test modal opening/closing
2. Test modal interactions during processing

**Expected Result:**

- Modal opens smoothly
- Cannot close during import processing
- Clear navigation between upload and results
- Proper cleanup when closed

#### Test 7.3: Responsive Design

**Steps:**

1. Test on different screen sizes
2. Verify mobile compatibility

**Expected Result:**

- Modal responsive on all screen sizes
- Results display readable on mobile
- Touch interactions work properly
- No horizontal scrolling issues

### 8. Integration Testing

#### Test 8.1: Data Refresh

**Steps:**

1. Complete import
2. Verify main organizations table updates

**Expected Result:**

- Organizations table refreshes automatically
- New/updated organizations visible immediately
- Pagination and filtering work with new data
- No need to manually refresh page

#### Test 8.2: Existing Functionality

**Steps:**

1. Test existing features after import
2. Ensure no regressions

**Expected Result:**

- Organization CRUD operations still work
- Existing CSV import (sales data) still works
- All filters and searches work properly
- No performance degradation

## Test Data Templates

### Valid Test CSV

```csv
Sales Reference,Sales Date,Customer,State,Branch,Quantity,Downloaded by,Stove IDs,Sales Factory,Sales Rep,Partner ID,Partner Address,Partner Contact Person,Partner Contact Phone,Partner Alternative Phone,Partner Email
TR-TEST01,9/18/2025,Test Organization 1,Lagos,LAGOS MAIN,25,Test Admin,"101034734, 101034900",Lagos Factory,Test Rep,TEST001,123 Test Street Lagos,John Test,08012345678,08087654321,test1@test.com
TR-TEST02,9/18/2025,Test Organization 2,Abuja,ABUJA BRANCH,30,Test Admin,"101034735, 101034901",Abuja Factory,Test Rep 2,TEST002,456 Test Avenue Abuja,Jane Test,08023456789,N/A,test2@test.com
TR-TEST03,9/18/2025,Test Organization 3,Cross River,CALABAR,15,Test Admin,"101034736, 101034902",Calabar Factory,Test Rep 3,TEST003,789 Test Road Calabar,Bob Test,08034567890,08098765432,N/A
```

### Error Test CSV (Missing Customer)

```csv
Sales Reference,Sales Date,Customer,State,Branch,Quantity,Downloaded by,Stove IDs,Sales Factory,Sales Rep,Partner ID,Partner Address,Partner Contact Person,Partner Contact Phone,Partner Alternative Phone,Partner Email
TR-ERROR01,9/18/2025,,Lagos,LAGOS MAIN,25,Test Admin,"101034734, 101034900",Lagos Factory,Test Rep,ERROR001,123 Error Street,John Error,08012345678,N/A,N/A
```

### Update Test CSV (Existing Partner ID)

```csv
Sales Reference,Sales Date,Customer,State,Branch,Quantity,Downloaded by,Stove IDs,Sales Factory,Sales Rep,Partner ID,Partner Address,Partner Contact Person,Partner Contact Phone,Partner Alternative Phone,Partner Email
TR-UPDATE01,9/18/2025,Updated Organization Name,Lagos,UPDATED BRANCH,25,Test Admin,"101034734, 101034900",Lagos Factory,Test Rep,EXISTING001,Updated Address,Updated Contact,08099999999,N/A,updated@test.com
```

## Performance Testing

### Large File Testing

- Test with 100 rows (should process quickly)
- Test with 500 rows (should show performance warnings)
- Test with 1000 rows (maximum recommended)
- Test with 1500+ rows (should warn about batch size)

### Expected Performance

- Files under 100 rows: < 5 seconds
- Files 100-500 rows: 5-15 seconds
- Files 500-1000 rows: 15-30 seconds
- Files over 1000 rows: Warning about performance

## Security Testing

### Authentication

- Verify JWT token validation
- Test token expiration handling
- Ensure only super admin access

### Data Validation

- Test SQL injection attempts in CSV data
- Verify XSS prevention in error messages
- Ensure no sensitive data exposure in errors

### Rate Limiting

- Test multiple rapid import attempts
- Verify server-side request limiting
- Ensure no resource exhaustion

## Regression Testing Checklist

After implementing CSV import feature, verify these existing features still work:

- [ ] Organization CRUD operations
- [ ] Organization search and filtering
- [ ] Organization detail sidebar
- [ ] Sales data CSV import (existing feature)
- [ ] User authentication and authorization
- [ ] Page navigation and routing
- [ ] Toast notifications
- [ ] Responsive design
- [ ] Performance of organization list
- [ ] Export functionality

## Common Issues and Solutions

### Issue: "Authentication context not available"

**Solution**: Ensure user is logged in and page has loaded completely

### Issue: "CSV validation failed"

**Solution**: Download template and match exact column headers

### Issue: "File size exceeds limit"

**Solution**: Split large CSV files into smaller batches

### Issue: Import button disabled

**Solution**: Ensure valid CSV file is selected and no validation errors

### Issue: Results not showing in table

**Solution**: Check if page needs manual refresh or if filters are hiding results

## Browser Compatibility

Test on these browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Testing

Test on these devices:

- iPhone (Safari)
- Android (Chrome)
- Tablet (various sizes)

Ensure:

- Modal is usable on small screens
- File upload works with touch
- Results are readable on mobile
- No horizontal scrolling required
