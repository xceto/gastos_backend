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

class ImportService {
  /**
   * Compare a list of parsed rows against the database.
   *
   * Each row must have:
   *   { date: 'YYYY-MM-DD', amount: Number, description: String }
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

    for (const row of rows) {
      const amountMatch = existing.find((e) =>
        Math.abs(parseFloat(e.amount) - parseFloat(row.amount)) <= AMOUNT_TOLERANCE
      );

      const suggested = suggestCategory(row.description, existing);

      const enriched = { ...row, suggestedCategory: suggested };

      if (amountMatch) {
        possibleDuplicates.push({ ...enriched, matchedDate: amountMatch.date });
      } else {
        newExpenses.push(enriched);
      }
    }

    return { newExpenses, possibleDuplicates };
  }
}

module.exports = new ImportService();
