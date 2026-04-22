# Connect Hearing Industrial Division
## HCP Platform: MasterDB & TechTool User Manual

This manual provides a comprehensive guide to the Connect Hearing Industrial Division's Hearing Conservation Platform (HCP), consisting of the **MasterDB** office administration system and the **TechTool** field testing application.

---

## Table of Contents
1. [Platform Overview](#platform-overview)
2. [MasterDB: Office Administration](#masterdb-office-administration)
    - [Dashboard & KPIs](#masterdb-dashboard)
    - [Company & Employee Management](#masterdb-management)
    - [Packet Workflow](#masterdb-packets)
    - [Manual Data Entry & Deletion](#masterdb-manual)
    - [Reporting](#masterdb-reporting)
3. [TechTool: Field Testing](#techtool-field-testing)
    - [Getting Started & Syncing](#techtool-sync)
    - [Testing Workflow](#techtool-workflow)
    - [Questionnaire & Classification](#techtool-classification)
    - [Counselling & Referrals](#techtool-referrals)
4. [Reports & Data Export](#masterdb-export)
5. [Privacy & Security](#privacy-security)
6. [Data Integrity & Backups](#data-integrity)

---

<a name="platform-overview"></a>
## 1. Platform Overview
The HCP platform uses a two-app workflow to manage industrial audiometric testing:
- **MasterDB**: The central repository at the office. Used for managing historical data, generating testing "packets," and importing field results.
- **TechTool**: The field application used on-site. Works fully offline. Techs download packets, conduct tests, and submit completed results back to the office.

Communication happens via a shared **Sync Folder** (typically OneDrive), allowing for seamless data exchange without direct database access.

---

<a name="masterdb-office-administration"></a>
## 2. MasterDB: Office Administration

<a name="masterdb-dashboard"></a>
### Dashboard & KPIs
The Dashboard provides an immediate health check of the program:
- **Companies**: Total active companies.
- **Active Employees**: Total employees currently in the program.
- **Tests (30 days)**: Recent testing volume.
- **Incoming Packets**: Number of completed visits waiting to be imported.
- **Pending (in field)**: Packets currently assigned to technicians but not yet returned.

<a name="masterdb-management"></a>
### Company & Employee Management
MasterDB allows full CRUD (Create, Read, Update, Delete) operations:
- **Companies**: Register new companies, set provincial rules (which dictate classification logic), and maintain "Sticky Notes" for field technicians.
- **Employees**: Maintain employee profiles including Hire Date, Date of Birth, and Job Titles.
- **Baselines**: Set and manage the reference audiogram for every worker.

<a name="masterdb-packets"></a>
### Packet Workflow
The core of the system is the Packet:
1. **Generate**: Select a company, a technician, and the employees to be tested.
2. **Export**: MasterDB saves a JSON packet to the technician's specific folder in the Sync Folder.
3. **Review & Import**: Once the technician submits, MasterDB scans the "Inbox," provides a review screen of the results, and imports the data into the permanent database.
4. **Rejection**: If a packet is incorrect, use the **Reject** button to flag it and clear it from the incoming queue.

<a name="masterdb-manual"></a>
### Manual Data Entry & Deletion
- **Manual Test Entry**: Accessible from the Employee Detail screen. Allows entering audiometric results from paper records or correcting existing test entries.
- **Deletion**: Administrators can delete incorrect employees or test records to maintain database hygiene. Confirmation is required for all deletions.

<a name="masterdb-reporting"></a>
### Reporting
- **Company Annual Reports**: Summary of all classification outcomes for a selected period.
- **Employee History**: A professional multi-test audiogram chart for insurance or medical review.
- **Overdue Lists**: Identifies employees who have not been tested within the last 24 months.

---

<a name="techtool-field-testing"></a>
## 3. TechTool: Field Testing

<a name="techtool-sync"></a>
### Getting Started & Syncing
TechTool is designed for offline use in the field:
1. **Login**: Techs log in with their assigned initials and folder name.
2. **Download Sync**: While connected to the internet, tap **Sync** to download assigned packets.
3. **Offline Operation**: Once synced, the technician can conduct all tests without any internet connection.

<a name="techtool-workflow"></a>
### Testing Workflow
The standard workflow for every employee is:
1. **Pre-Test Questionnaire**: Record noise exposure habits and medical history.
2. **Threshold Entry**: Enter thresholds from the audiometer (0.5k to 8k Hz).
3. **Classification**: TechTool automatically applies provincial rules (e.g., Alberta OHS vs. WorkSafeBC) to determine if the result is Normal, Early Warning, or Abnormal.
4. **Counsel**: TechTool provides an auto-generated counsel template which the tech can refine.
5. **Finalize**: Review the test before saving it to the local boat.

<a name="techtool-classification"></a>
### Questionnaire & Classification
- **Style**: The questionnaire uses a card-based layout categorization (Medical History, Recent Exposure) for clarity.
- **Rules**: Classifications are assigned in real-time. If an employee has a baseline on file, the system automatically calculates shifts (e.g., NC, EWC, AC).

<a name="techtool-referrals"></a>
### Counselling & Referrals
- **Referral Forms**: For Abnormal results, a professional Referral Form can be generated and saved/printed from the session summary. It includes the employee's history, current audiogram, and counsel notes.
- **Final Submission**: When all employees in a company visit are resolved, the tech submits the entire packet back to the "Sync Folder" for office import.

---

<a name="masterdb-export"></a>
## 4. Reports & Data Export
Beyond generating official regulatory reports, MasterDB provides flexible data portability:
- **Excel/CSV Export**: The system automatically exports the main database tables (Employees, Tests, Companies) to an `excel/` subfolder in your Sync Folder. This allows administrative staff to open data in Microsoft Excel or Power BI for custom research or reporting without needing MasterDB access.
- **Regulatory Reporting**: Generate Company Annual Reports and Employee History Reports as high-quality PDFs or printed hard copies.

---

<a name="privacy-security"></a>
## 5. Privacy & Security
The HCP platform is built with a "Privacy by Design" approach to protect sensitive workplace health information:

- **Local-First Storage**: 
    - **MasterDB** stores all clinical and personal data in the **Origin Private File System (OPFS)** of your local browser. No patient data is sent to or stored on a central cloud server owned by the developer.
    - **TechTool** uses **IndexedDB** on the technician's device for temporary packet storage. Records are removed from the local field cache once submission is confirmed.
- **Sandboxed Execution**: Both applications run in secure browser sandboxes, preventing unauthorized access to the host computer's general file system.
- **Organizational Access Control**: 
    - Technician folders are restricted to specific initials assigned by the office.
    - Sync Folder security is managed via your organization's existing **OneDrive/SharePoint permissions**. Only authorized staff can view or modify packet files.
- **PII Protection**: Personally Identifiable Information (PII) like dates of birth and contact info are bundled into restricted JSON packet formats, ensuring they remain within the organization's controlled sync environment.

---

<a name="data-integrity"></a>
## 6. Data Integrity & Backups
To ensure long-term availability of audiometric records, the system employs several layers of redundancy:

### Automated Backups
- **Routine Snapshots**: MasterDB is configured to automatically attempt a full database backup (`.sqlite`) to a `backups/` folder in the Sync Folder regularly.
- **Session-Based Safety**: The application requests folder re-authorization each session to ensure these automated background tasks can proceed.

### Manual Backups
- **Critical Admin Task**: Since data resides in the browser, administrators **must** use the **Download Backup** feature in Settings after every import session. This file should be stored on a secure company server as the primary recovery point.

### Human-Readable Redundancy
- The **Excel Auto-Export** feature acts as a "shadow" record. Even if a database becomes corrupted, the core employee and test history remain accessible as standard spreadsheets in the Sync Folder.

---
*Created by Connect Hearing Industrial Division Implementation Team.*
