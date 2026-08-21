/**
 * Merging two copies of the birth-calendar blob.
 *
 * Sync is compare-and-set on a revision number, so the ordinary case — one
 * device at a time — never merges at all. This code exists for the genuine
 * concurrent case: two devices both wrote since they last agreed.
 *
 * The rule for each part is chosen by what would hurt least if it went wrong:
 *
 *   journal      per day, keep the entry with the later updatedAt. Losing a
 *                paragraph somebody wrote is the worst outcome available here,
 *                so entries are never dropped, only superseded.
 *   favourites   union, keeping the earliest save. A favourite is cheap to
 *                remove and painful to lose.
 *   spoken       union, earliest. Same reasoning; it drives a streak.
 *   settings     from whichever blob is newer overall — they are preferences,
 *                not history, and a half-and-half merge would be incoherent.
 *   dueDate      newer blob. Changing it re-dates everything, so the two halves
 *                must not disagree.
 *
 * A deletion made on one device while the other was editing can come back: a
 * union cannot tell "never had it" from "deleted it" without tombstones. That
 * is a deliberate trade — resurrecting a favourite is a smaller harm than
 * losing a journal entry, and it only happens in a true conflict.
 */

function newer(a, b) {
  const at = Date.parse(a?.updatedAt || '') || 0
  const bt = Date.parse(b?.updatedAt || '') || 0
  return bt > at ? b : a
}

function mergeTimestampMap(local = {}, remote = {}) {
  const merged = { ...remote }
  for (const [key, value] of Object.entries(local)) {
    const existing = merged[key]
    if (!existing) {
      merged[key] = value
      continue
    }
    // Earliest wins: the first time it was saved is the true one.
    merged[key] = Date.parse(value) <= Date.parse(existing) ? value : existing
  }
  return merged
}

function mergeJournal(local = {}, remote = {}) {
  const merged = { ...remote }
  for (const [day, entry] of Object.entries(local)) {
    const existing = merged[day]
    if (!existing) {
      merged[day] = entry
      continue
    }
    const localTime = Date.parse(entry?.updatedAt || '') || 0
    const remoteTime = Date.parse(existing?.updatedAt || '') || 0
    if (localTime > remoteTime) merged[day] = entry
    else if (localTime === remoteTime && entry?.text !== existing?.text) {
      // Same timestamp, different text: keep both rather than pick a winner by
      // coin toss. This is rare and a visible join is better than a silent loss.
      merged[day] = {
        text: `${existing.text}\n\n— — —\n\n${entry.text}`,
        updatedAt: existing.updatedAt
      }
    }
  }
  return merged
}

/**
 * @param {object} local   this device's blob
 * @param {object} remote  the copy on the server, already decrypted
 * @returns {object} a new blob; neither input is mutated
 */
export function mergeStates(local, remote) {
  if (!remote) return local
  if (!local) return remote

  const dominant = newer(local, remote)
  const merged = {
    ...dominant,
    favourites: mergeTimestampMap(local.favourites, remote.favourites),
    spoken: mergeTimestampMap(local.spoken, remote.spoken),
    journal: mergeJournal(local.journal, remote.journal),
    settings: { ...(dominant.settings || {}) },
    // Day keys sort chronologically as strings, so the later one is simply the
    // greater. Taking the max stops a merge from re-firing today's reminder.
    lastReminderKey:
      [local.lastReminderKey, remote.lastReminderKey].filter(Boolean).sort().pop() || null,
    updatedAt: new Date().toISOString()
  }
  return merged
}

/** True when the two blobs differ in anything worth a write. */
export function statesDiffer(a, b) {
  if (!a || !b) return true
  const strip = ({ updatedAt: _updatedAt, ...rest }) => JSON.stringify(rest)
  return strip(a) !== strip(b)
}
