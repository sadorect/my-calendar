/**
 * Merging two copies of a user's blob.
 *
 * Sync is compare-and-set on a revision number, so the ordinary case — one
 * device at a time — never merges at all. This code exists for the genuine
 * concurrent case: two devices both wrote since they last agreed.
 *
 * The rule for each part is chosen by what would hurt least if it went wrong:
 *
 *   journal      per key, keep the entry with the later updatedAt. Losing a
 *                paragraph somebody wrote is the worst outcome available here,
 *                so entries are never dropped, only superseded.
 *   favourites   union, keeping the earliest save. A favourite is cheap to
 *                remove and painful to lose.
 *   spoken       union, earliest. Same reasoning; it drives a streak.
 *   profiles     union by id; within an id, the later updatedAt wins. A child
 *                added on one device is never removed by the other.
 *   settings     from whichever blob is newer overall — they are preferences,
 *                not history, and a half-and-half merge would be incoherent.
 *   dueDate      per profile, from the winning copy of that profile. Changing
 *                it re-dates everything, so the two halves must not disagree.
 *
 * A deletion made on one device while the other was editing can come back: a
 * union cannot tell "never had it" from "deleted it" without tombstones. That
 * is a deliberate trade — resurrecting a favourite, or a child profile, is a
 * smaller harm than losing a journal entry.
 *
 * Both sides are brought to the current state version first, so a version 1
 * blob pushed by a device that has not updated yet merges correctly with a
 * version 2 one instead of overwriting it. See `familyState.js` for why a
 * version 2 blob still carries the version 1 fields.
 */

import {
  migrateState,
  emptyProfileData,
  orderedProfiles,
  writeLegacyMirror,
  STATE_VERSION
} from './familyState.js'

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
  for (const [key, entry] of Object.entries(local)) {
    const existing = merged[key]
    if (!existing) {
      merged[key] = entry
      continue
    }
    const localTime = Date.parse(entry?.updatedAt || '') || 0
    const remoteTime = Date.parse(existing?.updatedAt || '') || 0
    if (localTime > remoteTime) merged[key] = entry
    else if (localTime === remoteTime && entry?.text !== existing?.text) {
      // Same timestamp, different text: keep both rather than pick a winner by
      // coin toss. This is rare and a visible join is better than a silent loss.
      merged[key] = {
        text: `${existing.text}\n\n— — —\n\n${entry.text}`,
        updatedAt: existing.updatedAt
      }
    }
  }
  return merged
}

/** Everything one child owns. The version 1 rules, one level down. */
function mergeProfileData(local, remote) {
  const a = local || emptyProfileData()
  const b = remote || emptyProfileData()
  return {
    favourites: mergeTimestampMap(a.favourites, b.favourites),
    spoken: mergeTimestampMap(a.spoken, b.spoken),
    journal: mergeJournal(a.journal, b.journal),
    // Day keys sort chronologically as strings, so the later one is simply the
    // greater. Taking the max stops a merge from re-firing today's reminder.
    lastReminderKey: [a.lastReminderKey, b.lastReminderKey].filter(Boolean).sort().pop() || null
  }
}

/** Empty in the sense of "this side has nothing to say about that field". */
function isBlank(value) {
  return value == null || value === '' || value === 'auto'
}

/**
 * One child's record, field by field rather than whole.
 *
 * Later `updatedAt` wins each field, but **a merge never clears a field to
 * empty** — an empty value only ever loses to a real one. That matters because
 * of the version 1 mirror: a device still running version 1 knows only a name
 * and a due date, and when its blob is migrated for merging it produces a
 * profile that is blank everywhere else and stamped with the moment it synced.
 * Whole-record "newest wins" would let that stale device silently erase the
 * notes, photo and stage of a child it cannot even see.
 */
function mergeProfile(a, b) {
  const win = newer(a, b)
  const lose = win === a ? b : a
  const merged = { ...win }
  for (const [key, value] of Object.entries(lose)) {
    if (isBlank(merged[key]) && !isBlank(value)) merged[key] = value
  }
  return merged
}

function mergeProfiles(local = {}, remote = {}) {
  const merged = { ...remote }
  for (const [id, profile] of Object.entries(local)) {
    const existing = merged[id]
    if (!existing) {
      merged[id] = profile
      continue
    }
    merged[id] = mergeProfile(existing, profile)
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

  const a = migrateState(local)
  const b = migrateState(remote)
  const dominant = newer(a, b)

  const profiles = mergeProfiles(a.profiles, b.profiles)
  const data = {}
  for (const id of Object.keys(profiles)) {
    data[id] = mergeProfileData(a.data[id], b.data[id])
  }

  const merged = {
    ...dominant,
    version: STATE_VERSION,
    profiles,
    data,
    settings: { ...(dominant.settings || {}) },
    updatedAt: new Date().toISOString()
  }

  // The active profile is a per-device view preference more than a fact, but it
  // must at least name a child that still exists.
  if (!profiles[merged.activeProfileId]) {
    merged.activeProfileId = orderedProfiles(merged)[0]?.id || null
  }

  return writeLegacyMirror(merged)
}

/** True when the two blobs differ in anything worth a write. */
export function statesDiffer(a, b) {
  if (!a || !b) return true
  const strip = ({ updatedAt: _updatedAt, ...rest }) => JSON.stringify(rest)
  return strip(a) !== strip(b)
}
