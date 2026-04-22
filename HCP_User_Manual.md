# Connect Hearing Industrial Division
## HCP Platform: Comprehensive Operational Manual

This manual provides a detailed guide to the Connect Hearing Industrial Division's Hearing Conservation Platform (HCP), consisting of the **MasterDB** office administration system and the **TechTool** field testing application.

---

## I. System Introduction & Workflow

### What is MasterDB?
MasterDB is the office administration component of the HCP-Web Hearing Conservation Platform. It is the central database for your industrial audiometric testing program, storing company records, employee records, test results, baselines, and generated packets. It also receives completed test packets from field technicians via the sync folder.

MasterDB does **not** conduct audiometric tests; that is handled by **TechTool**, which runs on the technician's field device. MasterDB and TechTool communicate by exchanging JSON packet files through a shared sync folder (typically on OneDrive).

### The Two-App Workflow
1. **Office creates a packet** in MasterDB (Generate Packet) and saves it to the sync folder.
2. **Technician opens the packet** in TechTool on-site, conducts tests, and submits the completed packet back to the sync folder.
3. **Office reviews and imports** the completed packet in MasterDB (Incoming Packets), which writes all test results to the database.

> **Important**: MasterDB stores all data locally in your browser using OPFS (Origin Private File System). Data is tied to this browser on this device. Use the backup feature in Settings regularly.

---

## II. Getting Started

### First Launch
When you open MasterDB for the first time, the database is empty. You can either load demo data to explore the app or begin entering real data right away. To load demo data, click **Load Demo Data** on the Dashboard.

### Setting up your Sync Folder
The sync folder is a shared folder that MasterDB and TechTool use to exchange packet files.
1. Go to **Settings** in the sidebar.
2. Under **Sync Folder**, click **Connect Folder** and select your OneDrive sync folder.
3. The sync indicator in the sidebar footer will show a green dot when connected.

### Recommended Setup Order
Settings → Organization Profile → Connect Sync Folder → Add Company Logo → Add Technician Profiles → Add Companies → Add Employees → Generate First Packet.

---

## III. MasterDB: Office Operations

### Dashboard
The Dashboard gives you a quick overview of the current state of your hearing conservation program.

| KPI Tile | What it shows |
| :--- | :--- |
| **Companies** | Total active companies in the database |
| **Active Employees** | Employees with active status across all companies |
| **Tests (30 days)** | Test records entered or imported in the last 30 days |
| **Incoming Packets** | Completed packets from techs awaiting review |
| **Pending (in field)** | Packets generated and sent but not yet returned |

### Companies & Employees
- **Companies**: Register new clients, set their province (which determines regulatory rules), and add "Sticky Notes" for site-specific instructions to technicians.
- **Employees**: Profiles include Date of Birth (for robust matching) and Hire Date.
- **Baseline**: Each employee should have one active baseline as the reference for future tests. This is set automatically on Baseline imports or manually updated.
- **Manual Test Entry**: You can manually add or edit test records for an employee without using the packet workflow (useful for fixing errors or entering paper records).

### Packet Lifecycle
1. **Pending**: Packet has been generated and saved to the sync folder, awaiting pickup by TechTool.
2. **Submitted**: Technician has completed the visit and returned the packet to the sync folder inbox.
3. **Imported**: Packet has been reviewed and results imported into MasterDB. Results are now in the database.
4. **Archived**: Packet has been archived and is no longer active.

### Reports
- **Company Annual Report**: Full summary of test activity for a company over a selected date range.
- **Employee History Report**: Professional audiometric history including audiogram charts.
- **STS / Flagged Report**: Lists employees with active STS flags or abnormal classifications.

---

## IV. Import Legacy Excel
The Legacy Import feature allows bringing historical data from old TechTool Excel workbooks (2009-2025) into MasterDB.

### Supported Formats
The importer is designed to be flexible:
- **Header row position**: Scans all rows to find headers.
- **Column order**: Matched by column name, not position.
- **Date formats**: Handles "JUL", "SEP", "SEPT", and full month names.
- **Day of birth**: Defaults to the 1st of the month if ".." or "0" is shown.

### Import Process
1. **Step 1 - Drop the File**: Select "Import Legacy" in the sidebar and drop your `.xlsx` file.
2. **Step 2 - Review**: MasterDB parses the file and shows a preview of mapped columns and the first 10 rows.
3. **Step 3 - Resolve Conflicts**: If a name matches an existing employee but DOBs differ, you must choose to "Use Existing", "Create New", or "Skip".
4. **Step 4 - Complete**: Database records are created and a summary of matched/new records is provided.

---

## V. TechTool: Field Operations

### Field Visit Workflow
1. **Sync**: While online, tap **Check Sync Folder** to download your assigned packets.
2. **On-Site**: Perform tests offline. Enter thresholds from the audiometer (0.5k to 8k Hz).
3. **Classification**: Categories (Normal, EW, Abnormal) are auto-calculated in real-time.
4. **Counsel**: Edit the auto-generated templates. For Abnormal results, a **Referral Form** can be printed/saved on-site.
5. **Submit**: Tap **Submit Packet** to return results to the OneDrive inbox.

---

## VI. Classifications Reference

### Alberta (OHS Code Part 16)
| Code | Label | Trigger | Action |
| :--- | :--- | :--- | :--- |
| **N** | Normal | No rule triggered | No action required. |
| **EW** | Standard Threshold Shift | Avg shift ≥ 10 dB at 2k, 3k, 4k Hz vs baseline | Notify worker within 30 days. |
| **A** | Abnormal | Threshold > 25 dB at 500-2k; or > 60 dB at 3-6k; or > 30 dB asymmetry | Referral required. Notify employer within 30 days. |

### British Columbia (WorkSafeBC)
- **Baseline tests**: Produce N, EW, or A.
- **Periodic tests**: Produce NC (Normal Change), EWC (Early Warning Change), or AC (Abnormal Change).
- **EWC Trigger**: Single frequency shift ≥ 15 dB at 3K or 4K vs baseline.

### Saskatchewan (OHS Regulations 1996)
- **EW**: Single frequency shift ≥ 15 dB at 2K–6K Hz vs baseline. Retest within 24 months.
- **A**: Avg threshold ≥ 25 dB at 500–6K Hz (baseline); or shift ≥ 15 dB at two adjacent frequencies; or shift ≥ 25 dB at any single frequency.

---

## VII. Troubleshooting & Data Security

### Common Issues
- **Sync folder disconnects**: This is normal browser behavior. Go to Settings and click **Reconnect** at the start of your session.
- **Legacy Import Error**: Ensure headers like "First name", "Surname", and "Test Date" exist and aren't in merged cells.
- **Missing Data**: Clearing browser data (cookies/cache) **will delete** the database. Always keep a current backup.

### Data Security & Backups
- **Privacy**: All PII and health information reside in the browser's origin-private storage. Data stays within your organization's OneDrive ecosystem.
- **Database Backup**: Click **Download Backup** in MasterDB Settings to save a `.sqlite` file. This is your **only** recovery option if browser data is cleared.
- **Excel Shadow Backup**: MasterDB automatically exports CSV copies of your tables to the `excel/` folder in the Sync directory to ensure data is readable even without the application.

---
*Connect Hearing Industrial Division - Implementation Team - 2026*
