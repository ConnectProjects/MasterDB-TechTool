/**
 * screens/help.js
 *
 * Full in-app manual for MasterDB.
 * Accessible via the ? button in the top-right of the main area (wired in app.js).
 *
 * To add to app.js:
 *   import { renderHelp } from './screens/help.js'
 *   // In SCREENS:
 *   'help': renderHelp,
 *   // In paint(), inside .main-area, add a help button:
 *   <button class="btn btn-ghost btn-sm help-btn" id="btn-help" title="Help">?</button>
 *   // Wire it:
 *   app.querySelector('#btn-help')?.addEventListener('click', () => navigate('help'))
 */

export function renderHelp(container, state, navigate) {
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>MasterDB Help</h1>
          <p style="color:var(--grey-500);font-size:13px;margin-top:4px">Full user manual — Connect Hearing Industrial Division</p>
        </div>
        <button class="btn btn-outline" id="btn-back-help">← Back</button>
      </div>

      <div class="help-layout">
        <nav class="help-nav" id="help-nav">
          <div class="help-nav-section">Overview</div>
          <button class="help-nav-item active" data-section="overview">What is MasterDB?</button>
          <button class="help-nav-item" data-section="getting-started">Getting Started</button>

          <div class="help-nav-section">Screens</div>
          <button class="help-nav-item" data-section="dashboard">Dashboard</button>
          <button class="help-nav-item" data-section="companies">Companies</button>
          <button class="help-nav-item" data-section="employees">Employees</button>
          <button class="help-nav-item" data-section="packets">Packets</button>
          <button class="help-nav-item" data-section="incoming">Incoming Packets</button>
          <button class="help-nav-item" data-section="schedule">Schedule</button>
          <button class="help-nav-item" data-section="reports">Reports</button>
          <button class="help-nav-item" data-section="settings">Settings</button>

          <div class="help-nav-section">Import</div>
          <button class="help-nav-item" data-section="legacy-import">Import Legacy Excel</button>

          <div class="help-nav-section">Reference</div>
          <button class="help-nav-item" data-section="classifications">Classifications</button>
          <button class="help-nav-item" data-section="troubleshooting">Troubleshooting</button>
        </nav>

        <div class="help-content" id="help-content"></div>
      </div>
    </div>
  `

  container.querySelector('#btn-back-help').addEventListener('click', () => {
    const prev = state.helpReturnScreen || 'dashboard'
    navigate(prev)
  })

  const contentEl = container.querySelector('#help-content')
  const navBtns   = container.querySelectorAll('.help-nav-item')

  function showSection(id) {
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.section === id))
    contentEl.innerHTML = SECTIONS[id] || '<p>Section not found.</p>'
    contentEl.scrollTop = 0
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section))
  })

  showSection('overview')
}

const SECTIONS = {

overview: `
  <h2>What is MasterDB?</h2>
  <p>MasterDB is the office administration component of the HCP-Web Hearing Conservation Platform used by Connect Hearing's Industrial Division. It runs entirely in your browser and works offline once loaded.</p>
  <h3>What MasterDB does</h3>
  <p>MasterDB is the central database for your industrial audiometric testing program. It stores company records, employee records, test results, baselines, and generated packets. It also receives completed test packets from field technicians via the sync folder.</p>
  <h3>What MasterDB does not do</h3>
  <p>MasterDB does not conduct audiometric tests — that is handled by TechTool, which runs on the technician's field device. MasterDB and TechTool communicate by exchanging JSON packet files through a shared sync folder (typically on OneDrive).</p>
  <h3>The two-app workflow</h3>
  <div class="help-steps">
    <div class="help-step"><span class="help-step-num">1</span><div><strong>Office creates a packet</strong> in MasterDB (Generate Packet) and saves it to the sync folder.</div></div>
    <div class="help-step"><span class="help-step-num">2</span><div><strong>Technician opens the packet</strong> in TechTool on-site, conducts tests, and submits the completed packet back to the sync folder.</div></div>
    <div class="help-step"><span class="help-step-num">3</span><div><strong>Office reviews and imports</strong> the completed packet in MasterDB (Incoming Packets), which writes all test results to the database.</div></div>
  </div>
  <div class="alert alert-info" style="margin-top:16px">
    MasterDB stores all data locally in your browser using OPFS (Origin Private File System). Data is tied to this browser on this device. Use the backup feature in Settings regularly.
  </div>
`,

'getting-started': `
  <h2>Getting Started</h2>
  <h3>First launch</h3>
  <p>When you open MasterDB for the first time the database is empty. You can either load demo data to explore the app, or begin entering real data right away.</p>
  <p>To load demo data, click <strong>Load Demo Data</strong> on the Dashboard. This adds two sample companies, employees, and test history. Remove it any time via Settings → Clear Demo Data.</p>
  <h3>Setting up your sync folder</h3>
  <p>The sync folder is a shared folder (typically on OneDrive) that MasterDB and TechTool use to exchange packet files. You need to connect it before generating or receiving packets.</p>
  <div class="help-steps">
    <div class="help-step"><span class="help-step-num">1</span><div>Go to <strong>Settings</strong> in the sidebar.</div></div>
    <div class="help-step"><span class="help-step-num">2</span><div>Under <strong>Sync Folder</strong>, click <strong>Connect Folder</strong> and select your OneDrive sync folder.</div></div>
    <div class="help-step"><span class="help-step-num">3</span><div>The sync indicator in the sidebar footer will show a green dot when connected.</div></div>
  </div>
  <h3>Adding your first company</h3>
  <div class="help-steps">
    <div class="help-step"><span class="help-step-num">1</span><div>Click <strong>Companies</strong> in the sidebar.</div></div>
    <div class="help-step"><span class="help-step-num">2</span><div>Click <strong>+ Add Company</strong> and fill in the company name, province, and contact details.</div></div>
    <div class="help-step"><span class="help-step-num">3</span><div>Open the company and add employees via the <strong>Employees</strong> tab.</div></div>
  </div>
  <h3>Recommended setup order</h3>
  <p>For a new installation: Settings → organization profile → connect sync folder → add company logo → add technician profiles → add companies → add employees → generate first packet.</p>
`,

dashboard: `
  <h2>Dashboard</h2>
  <p>The Dashboard gives you a quick overview of the current state of your hearing conservation program. It is the first screen you see when MasterDB opens.</p>
  <h3>KPI tiles</h3>
  <p>The six tiles across the top show key numbers at a glance. Clicking the <strong>Companies</strong>, <strong>Active Employees</strong>, or <strong>Incoming Packets</strong> tiles navigates directly to that screen.</p>
  <table class="help-table">
    <thead><tr><th>Tile</th><th>What it shows</th></tr></thead>
    <tbody>
      <tr><td>Companies</td><td>Total active companies in the database</td></tr>
      <tr><td>Active Employees</td><td>Employees with active status across all companies</td></tr>
      <tr><td>Tests (30 days)</td><td>Test records entered or imported in the last 30 days</td></tr>
      <tr><td>STS Flags</td><td>Employees with a Standard Threshold Shift flag. Red when greater than zero.</td></tr>
      <tr><td>Incoming Packets</td><td>Completed packets from techs awaiting review. Highlighted when packets are waiting.</td></tr>
      <tr><td>Pending (in field)</td><td>Packets that have been generated and sent but not yet returned</td></tr>
    </tbody>
  </table>
  <h3>Incoming Completed Packets panel</h3>
  <p>Lists the most recent submitted packets waiting to be imported. Click <strong>Review →</strong> on any packet to go directly to the import confirmation screen. Click <strong>Check Sync Folder</strong> to scan for newly submitted packets from the field.</p>
  <h3>Overdue Tests panel</h3>
  <p>Lists employees whose last test was more than 24 months ago, or who have never been tested. Use this list to prioritize scheduling. Click <strong>Schedule</strong> in the sidebar to book visits.</p>
`,

companies: `
  <h2>Companies</h2>
  <p>The Companies screen lists all companies in your database. Each company has its own employees, test history, packets, and schedule.</p>
  <h3>Finding a company</h3>
  <p>Type in the search box to filter by company name. The result count updates as you type.</p>
  <h3>Adding a company</h3>
  <div class="help-steps">
    <div class="help-step"><span class="help-step-num">1</span><div>Click <strong>+ Add Company</strong>.</div></div>
    <div class="help-step"><span class="help-step-num">2</span><div>Enter the company name and province (required). Province determines which regulatory rules apply to test classifications.</div></div>
    <div class="help-step"><span class="help-step-num">3</span><div>Optionally add contact details and address.</div></div>
    <div class="help-step"><span class="help-step-num">4</span><div><strong>Sticky Notes</strong> travel with every packet generated for this company and appear in TechTool — use them for site-specific instructions to the technician (e.g. "ask for Bob at the gate", "booth is in the lunchroom").</div></div>
    <div class="help-step"><span class="help-step-num">5</span><div>Click <strong>Save Company</strong>. You will be taken directly to the company detail screen.</div></div>
  </div>
  <h3>Company Detail screen</h3>
  <p>Clicking any company opens its detail screen, which has four tabs:</p>
  <table class="help-table">
    <thead><tr><th>Tab</th><th>Contents</th></tr></thead>
    <tbody>
      <tr><td>Employees</td><td>All employees at this company. Add, edit, or view individual employee records and test history.</td></tr>
      <tr><td>Packets</td><td>All packets generated for or received from this company.</td></tr>
      <tr><td>Schedule</td><td>Upcoming and past visits for this company.</td></tr>
      <tr><td>Notes</td><td>Internal sticky notes and company-level information.</td></tr>
    </tbody>
  </table>
  <div class="alert alert-info">
    Province can be changed after a company is created in the company edit form. Changing the province does not retroactively reclassify existing test records — only new tests will use the updated rules.
  </div>
`,

employees: `
  <h2>Employees</h2>
  <p>The Employees screen lists all employees across all companies. You can search by name or company, and filter by classification.</p>
  <h3>Adding an employee</h3>
  <p>Employees are added from within a company's detail screen (Companies → open a company → Employees tab → Add Employee). They cannot be added from the global Employees list screen.</p>
  <h3>Employee record</h3>
  <table class="help-table">
    <thead><tr><th>Field</th><th>Notes</th></tr></thead>
    <tbody>
      <tr><td>First / Last Name</td><td>Required. Used for packet generation and duplicate matching on import.</td></tr>
      <tr><td>Date of Birth</td><td>Used to confirm identity during import. Strongly recommended — avoids name conflict ambiguity.</td></tr>
      <tr><td>Hire Date</td><td>Optional. Used for reporting.</td></tr>
      <tr><td>Job Title</td><td>Travels with the packet to TechTool.</td></tr>
      <tr><td>Status</td><td>Active or inactive. Inactive employees are excluded from new packets.</td></tr>
    </tbody>
  </table>
  <h3>Baseline</h3>
  <p>Each employee should have one active baseline — the reference audiogram that all future periodic tests are compared against. The baseline is set automatically when a Baseline test is imported. You can also set or update it manually from the employee detail screen.</p>
  <div class="alert alert-warn">
    If an employee has no baseline on file, periodic tests cannot be classified. Make sure all employees have a baseline before their first periodic test.
  </div>
`,

packets: `
  <h2>Packets</h2>
  <p>A packet is a bundle of employee records and instructions sent to a technician for an on-site testing visit. Packets are generated in MasterDB, completed in TechTool, and then returned to MasterDB for import.</p>
  <h3>Packet lifecycle</h3>
  <div class="help-steps">
    <div class="help-step"><span class="help-step-num">1</span><div><strong>Pending</strong> — packet has been generated and saved to the sync folder, awaiting pickup by TechTool.</div></div>
    <div class="help-step"><span class="help-step-num">2</span><div><strong>Submitted</strong> — technician has completed the visit and returned the packet to the sync folder inbox.</div></div>
    <div class="help-step"><span class="help-step-num">3</span><div><strong>Imported</strong> — packet has been reviewed and imported into MasterDB. Test results are now in the database.</div></div>
    <div class="help-step"><span class="help-step-num">4</span><div><strong>Archived</strong> — packet has been archived and is no longer active.</div></div>
  </div>
  <h3>Generating a packet</h3>
  <div class="help-steps">
    <div class="help-step"><span class="help-step-num">1</span><div>Go to the company's detail screen and click <strong>Generate Packet</strong>.</div></div>
    <div class="help-step"><span class="help-step-num">2</span><div>Select the visit date and the technician who will conduct the tests.</div></div>
    <div class="help-step"><span class="help-step-num">3</span><div>Review the employee list. Active employees are included by default — deselect any who will not be tested.</div></div>
    <div class="help-step"><span class="help-step-num">4</span><div>Click <strong>Generate &amp; Save to Sync Folder</strong>. The packet JSON is written to the sync folder's outbox.</div></div>
  </div>
  <div class="alert alert-info">
    The sync folder must be connected before you can generate a packet. Go to Settings if you see a sync folder warning.
  </div>
`,

incoming: `
  <h2>Incoming Packets</h2>
  <p>The Incoming screen shows all completed packets that have been submitted by technicians and are waiting to be reviewed and imported into MasterDB.</p>
  <h3>Checking for new packets</h3>
  <p>Click <strong>Check Sync Folder</strong> to scan the sync folder inbox for new completed packets. MasterDB will find any JSON files in the inbox, register them as submitted packets, and move them to the archive folder so the inbox stays clean.</p>
  <h3>Reviewing and importing a packet</h3>
  <div class="help-steps">
    <div class="help-step"><span class="help-step-num">1</span><div>Click <strong>Review &amp; Import →</strong> on any waiting packet.</div></div>
    <div class="help-step"><span class="help-step-num">2</span><div>The Review Import screen shows every employee in the packet, their test results, and the classification assigned by TechTool.</div></div>
    <div class="help-step"><span class="help-step-num">3</span><div>Review the results. Employees who were not tested during this visit are shown in grey at the bottom.</div></div>
    <div class="help-step"><span class="help-step-num">4</span><div>If everything looks correct, click <strong>Import Tests into MasterDB</strong>.</div></div>
  </div>
  <h3>Warnings you may see</h3>
  <table class="help-table">
    <thead><tr><th>Warning</th><th>What to do</th></tr></thead>
    <tbody>
      <tr><td>Company not found in MasterDB</td><td>The company name in the packet doesn't match any company in your database. Create the company first, or check for a name spelling difference.</td></tr>
      <tr><td>Records already imported</td><td>This packet has been imported before. Importing again will create duplicate test records. Only proceed if you are sure this is needed.</td></tr>
    </tbody>
  </table>
`,

schedule: `
  <h2>Schedule</h2>
  <p>The Schedule screen helps you plan upcoming site visits and track which companies are due for testing.</p>
  <h3>Adding a visit</h3>
  <div class="help-steps">
    <div class="help-step"><span class="help-step-num">1</span><div>Click <strong>+ Add Visit</strong>.</div></div>
    <div class="help-step"><span class="help-step-num">2</span><div>Select the company, date, and technician.</div></div>
    <div class="help-step"><span class="help-step-num">3</span><div>Add any notes (e.g. contact person, access instructions).</div></div>
  </div>
  <h3>Marking a visit complete</h3>
  <p>Once a packet has been generated and the visit has taken place, mark the schedule entry as complete using the <strong>✓ Complete</strong> button. Completed visits move to the Past Visits section.</p>
  <p>You can also schedule visits from within a company's detail screen under the Schedule tab.</p>
`,

reports: `
  <h2>Reports</h2>
  <p>The Reports screen generates printable summaries of test results for companies and individual employees.</p>
  <h3>Company Annual Report</h3>
  <p>A full summary of all test activity for a company over a selected date range. Includes a breakdown of classifications, STS flags, and a table of all employees tested. Suitable for annual regulatory submissions.</p>
  <div class="help-steps">
    <div class="help-step"><span class="help-step-num">1</span><div>Select <strong>Company Annual Report</strong>.</div></div>
    <div class="help-step"><span class="help-step-num">2</span><div>Choose the company and the date range.</div></div>
    <div class="help-step"><span class="help-step-num">3</span><div>Click <strong>Generate</strong> to preview, then <strong>Print / Save as PDF</strong>.</div></div>
  </div>
  <h3>Employee History Report</h3>
  <p>A full audiometric history for a single employee, including audiogram charts for all tests on file. Suitable for providing to an employee or their physician.</p>
  <h3>STS / Flagged Report</h3>
  <p>Lists all employees with active STS flags or abnormal classifications. Useful for follow-up planning and regulatory reporting.</p>
  <div class="alert alert-info">
    For best print results use Chrome or Edge and set margins to "None" or "Minimum" in the print dialog. The reports are formatted for letter-size paper in portrait orientation.
  </div>
`,

settings: `
  <h2>Settings</h2>
  <h3>Organization Profile</h3>
  <p>Your organization's name, address, and contact information. This appears on referral forms, reports, and other printed documents. Fill this in before generating any printed output.</p>
  <h3>Sync Folder</h3>
  <p>Connect or reconnect your OneDrive (or other shared) folder here. MasterDB needs folder access to send packets to technicians and receive completed packets back. The green dot in the sidebar footer indicates a connected folder.</p>
  <p>Folder access is re-requested each browser session — if the dot is grey when you open MasterDB, go to Settings and click <strong>Reconnect</strong>.</p>
  <h3>Company Logo</h3>
  <p>Upload your organization's logo here. It appears in the sidebar, on generated reports, and on referral forms. PNG or JPG, recommended minimum 400px wide. When the sync folder is connected, the logo is automatically pushed to TechTool when uploaded.</p>
  <h3>Theme Color</h3>
  <p>Change the sidebar and accent color to match your organization's branding.</p>
  <h3>Technicians</h3>
  <p>Manage the list of technicians who conduct tests. Each technician record includes their name, initials, sync folder name, IAT number, and email. The IAT number is their Industrial Audiometric Technician certification number — it appears on referral forms.</p>
  <h3>Province Rules</h3>
  <p>View the classification rules and counselling templates for each province. These are read-only — contact your administrator to update rules.</p>
  <h3>Database Backup</h3>
  <p>Click <strong>Download Backup</strong> to save a copy of the entire database as a .sqlite file. Store this somewhere safe — it is your only recovery option if the browser data is cleared.</p>
  <div class="alert alert-warn">
    Clearing your browser data (cookies, site data, cache) will permanently delete your MasterDB database. Back up regularly.
  </div>
  <h3>Clear Demo Data</h3>
  <p>If you loaded demo data during setup, remove it here once you are ready to work with real data.</p>
`,

'legacy-import': `
  <h2>Import Legacy Excel</h2>
  <p>The Legacy Import feature allows you to bring historical audiometric test data from the old TechTool Excel workbooks into MasterDB. This is a one-time migration tool — once your data is in MasterDB you will use the normal packet workflow going forward.</p>
  <h3>What it imports</h3>
  <p>Each legacy Excel file contains the baseline test records for one company visit. The importer reads employee names, dates of birth, test dates, test types, and audiometric thresholds at seven frequencies per ear (0.5k, 1k, 2k, 3k, 4k, 6k, 8k).</p>
  <p>If the test type is <strong>Baseline</strong>, the importer also creates a baseline record for the employee — provided they don't already have one.</p>
  <h3>Supported file formats</h3>
  <table class="help-table">
    <thead><tr><th>Variation</th><th>Handled automatically</th></tr></thead>
    <tbody>
      <tr><td>Header row position</td><td>Yes — scans all rows to find headers, not just row 2 or 3</td></tr>
      <tr><td>Column order</td><td>Yes — matched by column name, not position</td></tr>
      <tr><td>Headers with embedded notes (e.g. "Birthdate↵MMDDYYYY")</td><td>Yes — text after the first line break is ignored</td></tr>
      <tr><td>3-letter month abbreviations (JUL, AUG)</td><td>Yes</td></tr>
      <tr><td>Full month names (JULY, AUGUST, SEPTEMBER)</td><td>Yes</td></tr>
      <tr><td>SEPT as abbreviation for September</td><td>Yes</td></tr>
      <tr><td>Unknown day of birth (shown as ".." or "0")</td><td>Yes — defaults to the 1st of the month</td></tr>
      <tr><td>Company name in file</td><td>Yes — reads "Company/City:" cell if present</td></tr>
      <tr><td>Company name from filename</td><td>Yes — used as fallback when not in the file</td></tr>
      <tr><td>Visit date from filename</td><td>Yes — parsed from month/day/year in the filename</td></tr>
    </tbody>
  </table>
  <h3>Step-by-step import process</h3>
  <h4>Step 1 — Drop the file</h4>
  <div class="help-steps">
    <div class="help-step"><span class="help-step-num">1</span><div>Click <strong>Import Legacy</strong> in the sidebar.</div></div>
    <div class="help-step"><span class="help-step-num">2</span><div>Drag and drop the .xlsx file onto the drop zone, or click <strong>browse</strong> to select it.</div></div>
    <div class="help-step"><span class="help-step-num">3</span><div>MasterDB parses the file and shows a preview.</div></div>
  </div>
  <h4>Step 2 — Review the preview</h4>
  <p>The preview shows the detected company name, visit date, and the first 10 employee rows. Check that the data looks correct before proceeding.</p>
  <table class="help-table">
    <thead><tr><th>Notice</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>✓ 14/14 frequency columns mapped</td><td>All frequency columns were found and matched. Good.</td></tr>
      <tr><td>⚠ Frequency columns not found</td><td>Some frequency columns couldn't be matched. They will be left blank.</td></tr>
      <tr><td>⚠ N rows will be skipped</td><td>Rows with unreadable or missing test dates. Listed individually.</td></tr>
    </tbody>
  </table>
  <p>Click <strong>Continue →</strong> when you are satisfied with the preview.</p>
  <h4>Step 3 — Resolve name conflicts (if any)</h4>
  <p>If MasterDB finds employees in the file whose names match an existing employee at the same company, but cannot confirm the match by date of birth, a conflict resolution screen appears.</p>
  <table class="help-table">
    <thead><tr><th>Option</th><th>When to use it</th></tr></thead>
    <tbody>
      <tr><td>Use existing</td><td>The person in the file is the same person already in the database.</td></tr>
      <tr><td>Create as new employee</td><td>This is a different person who happens to share the same name.</td></tr>
      <tr><td>Skip</td><td>Do not import any rows for this person in this file.</td></tr>
    </tbody>
  </table>
  <p>Every conflict must have a selection before you can continue.</p>
  <h4>Step 4 — Import complete</h4>
  <table class="help-table">
    <thead><tr><th>Stat</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>Company: Created / Matched</td><td>Whether the company was found in the database or created as new</td></tr>
      <tr><td>Employees: X new · Y matched</td><td>New employee records created vs. existing records matched</td></tr>
      <tr><td>Tests inserted</td><td>Number of test records written to the database</td></tr>
      <tr><td>Baselines set</td><td>Number of new baseline records created</td></tr>
      <tr><td>Skipped</td><td>Rows skipped due to conflict resolution choices (only shown if > 0)</td></tr>
    </tbody>
  </table>
  <h3>Duplicate protection</h3>
  <p>The importer will not create duplicate test records. If you import the same file twice, the second import will find that all test records already exist and insert nothing.</p>
  <h3>Province</h3>
  <p>All companies created during a legacy import are defaulted to <strong>Alberta (AB)</strong>. If a company is in a different province, update it in the Company Detail screen after import. Legacy imported tests do not have province-based classification applied.</p>
  <h3>Naming conventions for best results</h3>
  <p>The importer extracts the company name and visit date from the filename when they are not in the file. For best results, name your files like:</p>
  <div class="help-code">Company_Name_Month_DD_YYYY.xlsx</div>
  <p>For example: <code>Kal_Tire_089_Jul_22_2025.xlsx</code> → Company: "Kal Tire 089", Visit date: 2025-07-22</p>
`,

classifications: `
  <h2>Classifications Reference</h2>
  <p>Classifications are assigned automatically based on provincial rules. In TechTool, this happens at the time of testing. In MasterDB, classifications are imported with the completed packet.</p>
  <p>When a result is Abnormal or STS, the referral to a physician or audiologist is completed on-site during the counselling session — Connect Hearing carries the paper referral forms for this purpose. Referral forms can also be printed from TechTool or MasterDB.</p>

  <h3>Alberta (OHS Code Part 16)</h3>
  <p>Alberta has five classification rules across two outcomes: Abnormal (A) and Standard Threshold Shift (EW). Normal (N) is the result when no rule fires. Rules 1–3 fire on any test regardless of whether a baseline exists. Rules 4 and 5 require a baseline.</p>

  <table class="help-table">
    <thead><tr><th>Code</th><th>Label</th><th>Trigger</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td><span class="class-badge class-n">N</span></td><td>Normal</td><td>No rule triggered</td><td>No action required.</td></tr>
      <tr><td><span class="class-badge class-ew">EW</span></td><td>Standard Threshold Shift</td><td>Average shift ≥ 10 dB at 2000, 3000, and 4000 Hz (either ear) vs baseline</td><td>Sets STS flag. Notify worker within 30 days. Forward to physician or audiologist for assessment.</td></tr>
      <tr><td><span class="class-badge class-a">A</span></td><td>Abnormal</td><td>Threshold &gt; 25 dB at 500–2000 Hz; or &gt; 60 dB at 3–6K Hz; or &gt; 30 dB asymmetry at 3–6K Hz; or shift ≥ 15 dB at two consecutive frequencies 1–6K Hz</td><td>Referral required. Employer must be notified within 30 days. Sets STS flag.</td></tr>
    </tbody>
  </table>
  <div class="alert alert-info">When an Alberta test triggers both Abnormal and STS criteria simultaneously, Abnormal takes precedence. Both set the STS flag.</div>

  <h4>Rule 1 — Abnormal: threshold &gt; 25 dB at 500–2000 Hz</h4>
  <p>Fires on any test, no baseline needed. Example: right ear 1000 Hz = 30 dB.</p>
  <table class="help-table">
    <thead><tr><th>Ear</th><th>500</th><th>1k</th><th>2k</th><th>3k</th><th>4k</th><th>6k</th><th>8k</th></tr></thead>
    <tbody>
      <tr><td>Right</td><td>20</td><td><strong>30</strong></td><td>20</td><td>15</td><td>15</td><td>20</td><td>20</td></tr>
      <tr><td>Left</td><td>15</td><td>20</td><td>15</td><td>10</td><td>10</td><td>15</td><td>15</td></tr>
    </tbody>
  </table>

  <h4>Rule 2 — Abnormal: threshold &gt; 60 dB at 3000–6000 Hz</h4>
  <p>Fires on any test, no baseline needed. Example: right ear 4000 Hz = 65 dB. Classic noise notch that has progressed to Abnormal level.</p>
  <table class="help-table">
    <thead><tr><th>Ear</th><th>500</th><th>1k</th><th>2k</th><th>3k</th><th>4k</th><th>6k</th><th>8k</th></tr></thead>
    <tbody>
      <tr><td>Right</td><td>15</td><td>20</td><td>25</td><td>25</td><td><strong>65</strong></td><td>55</td><td>50</td></tr>
      <tr><td>Left</td><td>15</td><td>15</td><td>20</td><td>20</td><td>30</td><td>35</td><td>30</td></tr>
    </tbody>
  </table>

  <h4>Rule 3 — Abnormal: asymmetry &gt; 30 dB averaged at 3K+4K+6K</h4>
  <p>Fires on any test, no baseline needed. Catches significant one-sided hearing loss. Example: right ear average = 23.3 dB, left ear average = 61.7 dB, difference = 38.3 dB.</p>
  <table class="help-table">
    <thead><tr><th>Ear</th><th>500</th><th>1k</th><th>2k</th><th>3k</th><th>4k</th><th>6k</th><th>8k</th></tr></thead>
    <tbody>
      <tr><td>Right</td><td>15</td><td>15</td><td>20</td><td>20</td><td>25</td><td>25</td><td>30</td></tr>
      <tr><td>Left</td><td>15</td><td>20</td><td>25</td><td><strong>60</strong></td><td><strong>65</strong></td><td><strong>60</strong></td><td>55</td></tr>
    </tbody>
  </table>

  <h4>Rule 4 — Abnormal Shift: ≥ 15 dB at two consecutive frequencies 1K–6K vs baseline</h4>
  <p>Requires a baseline. Both frequencies in a consecutive pair must each shift ≥ 15 dB. Example: right ear shifts +15 dB at 2K and +20 dB at 3K.</p>
  <table class="help-table">
    <thead><tr><th></th><th>500</th><th>1k</th><th>2k</th><th>3k</th><th>4k</th><th>6k</th><th>8k</th></tr></thead>
    <tbody>
      <tr><td>Baseline R</td><td>10</td><td>10</td><td>15</td><td>15</td><td>20</td><td>20</td><td>25</td></tr>
      <tr><td>Current R</td><td>10</td><td>10</td><td><strong>30</strong></td><td><strong>35</strong></td><td>25</td><td>25</td><td>30</td></tr>
      <tr><td>Shift</td><td>0</td><td>0</td><td><strong>+15</strong></td><td><strong>+20</strong></td><td>+5</td><td>+5</td><td>+5</td></tr>
    </tbody>
  </table>

  <h4>Rule 5 — Standard Threshold Shift (STS): average shift ≥ 10 dB at 2K+3K+4K vs baseline</h4>
  <p>Requires a baseline. The average of the three shifts at exactly 2K, 3K, and 4K must reach 10 dB. Example: +10 dB at each of 2K, 3K, 4K — average = 10.0 dB → EW. This example does not trigger Rule 4 because no two consecutive shifts individually reach 15 dB. When both Rule 4 and Rule 5 conditions are met, Rule 4 (Abnormal) takes precedence.</p>
  <table class="help-table">
    <thead><tr><th></th><th>500</th><th>1k</th><th>2k</th><th>3k</th><th>4k</th><th>6k</th><th>8k</th></tr></thead>
    <tbody>
      <tr><td>Baseline R</td><td>10</td><td>10</td><td>15</td><td>15</td><td>20</td><td>20</td><td>25</td></tr>
      <tr><td>Current R</td><td>10</td><td>10</td><td><strong>25</strong></td><td><strong>25</strong></td><td><strong>30</strong></td><td>25</td><td>30</td></tr>
      <tr><td>Shift</td><td>0</td><td>0</td><td><strong>+10</strong></td><td><strong>+10</strong></td><td><strong>+10</strong></td><td>+5</td><td>+5</td></tr>
    </tbody>
  </table>
  <p>Average at 2K+3K+4K = (10+10+10) ÷ 3 = <strong>10.0 dB</strong> → EW / STS flag set.</p>

  <h3>British Columbia (WorkSafeBC)</h3>
  <p>BC uses separate category sets for baseline and periodic tests. Baseline tests produce N, EW, or A. Periodic tests produce NC, EWC, or AC.</p>
  <table class="help-table">
    <thead><tr><th>Code</th><th>Label</th><th>Test type</th><th>Trigger</th></tr></thead>
    <tbody>
      <tr><td><span class="class-badge class-n">N</span></td><td>Normal</td><td>Baseline</td><td>No rule triggered on initial test</td></tr>
      <tr><td><span class="class-badge class-ew">EW</span></td><td>Early Warning</td><td>Baseline</td><td>Noise notch ≥ 15 dB at 3K/4K/6K above min(1K,2K) anchor</td></tr>
      <tr><td><span class="class-badge class-a">A</span></td><td>Abnormal</td><td>Baseline</td><td>Any threshold ≥ 30 dB at 500–2000 Hz</td></tr>
      <tr><td><span class="class-badge class-nc">NC</span></td><td>Normal Change</td><td>Periodic</td><td>No shift rule triggered — default for periodic tests</td></tr>
      <tr><td><span class="class-badge class-ewc">EWC</span></td><td>Early Warning Change</td><td>Periodic</td><td>Single frequency shift ≥ 15 dB at 3K or 4K vs baseline</td></tr>
      <tr><td><span class="class-badge class-ac">AC</span></td><td>Abnormal Change</td><td>Periodic</td><td>Two adjacent frequencies both shift ≥ 15 dB at 500–4K Hz vs baseline</td></tr>
    </tbody>
  </table>

  <h3>Saskatchewan (OHS Regulations 1996)</h3>
  <p>Saskatchewan uses three categories. Each test is assessed against absolute thresholds (baseline tests) and shift rules (periodic tests).</p>
  <table class="help-table">
    <thead><tr><th>Code</th><th>Label</th><th>Trigger</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td><span class="class-badge class-n">N</span></td><td>Normal</td><td>No rule triggered</td><td>No action required.</td></tr>
      <tr><td><span class="class-badge class-ew">EW</span></td><td>Early Warning</td><td>Single frequency shift ≥ 15 dB at 2K–6K Hz vs baseline</td><td>Retest within 24 months. Counsel on HPD use.</td></tr>
      <tr><td><span class="class-badge class-a">A</span></td><td>Abnormal</td><td>Average threshold ≥ 25 dB at 500–6K Hz (baseline); or shift ≥ 15 dB at two adjacent frequencies; or shift ≥ 25 dB at any single frequency</td><td>Referral required.</td></tr>
    </tbody>
  </table>

  <h3>Referral workflow</h3>
  <p>When a result is Abnormal (A or AC) or Standard Threshold Shift (EW in Alberta), the referral to a physician or audiologist is completed on-site during the counselling session. Connect Hearing carries the paper referral forms for this purpose. The referral form can also be printed directly from TechTool or MasterDB and includes the worker's name, employer, test date, classification, audiogram with threshold values, and counsel text.</p>

  <h3>STS Flag</h3>
  <p>The STS flag is set on any test classified as EW, EWC, A, or AC. For Alberta specifically, EW represents a Standard Threshold Shift as defined in OHS Code Part 16 — an average threshold shift of 10 dB or more at 2000, 3000, and 4000 Hz. STS-flagged employees appear on the Dashboard KPI tile and in the STS / Flagged report.</p>
`,

troubleshooting: `
  <h2>Troubleshooting</h2>
  <h3>Legacy Import — "Could not find a recognisable header row"</h3>
  <table class="help-table">
    <thead><tr><th>Cause</th><th>Fix</th></tr></thead>
    <tbody>
      <tr><td>File is a different format entirely</td><td>Check that the file has columns like "First name", "Surname", "Test Date", "Left 05 KHZ" etc.</td></tr>
      <tr><td>Column headers are in a merged cell or hidden row</td><td>Open the file in Excel, unhide all rows and columns, and re-save.</td></tr>
      <tr><td>Column headers use unusual spellings</td><td>Rename the headers in Excel to match the standard names and re-save.</td></tr>
    </tbody>
  </table>
  <h3>Legacy Import — dates showing as skipped</h3>
  <p>Rows are skipped when the test date cannot be parsed. Supported formats: <code>JUL 29 2009</code>, <code>JULY 10 2017</code>, <code>SEPT 27 1985</code>, <code>2025-07-22</code>. Reformat the Test Date column in Excel if needed.</p>
  <h3>Legacy Import — wrong company name detected</h3>
  <ul style="margin:8px 0 0 20px;font-size:13px;line-height:1.8">
    <li>Rename the file to follow the <code>Company_Name_Month_DD_YYYY.xlsx</code> pattern.</li>
    <li>Or proceed and rename the company record in MasterDB after import.</li>
  </ul>
  <h3>Incoming Packets — "Company not found in MasterDB"</h3>
  <p>The company name in the packet does not match any company in the database. Create the company in MasterDB first, or check for a name spelling difference.</p>
  <h3>Sync folder disconnects between sessions</h3>
  <p>This is normal browser behaviour. Go to Settings → Sync Folder → Reconnect at the start of each working session if the indicator shows grey.</p>
  <h3>Data appears to be gone after clearing browser data</h3>
  <p>MasterDB data is stored in the browser's OPFS. Clearing browser data will permanently delete it. Always maintain a current backup via Settings → Download Backup.</p>
  <div class="alert alert-warn">
    There is no way to recover data lost through a browser clear without a backup file. Back up after every import session.
  </div>
  <h3>Performance is slow with large datasets</h3>
  <p>MasterDB uses sql.js (SQLite compiled to WebAssembly) running in the browser. Some queries may take a moment with large datasets. Avoid running multiple browser tabs with MasterDB open simultaneously.</p>
  <h3>Getting further help</h3>
  <p>For issues not covered here, contact your MasterDB administrator or refer to the build specification document (TechTool_MasterDB_BuildSpec).</p>
`

} // end SECTIONS

const HELP_STYLES = `
  .help-layout {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 20px;
    align-items: start;
  }
  .help-nav {
    background: #fff;
    border: 1px solid var(--grey-200);
    border-radius: var(--radius);
    padding: 8px 0;
    position: sticky;
    top: 16px;
  }
  .help-nav-section {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--grey-500);
    padding: 12px 14px 4px;
  }
  .help-nav-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 7px 14px;
    font-size: 13px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--grey-700);
    border-radius: 0;
    transition: background .1s, color .1s;
  }
  .help-nav-item:hover { background: var(--grey-50); color: var(--grey-900); }
  .help-nav-item.active { background: var(--navy-light); color: var(--navy-mid); font-weight: 600; }
  .help-content {
    background: #fff;
    border: 1px solid var(--grey-200);
    border-radius: var(--radius);
    padding: 28px 32px;
    min-height: 500px;
    overflow-y: auto;
  }
  .help-content h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--grey-200);
  }
  .help-content h3 { font-size: 15px; font-weight: 600; color: var(--grey-900); margin: 20px 0 8px; }
  .help-content h4 { font-size: 13px; font-weight: 600; color: var(--grey-700); margin: 16px 0 6px; text-transform: uppercase; letter-spacing: .04em; }
  .help-content p { font-size: 13px; line-height: 1.7; color: var(--grey-700); margin-bottom: 10px; }
  .help-content ul { font-size: 13px; line-height: 1.8; color: var(--grey-700); }
  .help-table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 10px 0 16px; }
  .help-table thead th {
    background: var(--grey-50);
    border-bottom: 2px solid var(--grey-200);
    padding: 7px 10px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: var(--grey-500);
  }
  .help-table tbody td { padding: 8px 10px; border-bottom: 1px solid var(--grey-100); vertical-align: top; line-height: 1.5; }
  .help-steps { display: flex; flex-direction: column; gap: 8px; margin: 10px 0 16px; }
  .help-step { display: flex; gap: 12px; align-items: flex-start; font-size: 13px; line-height: 1.6; color: var(--grey-700); }
  .help-step-num {
    flex-shrink: 0; width: 22px; height: 22px;
    background: var(--navy-mid); color: #fff;
    border-radius: 50%; font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; margin-top: 1px;
  }
  .help-code { background: var(--grey-50); border: 1px solid var(--grey-200); border-radius: var(--radius); padding: 8px 12px; font-family: monospace; font-size: 13px; margin: 8px 0 10px; }
  .help-btn {
    position: absolute; top: 12px; right: 16px;
    width: 28px; height: 28px; border-radius: 50%;
    font-size: 14px; font-weight: 700; padding: 0;
    border: 1.5px solid var(--grey-300); background: #fff; color: var(--grey-700);
    cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;
  }
  .help-btn:hover { background: var(--navy-light); border-color: var(--navy-mid); color: var(--navy-mid); }
`

if (!document.getElementById('help-styles')) {
  const style = document.createElement('style')
  style.id = 'help-styles'
  style.textContent = HELP_STYLES
  document.head.appendChild(style)
}
