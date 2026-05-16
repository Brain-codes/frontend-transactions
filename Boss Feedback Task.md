# Detailed Task List & Implementation Guide

This guide provides a step-by-step roadmap for implementing the changes requested by the boss in the transcribed call recordings.

---

## Phase 1: Dashboard Cleanup & Metrics (Super Admin)

**Objective:** Simplify the dashboard UI and standardize KPI nomenclature for better tracking.

### Task 1.1: Remove "Welcome" Messages
*   **Transcription Reference:** "you see that welcome back spa you not doing anything for us to take it out" (Call A, 5:44).
*   **File:** `src/app/components/DashboardLayout.tsx`
*   **Action:**
    *   Find the `DashboardLayout` component definition.
    *   Locate the `description` prop default value (Line 26).
    *   Change `description = "Welcome to your dashboard"` to `description = ""`.
*   **File:** `src/app/components/TopNavigation.jsx`
    *   Ensure the `description` is not being prepended with "Welcome" or similar text in the JSX (around lines 131-133).

### Task 1.2: Standardize KPI Labels
*   **Transcription Reference:** "Total number of stoves received by partners... total number of stoves sold to end users... available store for sale... expected receivable amount... amount received... outstanding balance" (Call A, 14:42 - 19:33).
*   **File:** `src/app/dashboard/components/DashboardContent.jsx`
*   **Action:** Update the `KPI_CONFIG` array (starting around line 63) with the following labels:
    1.  `stovesReceived`: "Total Stoves Received By Partner(s)"
    2.  `stovesSold`: "Total Stoves Sold to End Users"
    3.  `availableStoves`: "Available Stoves for Sale to End Users"
    4.  `expectedReceivable`: "Expected Receivable Amount"
    5.  `amountReceived`: "Amount Received"
    6.  `outstandingBalance`: "Outstanding Balance"

### Task 1.3: Simplify Dashboard Filters
*   **Transcription Reference:** "Secondly, the philtres. On the super admin dashboard. I don't think it's necessary... you just simply follow what I did by putting a 1 year, drop down" (Call A, 5:49 & 13:00).
*   **File:** `src/app/dashboard/components/DashboardContent.jsx`
*   **Action:**
    *   Locate the header section (Line 164).
    *   Ensure only the **Year** `Select` dropdown is visible.
    *   Remove or hide any search bars or state filters from the main overview.
    *   Label the year toggle clearly as "Year:".

---

## Phase 2: Unified User Management

**Objective:** Create a single management interface for all system users except corporate Partners.

### Task 2.1: Unified Role Listing
*   **Transcription Reference:** "I want to see everybody that is a user on the system. What is an admin. Whether it's an agent. Whether it's a partner... since we don't create partners here, we can exclude partners from that place" (Call B, 1:03).
*   **File:** `src/app/settings/user-management/UserManagementContent.jsx`
*   **Action:**
    *   Update `getRoleLabel` (Line 91) to handle all roles: `super_admin`, `acsl_agent`, `partner_agent`, `partner` (referring to Partner Admin users).
    *   Update the role filter `Select` (Line 425) to include options for "Partner Admin" and "Partner Agent".

### Task 2.2: Refactor Create User Flow
*   **Transcription Reference:** "When I click user, create user, those basic information that cuts across everybody comes up first... After collecting those basic information, then I now move to next thing. What role am I creating? ... If it's an agent... assign partners now" (Call B, 3:00).
*   **File:** `src/app/settings/user-management/UserManagementContent.jsx`
*   **Action:**
    *   Modify the `Create User` modal form.
    *   Add `partner` and `partner_agent` to the role selection `Select` (Line 748).
    *   **Conditional Extension:** If `acsl_agent` or `partner_agent` is selected, add a section to search and select Partners (Organizations).
    *   **Logic:** Upon clicking "Create", first create the user, then if partners were selected, call `superAdminAgentService.setAgentOrganizations(userId, partnerIds)`.

---

## Phase 3: Sales Performance & Reporting

**Objective:** Detailed tracking of inventory movement from Atmosphere to Partners to End Users.

### Task 3.1: Inventory Reconciliation Dashboard
*   **Transcription Reference:** "10,000 stoves are in the hands of our partners. How many of these stoves have the partners sold? They sold 8,000. So that means we now have 2,000 stoves in the hands of our partner" (Call C, 0:11).
*   **Action:**
    *   Create or update a Sales Report view that explicitly calculates:
        *   **Distributed:** Total stoves transferred to all partners.
        *   **Sold:** Total sales reported by partners.
        *   **In-Hand:** Distributed - Sold.

### Task 3.2: Sales Model Analysis
*   **Transcription Reference:** "Sales model analysis where you can have a chart showing percentage of sales made using Amina model or the other models" (Call A, 19:51).
*   **File:** `src/app/dashboard/components/DashboardContent.jsx`
*   **Action:** Ensure the `PieChart` component (Line 254) correctly maps the `salesModelData` provided by the service.

---

## Phase 4: Partner Agent Portal

**Objective:** Provide agents with a simplified, unified interface for recording sales.

### Task 4.1: Agent Dashboard Metrics
*   **Transcription Reference:** "Partner agent just for me to keep record... total amount sold... what I've sold so far... total number of stoves I have sold... total amount collected... total amount outstanding" (Call D, 0:40 - 1:43).
*   **File:** `src/app/dashboard/components/AcslAgentDashboardContent.tsx` (and Partner equivalent)
*   **Action:** Ensure the dashboard shows exactly these four metrics as primary KPIs.

### Task 4.2: "Sell" Action Prominence
*   **Transcription Reference:** "Very visibly somewhere at the top should be sell to, click and you have your form to, to sell" (Call D, 2:10).
*   **Action:**
    *   Add a prominent "Sell Stove" button to the Top Navigation or the Agent Dashboard Header.
    *   Ensure the "Sell" form filters the available Stove IDs based on the partner assigned to the logged-in agent.
