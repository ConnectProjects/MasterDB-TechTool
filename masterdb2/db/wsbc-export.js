/**
 * masterdb2/db/wsbc-export.js — WorkSafeBC File_Upload_Template CSV generator
 *
 * generateWsbcCsv(locationId, testIds)
 *   Generate a File_Upload_Template CSV from DB records for the given location and tests.
 *   testIds: array of test_id values to include (from a just-imported packet or a
 *            Reports-screen export).
 *
 * Returns { csv: string, filename: string } — caller triggers browser download.
 *
 * Column order matches the official WSBC File_Upload_Template exactly.
 */

import { query } from './db.js'

const WSBC_HEADERS = [
  'Submitted by user',
  'Test Date',
  'Technician ID',
  'Technician First Name',
  'Technician Last Name',
  'Worker ID',
  'Worker First Name',
  'Worker Middle Name',
  'Worker Last Name',
  'Worker Abbr Name',
  'Birth Date',
  'Gender',
  '4 digits SIN',
  'Years in Occupation',
  'Employer ID',
  'Employer Name',
  'Operating Location',
  'CU Code',
  'CU Description',
  'Occupation Code',
  'Occupation Job Title',
  'Comment',
  'LeftEar05khz',
  'LeftEar1khz',
  'LeftEar2khz',
  'LeftEar3khz',
  'LeftEar4khz',
  'LeftEar6khz',
  'LeftEar8khz',
  'RightEar05khz',
  'RightEar1khz',
  'RightEar2khz',
  'RightEar3khz',
  'RightEar4khz',
  'RightEar6khz',
  'RightEar8khz',
  'ExposedToNoiseInLastHours',
  'HowManyHoursExposedToNoise',
  'RegularlyWearHearingProt',
  'ClassOfHearingProtWornReg',
  'StyleOfHearingProtWornReg',
  'WhyNotWearHearingProtReg',
  'HaveReceivedEducationAboutNoiseAndLostInLastYear',
  'HadSevereEarInfection',
  'HadEarSurgery',
  'HadDizzinessOrBalanceProblems',
  'HadSeriousHeadInjury',
  'HadHearingLossInChildhood',
  'HasRingingInEars',
  'WhichEar',
  'WhenFirstNoticed',
  'HadExposureToLoudBlast',
  'HasUsedFirearms',
  'FromWhichShoulderShoot',
  'NumYearsShootingFirearms',
  'I confirm that technician who conducted the test determined the test category for this worker',
  'I confirm that technician who conducted the test appropriately counselled the worker on both test results and hearing protection',
  'Worker Email',
  'Worker Phone Number',
]

function csvCell(v) {
  const s = String(v ?? '')
  return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function isoToWsbc(d) {
  if (!d) return ''
  return d.replace(/-/g, '/')
}

function dbThreshold(row, col) {
  const v = row[col]
  return v != null ? String(v) : ''
}

function yesNo(v) {
  if (v == null || v === '') return ''
  const s = String(v).toLowerCase()
  if (s === 'true' || s === 'yes' || s === '1') return 'Yes'
  if (s === 'false' || s === 'no' || s === '0') return 'No'
  return String(v)
}

// WSBC ExposedToNoiseInLastHours expects a number.
// TechTool captures noise_2h (Yes/No) + noise_2h_duration (text range).
function noiseHours(noise_2h, noise_2h_duration) {
  if (!noise_2h || noise_2h === false || String(noise_2h).toLowerCase() === 'false'
      || String(noise_2h).toLowerCase() === 'no') return '0'
  const dur = String(noise_2h_duration ?? '').toLowerCase()
  if (dur.includes('less') || dur.startsWith('<')) return '1'
  if (dur.includes('2-4') || dur.includes('2–4')) return '3'
  if (dur.includes('over') || dur.startsWith('>')) return '6'
  return '2'  // exposed but duration not specified
}

/**
 * Validate that all required WSBC fields are present for the given test IDs.
 *
 * Returns { valid: bool, groups: { company, location, worker, test }, totalCount }
 *   company  — array of strings (one entry per affected company)
 *   location — array of strings (one entry per affected location)
 *   worker   — array of { name, fields: string[] } (grouped per person)
 *   test     — array of strings (one per test/questionnaire issue)
 *   totalCount — total number of individual issues
 */
export function validateWsbcExport(testIds) {
  if (!testIds?.length) {
    return { valid: false, groups: { company: ['No tests selected.'], location: [], worker: [], test: [] }, totalCount: 1 }
  }

  const placeholders = testIds.map(() => '?').join(',')
  const rows = query(`
    SELECT
      te.test_id, te.test_date, te.questionnaire,
      e.first_name, e.last_name, e.dob, e.gender,
      e.wsbc_worker_id, e.occupation_code,
      c.name AS employer_name, c.worksafebc_employer_id,
      l.name AS location_number, l.cu_code,
      COALESCE(te.tech_iat, tk.iat_number, tkn.iat_number) AS wsbc_tech_id
    FROM tests te
    JOIN employees e  ON e.employee_id    = te.employee_id
    JOIN locations l  ON l.location_id    = te.location_id
    JOIN companies c  ON c.company_id     = l.company_id
    LEFT JOIN techs tk  ON tk.tech_id     = te.tech_id
    LEFT JOIN users u   ON u.user_id      = te.tech_id
    LEFT JOIN techs tkn ON tk.tech_id IS NULL
                       AND LOWER(tkn.name) = LOWER(u.name)
                       AND tkn.active = 1
    WHERE te.test_id IN (${placeholders}) AND te.deleted_at IS NULL
  `, testIds)

  const companyIssues  = new Set()
  const locationIssues = new Set()
  const workerIssues   = new Map()   // personKey → { name, fields: Set }
  const testIssues     = []

  function addWorkerIssue(row, field) {
    const key = String(row.wsbc_worker_id ?? `${row.last_name}|${row.first_name}`)
    if (!workerIssues.has(key)) {
      workerIssues.set(key, { name: `${row.last_name}, ${row.first_name}`, fields: new Set() })
    }
    workerIssues.get(key).fields.add(field)
  }

  for (const row of rows) {
    const name    = `${row.last_name}, ${row.first_name}`
    const dateLbl = `${name} (${row.test_date ?? '?'})`

    // Company-level
    if (!row.worksafebc_employer_id) {
      companyIssues.add(`"${row.employer_name}" — WorkSafeBC Employer ID not set (edit company settings)`)
    }

    // Location-level
    if (!row.cu_code) {
      locationIssues.add(`"${row.location_number}" — CU Code not set (edit location settings)`)
    }

    // Worker-level (deduplicated per person)
    // wsbc_worker_id is optional — WSBC assigns it on first submission for new workers
    if (!row.dob)             addWorkerIssue(row, 'Date of birth')
    if (!row.gender)          addWorkerIssue(row, 'Gender')
    if (!row.occupation_code) addWorkerIssue(row, 'Occupation code')

    // Test / questionnaire
    let q = {}
    try { if (row.questionnaire) q = JSON.parse(row.questionnaire) } catch {}

    if (!row.wsbc_tech_id) {
      testIssues.push(`${dateLbl} — Technician ID not found; verify the technician has an IAT number in their profile`)
    }
    if (q.noise_2h == null && q.exposed_noise_last_hours == null) {
      testIssues.push(`${dateLbl} — Noise exposure question not answered (ExposedToNoiseInLastHours)`)
    }
    if (q.wear_hpd == null && q.regularly_wear_hpd == null) {
      testIssues.push(`${dateLbl} — HPD usage question not answered (RegularlyWearHearingProt)`)
    }
    // WhyNotWear is required only when the worker does not wear HPD
    const wearVal   = q.wear_hpd ?? q.regularly_wear_hpd
    const notWearing = wearVal != null && (
      wearVal === false ||
      String(wearVal).toLowerCase() === 'false' ||
      String(wearVal).toLowerCase() === 'no'
    )
    if (notWearing && !q.hpd_no_reason && !q.why_not_wear_hpd) {
      testIssues.push(`${dateLbl} — Worker does not wear HPD but no reason was recorded (WhyNotWearHearingProtReg)`)
    }
    if (q.employer_info == null) {
      testIssues.push(`${dateLbl} — Noise education question not answered (HaveReceivedEducation)`)
    }
    if (q.childhood_loss == null && q.childhood_hearing_loss == null) {
      testIssues.push(`${dateLbl} — Childhood hearing loss question not answered (HadHearingLossInChildhood)`)
    }
    if (!q.years_in_occupation) {
      testIssues.push(`${dateLbl} — Years in occupation not recorded`)
    }
  }

  const workerList = [...workerIssues.values()].map(w => ({ name: w.name, fields: [...w.fields] }))

  const groups = {
    company:  [...companyIssues],
    location: [...locationIssues],
    worker:   workerList,
    test:     testIssues,
  }

  const totalCount = groups.company.length + groups.location.length +
                     groups.worker.reduce((n, w) => n + w.fields.length, 0) +
                     groups.test.length

  return { valid: totalCount === 0, groups, totalCount }
}

/**
 * Generate WSBC CSV for a set of test IDs.
 *
 * testIds: array of test_id integers
 * Returns { csv, filename } or throws.
 */
export function generateWsbcCsv(testIds) {
  if (!testIds?.length) throw new Error('No test IDs provided')

  const placeholders = testIds.map(() => '?').join(',')
  const rows = query(`
    SELECT
      te.test_id,
      te.test_date,
      te.left_500, te.left_1k, te.left_2k, te.left_3k, te.left_4k, te.left_6k, te.left_8k,
      te.right_500, te.right_1k, te.right_2k, te.right_3k, te.right_4k, te.right_6k, te.right_8k,
      te.questionnaire,
      e.first_name, e.middle_name, e.last_name, e.dob, e.sin_last_4, e.gender,
      e.phone AS worker_phone, e.email AS worker_email,
      e.wsbc_worker_id, e.job_title, e.occupation_code,
      c.name AS employer_name, c.worksafebc_employer_id,
      l.name AS location_number, l.cu_code,
      COALESCE(tk.name, tkn.name, u.name)                           AS tech_name,
      COALESCE(te.tech_iat, tk.iat_number, tkn.iat_number)         AS wsbc_tech_id
    FROM tests te
    JOIN employees e  ON e.employee_id    = te.employee_id
    JOIN locations l  ON l.location_id    = te.location_id
    JOIN companies c  ON c.company_id     = l.company_id
    LEFT JOIN techs tk  ON tk.tech_id     = te.tech_id
    LEFT JOIN users u   ON u.user_id      = te.tech_id
    LEFT JOIN techs tkn ON tk.tech_id IS NULL
                       AND LOWER(tkn.name) = LOWER(u.name)
                       AND tkn.active = 1
    WHERE te.test_id IN (${placeholders}) AND te.deleted_at IS NULL
    ORDER BY te.test_date, e.last_name, e.first_name
  `, testIds)

  const dataRows = rows.map(row => {
    let q = {}
    try { if (row.questionnaire) q = JSON.parse(row.questionnaire) } catch { /* ignore */ }

    const [techFirst, ...techRest] = (row.tech_name ?? '').split(' ')
    const techLast = techRest.join(' ')

    const operatingLocation = row.worksafebc_employer_id
      ? `${row.location_number} ${row.employer_name}`.trim()
      : row.location_number ?? ''

    return [
      '',                              // Submitted by user (left blank)
      isoToWsbc(row.test_date),
      row.wsbc_tech_id ?? '',          // Technician ID (IAT number used as WSBC ID)
      techFirst ?? '',
      techLast  ?? '',
      row.wsbc_worker_id ?? '',
      row.first_name  ?? '',
      row.middle_name ?? '',
      row.last_name   ?? '',
      '',                              // Worker Abbr Name
      isoToWsbc(row.dob),
      row.gender ?? '',
      row.sin_last_4  ?? '',
      q.years_in_occupation            ?? '',
      row.worksafebc_employer_id ?? '',
      row.employer_name ?? '',
      operatingLocation,
      row.cu_code ?? '',
      '',                              // CU Description
      row.occupation_code ?? '',
      row.job_title       ?? '',
      '',                              // Comment
      dbThreshold(row, 'left_500'),
      dbThreshold(row, 'left_1k'),
      dbThreshold(row, 'left_2k'),
      dbThreshold(row, 'left_3k'),
      dbThreshold(row, 'left_4k'),
      dbThreshold(row, 'left_6k'),
      dbThreshold(row, 'left_8k'),
      dbThreshold(row, 'right_500'),
      dbThreshold(row, 'right_1k'),
      dbThreshold(row, 'right_2k'),
      dbThreshold(row, 'right_3k'),
      dbThreshold(row, 'right_4k'),
      dbThreshold(row, 'right_6k'),
      dbThreshold(row, 'right_8k'),
      // TechTool keys first, fall back to WSBC-import keys (BC Hydro data)
      q.noise_2h != null
        ? noiseHours(q.noise_2h, q.noise_2h_duration)
        : (q.exposed_noise_last_hours ?? ''),
      q.noise_2h_duration              ?? q.hours_noise_exposure ?? '',
      yesNo(q.wear_hpd                 ?? q.regularly_wear_hpd),
      q.hpd_class                      ?? '',
      q.hpd_style                      ?? '',
      q.hpd_no_reason                  ?? q.why_not_wear_hpd ?? '',
      yesNo(q.employer_info),
      yesNo(q.ear_infection),
      yesNo(q.ear_surgery),
      yesNo(q.dizziness),
      yesNo(q.head_injury),
      yesNo(q.childhood_loss           ?? q.childhood_hearing_loss),
      yesNo(q.tinnitus),
      q.tinnitus_ear                   ?? '',
      '',                              // WhenFirstNoticed
      yesNo(q.blast_exposure),
      yesNo(q.firearms),
      '',                              // FromWhichShoulderShoot
      '',                              // NumYearsShootingFirearms
      'Yes',                           // confirm tech determined category
      'Yes',                           // confirm tech counselled worker
      row.worker_email                 ?? '',
      row.worker_phone                 ?? '',
    ]
  })

  const csv = [WSBC_HEADERS, ...dataRows]
    .map(r => r.map(csvCell).join(','))
    .join('\r\n')

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filename = `WSBC_File_Upload_${date}.csv`

  return { csv, filename }
}

/**
 * Generate WSBC CSV for all BC tests in a location within a date range.
 * Used by the Reports screen export button.
 */
export function generateWsbcCsvForLocation(locationId, fromDate, toDate) {
  const rows = query(
    `SELECT te.test_id FROM tests te
     JOIN locations l ON l.location_id = te.location_id
     WHERE te.location_id = ? AND te.deleted_at IS NULL
       AND te.test_date >= ? AND te.test_date <= ?
     ORDER BY te.test_date`,
    [locationId, fromDate, toDate]
  )
  const testIds = rows.map(r => r.test_id)
  if (!testIds.length) throw new Error('No tests found for this location in the selected date range')
  return generateWsbcCsv(testIds)
}
