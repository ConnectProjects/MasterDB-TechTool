import { query, queryOne, run, lastInsertId } from './sqlite.js'

export function getTestsByEmployee(employeeId) {
  return query(`
    SELECT t.*, h.hpd_make_model, h.rated_nrr, h.derated_nrr, h.lex8hr, h.protected_exposure, h.adequacy
    FROM tests t
    LEFT JOIN hpd_assessments h ON h.test_id = t.test_id
    WHERE t.employee_id = ?
    ORDER BY t.test_date DESC
  `, [employeeId])
}

export function getRecentTests(companyId, limit = 20) {
  return query(`
    SELECT t.*, e.first_name, e.last_name
    FROM tests t
    JOIN employees e ON e.employee_id = t.employee_id
    WHERE e.company_id = ?
    ORDER BY t.test_date DESC
    LIMIT ?
  `, [companyId, limit])
}

export function getSTSFlags(companyId) {
  return query(`
    SELECT t.*, e.first_name, e.last_name
    FROM tests t
    JOIN employees e ON e.employee_id = t.employee_id
    WHERE e.company_id = ? AND t.sts_flag = 1
    ORDER BY t.test_date DESC
  `, [companyId])
}

export function getOverdueTests(monthsThreshold = 24) {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - monthsThreshold)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  return query(`
    SELECT e.*, c.name AS company_name, c.province,
      MAX(t.test_date) AS last_test_date
    FROM employees e
    JOIN companies c ON c.company_id = e.company_id
    LEFT JOIN tests t ON t.employee_id = e.employee_id
    WHERE e.status = 'active' AND c.active = 1
    GROUP BY e.employee_id
    HAVING last_test_date IS NULL OR last_test_date < ?
    ORDER BY last_test_date ASC
  `, [cutoffStr])
}

export function createTest(data) {
  const classJson = data.classification ? JSON.stringify(data.classification) : null
  const qJson     = data.questionnaire    ? JSON.stringify(data.questionnaire)    : null
  const stsFlag   = data.classification?.category === 'EW'  ||
                    data.classification?.category === 'EWC' ||
                    data.classification?.category === 'A'   ||
                    data.classification?.category === 'AC'  ? 1 : 0

  run(`INSERT INTO tests
    (employee_id, test_date, tech_id, test_type, province,
     left_500, left_1k, left_2k, left_3k, left_4k, left_6k, left_8k,
     right_500, right_1k, right_2k, right_3k, right_4k, right_6k, right_8k,
     classification, triggered_rule_id, triggering_freq_hz, triggering_ear,
     shift_db, sts_flag, counsel_text, tech_notes, questionnaire, packet_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.employee_id, data.test_date, data.tech_id ?? null, data.test_type ?? 'Periodic',
     data.province,
     data.left_500  ?? null, data.left_1k  ?? null, data.left_2k  ?? null, data.left_3k  ?? null,
     data.left_4k   ?? null, data.left_6k  ?? null, data.left_8k  ?? null,
     data.right_500 ?? null, data.right_1k ?? null, data.right_2k ?? null, data.right_3k ?? null,
     data.right_4k  ?? null, data.right_6k ?? null, data.right_8k ?? null,
     classJson,
     data.classification?.triggered_rule_id ?? null,
     data.classification?.triggering_freq_hz != null ? String(data.classification.triggering_freq_hz) : null,
     data.classification?.triggering_ear ?? null,
     data.classification?.shift_db ?? null,
     stsFlag,
     data.counsel_text ?? null, data.tech_notes ?? null, qJson, data.packet_id ?? null]
  )
  return lastInsertId()
}

export function updateTest(testId, data) {
  run(`UPDATE tests SET
    test_date = ?, test_type = ?, province = ?,
    left_500 = ?, left_1k = ?, left_2k = ?, left_3k = ?, left_4k = ?, left_6k = ?, left_8k = ?,
    right_500 = ?, right_1k = ?, right_2k = ?, right_3k = ?, right_4k = ?, right_6k = ?, right_8k = ?,
    updated_at = datetime('now')
    WHERE test_id = ?`,
    [data.test_date, data.test_type ?? 'Periodic', data.province,
     data.left_500  ?? null, data.left_1k  ?? null, data.left_2k  ?? null, data.left_3k  ?? null,
     data.left_4k   ?? null, data.left_6k  ?? null, data.left_8k  ?? null,
     data.right_500 ?? null, data.right_1k ?? null, data.right_2k ?? null, data.right_3k ?? null,
     data.right_4k  ?? null, data.right_6k ?? null, data.right_8k ?? null,
     testId]
  )
}

export function createHPDAssessment(testId, hpd) {
  if (!hpd?.valid) return null
  run(`INSERT INTO hpd_assessments
    (test_id, hpd_make_model, rated_nrr, derated_nrr, lex8hr, protected_exposure, adequacy)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [testId, hpd.hpd_model ?? null, hpd.rated_nrr, hpd.derated_nrr,
     hpd.lex8hr, hpd.protected_exposure, hpd.adequacy]
  )
  return lastInsertId()
}

export function deleteTest(testId) {
  run('DELETE FROM tests WHERE test_id = ?', [testId])
  run('DELETE FROM hpd_assessments WHERE test_id = ?', [testId])
}

export function getDashboardStats() {
  const ago30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  return {
    totalCompanies:  queryOne('SELECT COUNT(*) AS n FROM companies WHERE active = 1')?.n ?? 0,
    totalEmployees:  queryOne("SELECT COUNT(*) AS n FROM employees WHERE status = 'active'")?.n ?? 0,
    testsThisMonth:  queryOne('SELECT COUNT(*) AS n FROM tests WHERE test_date >= ?', [ago30])?.n ?? 0,
    stsFlags:        queryOne('SELECT COUNT(*) AS n FROM tests t JOIN employees e ON e.employee_id = t.employee_id JOIN companies c ON c.company_id = e.company_id WHERE t.sts_flag = 1 AND c.active = 1')?.n ?? 0,
    pendingPackets:  queryOne("SELECT COUNT(*) AS n FROM packets WHERE status = 'pending'")?.n ?? 0,
    incomingPackets: queryOne("SELECT COUNT(*) AS n FROM packets WHERE status = 'submitted'")?.n ?? 0
  }
}
