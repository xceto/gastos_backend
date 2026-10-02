const Expense = require('../models/Expense');

/** Deduplication tolerance: amounts within ±AMOUNT_TOLERANCE are considered equal. */
const AMOUNT_TOLERANCE = 1;

/**
 * Normalize a description string for keyword extraction:
 * lowercase, remove accents, strip non-alphanumeric chars.
 */
function normalizeDesc(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Extract meaningful keywords (words longer than 3 chars) from a description.
 */
function extractKeywords(s) {
  return normalizeDesc(s).split(/\s+/).filter(w => w.length > 3);
}

/**
 * Given a row description and a list of existing expenses (with description + category),
 * return the most frequently matched category, or null if no match.
 */
function suggestCategory(rowDesc, existingWithCats) {
  const rowKw = extractKeywords(rowDesc);
  if (rowKw.length === 0) return null;

  const votes = {};
  for (const e of existingWithCats) {
    if (!e.category || !e.description) continue;
    const existKw = extractKeywords(e.description);
    const hasOverlap = rowKw.some(k => existKw.includes(k));
    if (hasOverlap) {
      votes[e.category] = (votes[e.category] || 0) + 1;
    }
  }

  let best = null;
  let bestCount = 0;
  for (const [cat, count] of Object.entries(votes)) {
    if (count > bestCount) { bestCount = count; best = cat; }
  }
  return best;
}

function normalizeDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

class ImportService {
  /**
   * Compare a list of parsed rows against the database using cardinality matching.
   *
   * Each row must have:
   *   { date: 'YYYY-MM-DD', amount: Number, description: String }
   *
   * A row is marked as duplicate only if there is an unconsumed expense in the database
   * with the exact same date, normalized description, and amount (within ±AMOUNT_TOLERANCE).
   *
   * Returns:
   *   {
   *     newExpenses:        [...rows, suggestedCategory?],
   *     possibleDuplicates: [...rows, matchedDate, suggestedCategory?]
   *   }
   */
  async preview(rows, userId) {
    if (!rows || rows.length === 0) return { newExpenses: [], possibleDuplicates: [] };

    // Fetch all expenses for this user — used for deduplication and category learning.
    const existing = await Expense.findAll({
      where: { user_id: userId },
      attributes: ['amount', 'date', 'description', 'category'],
      raw: true,
    });

    const newExpenses = [];
    const possibleDuplicates = [];

    // Track consumed existing expenses so multiple occurrences of the same transaction
    // on the same date can be accurately matched without false positives.
    const consumedExistingIndices = new Set();

    for (const row of rows) {
      const rowDate = normalizeDate(row.date);
      const rowDescNorm = normalizeDesc(row.description);
      const rowAmount = parseFloat(row.amount);

      let matchedIndex = -1;
      let matchedExpense = null;

      for (let i = 0; i < existing.length; i++) {
        if (consumedExistingIndices.has(i)) continue;

        const e = existing[i];
        const eDate = normalizeDate(e.date);
        const eDescNorm = normalizeDesc(e.description);
        const eAmount = parseFloat(e.amount);

        const isDateMatch = eDate === rowDate;
        const isDescMatch = eDescNorm === rowDescNorm;
        const isAmountMatch = Math.abs(eAmount - rowAmount) <= AMOUNT_TOLERANCE;

        if (isDateMatch && isDescMatch && isAmountMatch) {
          matchedIndex = i;
          matchedExpense = e;
          break;
        }
      }

      const suggested = suggestCategory(row.description, existing);
      const enriched = { ...row, suggestedCategory: suggested };

      if (matchedIndex !== -1) {
        consumedExistingIndices.add(matchedIndex);
        possibleDuplicates.push({ ...enriched, matchedDate: matchedExpense.date });
      } else {
        newExpenses.push(enriched);
      }
    }

    return { newExpenses, possibleDuplicates };
  }
}

module.exports = new ImportService();
