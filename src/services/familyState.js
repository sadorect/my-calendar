/**
 * The shape of everything a user owns, and how a version 1 blob becomes one.
 *
 * Deliberately pure — no Vue, no Pinia, no IndexedDB — because this is the code
 * that decides whether somebody's journal survives an upgrade, and that is
 * worth unit testing rather than eyeballing through a running app.
 *
 * ## Version 1 (the Birth Calendar)
 *
 * One pregnancy, flat: `dueDate`, `babyName`, and `favourites` / `journal` /
 * `spoken` maps at the top level.
 *
 * ## Version 2 (Family Whispers)
 *
 * Many children, each in a life stage. The per-subject maps move down one level
 * into `data[profileId]`; everything else about them — their keys, their values,
 * their merge rules — is unchanged, so migrating a womb user is a move rather
 * than a rewrite and they see no difference at all.
 *
 * ## Why version 1 fields are still written
 *
 * Sync is live, and this app's own history says installs lag: a device holding
 * an old service worker can keep running version 1 code for days. If a version
 * 2 client pushed a blob with no top-level `journal`, that stale device would
 * read an empty journal, believe the user had cleared it, and push that back.
 *
 * So a version 2 blob carries a *mirror* of the primary womb profile in the
 * version 1 fields. Old clients keep working on the womb track; new clients
 * fold anything an old client wrote back into the profile on load. The mirror
 * costs a duplicate copy of one child's text and is removable once no version 1
 * client can still be out there.
 */

import { isStageId } from '../data/family/stages.js'

export const STATE_VERSION = 2

/**
 * The id given to the profile minted from a version 1 blob.
 *
 * Fixed, not random, and this is load-bearing: two devices migrating the same
 * version 1 account offline would otherwise mint two different ids, and the
 * merge — which unions profiles by id — would hand the user duplicate children.
 */
export const LEGACY_PROFILE_ID = 'womb-1'

export function emptyProfileData() {
  return {
    favourites: {}, // "day:47" | "week:12" | "school:m03:d17" -> ISO timestamp
    journal: {}, // womb: day number. Born stages: ISO date -> { text, updatedAt }
    spoken: {}, // same keying as journal -> ISO timestamp
    lastReminderKey: null // local day key of the last delivered reminder
  }
}

export function emptySettings() {
  return {
    defaultMode: 'birth', // 'standard' | 'birth'
    voice: 'parents', // 'parents' | 'partner'
    reminderTime: '08:00',
    remindersEnabled: false,
    ambientSound: 'womb',
    ambientVolume: 0.5,
    fontScale: 1,
    highContrast: false,
    appLockEnabled: false,
    credentialId: null,
    lockGraceMinutes: 5
  }
}

export function emptyState() {
  return {
    version: STATE_VERSION,
    profiles: {}, // id -> profile
    activeProfileId: null,
    data: {}, // id -> profile data
    settings: emptySettings(),

    // --- version 1 mirror, for clients that have not updated yet ---
    dueDate: null,
    babyName: '',
    favourites: {},
    journal: {},
    spoken: {},
    lastReminderKey: null,

    updatedAt: null
  }
}

let profileCounter = 0

/** Unique enough for a per-account list of children, and readable in a blob. */
export function newProfileId() {
  profileCounter += 1
  const random = Math.random().toString(36).slice(2, 8)
  return `p_${Date.now().toString(36)}${profileCounter.toString(36)}${random}`
}

export function makeProfile({
  id = newProfileId(),
  kind = 'child',
  name = '',
  dueDate = null,
  birthDate = null,
  stage = 'auto',
  notes = '',
  photoId = null,
  createdAt = new Date().toISOString()
} = {}) {
  return {
    id,
    kind: kind === 'womb' ? 'womb' : 'child',
    name: String(name || '').trim(),
    dueDate,
    birthDate,
    // A womb profile has no stage of its own; its track is implied by its kind.
    stage: kind === 'womb' ? 'womb' : isStageId(stage) || stage === 'auto' ? stage : 'auto',
    notes: String(notes || ''),
    photoId, // key into the local photo store — never synced, see photoStore.js
    createdAt,
    updatedAt: createdAt
  }
}

/** Profiles in a stable order for the switcher: oldest profile first. */
export function orderedProfiles(state) {
  return Object.values(state?.profiles || {}).sort((a, b) => {
    const at = Date.parse(a?.createdAt || '') || 0
    const bt = Date.parse(b?.createdAt || '') || 0
    if (at !== bt) return at - bt
    return String(a.id).localeCompare(String(b.id))
  })
}

/** The womb profile the version 1 mirror represents, if there is one. */
export function primaryWombProfile(state) {
  const profiles = orderedProfiles(state)
  return (
    profiles.find((p) => p.id === LEGACY_PROFILE_ID && p.kind === 'womb') ||
    profiles.find((p) => p.kind === 'womb') ||
    null
  )
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cleanMap(map) {
  return isPlainObject(map) ? { ...map } : {}
}

/**
 * Union of two timestamp maps, keeping the earliest save.
 *
 * The same rule `mergeState.js` uses, and for the same reason: the first time
 * something was saved is the true one, and a favourite is cheap to remove and
 * painful to lose.
 */
function unionEarliest(a = {}, b = {}) {
  const out = { ...b }
  for (const [key, value] of Object.entries(a)) {
    const existing = out[key]
    if (!existing) {
      out[key] = value
      continue
    }
    out[key] = Date.parse(value) <= Date.parse(existing) ? value : existing
  }
  return out
}

/** Union of two journal maps, later `updatedAt` winning. Never drops an entry. */
function unionJournal(a = {}, b = {}) {
  const out = { ...b }
  for (const [key, entry] of Object.entries(a)) {
    const existing = out[key]
    if (!existing) {
      out[key] = entry
      continue
    }
    const at = Date.parse(entry?.updatedAt || '') || 0
    const bt = Date.parse(existing?.updatedAt || '') || 0
    if (at > bt) out[key] = entry
  }
  return out
}

/** Builds a version 2 state from a version 1 blob. Nothing is discarded. */
function fromLegacy(saved) {
  const next = emptyState()
  next.settings = { ...emptySettings(), ...(isPlainObject(saved.settings) ? saved.settings : {}) }
  next.updatedAt = saved.updatedAt || null

  const hasAnything =
    saved.dueDate ||
    saved.babyName ||
    Object.keys(cleanMap(saved.favourites)).length ||
    Object.keys(cleanMap(saved.journal)).length ||
    Object.keys(cleanMap(saved.spoken)).length

  // A user who never finished onboarding gets no profile rather than an empty
  // child they would have to name and then delete.
  if (!hasAnything) return next

  const profile = makeProfile({
    id: LEGACY_PROFILE_ID,
    kind: 'womb',
    name: saved.babyName || '',
    dueDate: saved.dueDate || null,
    createdAt: saved.updatedAt || new Date().toISOString()
  })
  next.profiles[profile.id] = profile
  next.data[profile.id] = {
    favourites: cleanMap(saved.favourites),
    journal: cleanMap(saved.journal),
    spoken: cleanMap(saved.spoken),
    lastReminderKey: saved.lastReminderKey || null
  }
  next.activeProfileId = profile.id
  return writeLegacyMirror(next)
}

/**
 * Folds whatever a still-on-version-1 client wrote in the mirror fields back
 * into the womb profile.
 *
 * Unions rather than replaces, because an old client can only meaningfully add:
 * a deletion it made cannot be told apart from a key it never had without
 * tombstones. That is the same trade `mergeState.js` documents — an unwanted
 * favourite coming back is a smaller harm than a lost journal entry.
 */
export function reconcileLegacyMirror(state) {
  const profile = primaryWombProfile(state)
  if (!profile) return state

  const data = state.data[profile.id] || emptyProfileData()
  state.data[profile.id] = {
    favourites: unionEarliest(cleanMap(state.favourites), data.favourites),
    journal: unionJournal(cleanMap(state.journal), data.journal),
    spoken: unionEarliest(cleanMap(state.spoken), data.spoken),
    lastReminderKey:
      [state.lastReminderKey, data.lastReminderKey].filter(Boolean).sort().pop() || null
  }

  // The name and due date are single values, so "the mirror wins" is the only
  // rule available — an old client that changed either meant it. But a blank
  // never wins: an empty mirror is far more likely to be a client that never
  // had the value than a user who deliberately cleared it, and a stale name is
  // a smaller harm than a chosen name disappearing.
  if (state.dueDate && state.dueDate !== profile.dueDate) profile.dueDate = state.dueDate
  if (state.babyName && state.babyName !== profile.name) profile.name = state.babyName
  return state
}

/** Republishes the primary womb profile into the version 1 fields. */
export function writeLegacyMirror(state) {
  const profile = primaryWombProfile(state)
  if (!profile) {
    state.dueDate = null
    state.babyName = ''
    state.favourites = {}
    state.journal = {}
    state.spoken = {}
    state.lastReminderKey = null
    return state
  }
  const data = state.data[profile.id] || emptyProfileData()
  state.dueDate = profile.dueDate || null
  state.babyName = profile.name || ''
  state.favourites = { ...data.favourites }
  state.journal = { ...data.journal }
  state.spoken = { ...data.spoken }
  state.lastReminderKey = data.lastReminderKey || null
  return state
}

/** Fills in anything a blob is missing without touching what it has. */
function normalise(saved) {
  const next = emptyState()
  next.version = STATE_VERSION
  next.settings = { ...emptySettings(), ...(isPlainObject(saved.settings) ? saved.settings : {}) }
  next.updatedAt = saved.updatedAt || null

  for (const [id, profile] of Object.entries(isPlainObject(saved.profiles) ? saved.profiles : {})) {
    if (!isPlainObject(profile)) continue
    next.profiles[id] = makeProfile({ ...profile, id })
    next.profiles[id].updatedAt = profile.updatedAt || next.profiles[id].createdAt
  }

  for (const id of Object.keys(next.profiles)) {
    const data = isPlainObject(saved.data?.[id]) ? saved.data[id] : {}
    next.data[id] = {
      favourites: cleanMap(data.favourites),
      journal: cleanMap(data.journal),
      spoken: cleanMap(data.spoken),
      lastReminderKey: data.lastReminderKey || null
    }
  }

  // Carry the mirror across so `reconcileLegacyMirror` can see what an old
  // client wrote; it is rewritten from the profile immediately afterwards.
  next.dueDate = saved.dueDate || null
  next.babyName = typeof saved.babyName === 'string' ? saved.babyName : ''
  next.favourites = cleanMap(saved.favourites)
  next.journal = cleanMap(saved.journal)
  next.spoken = cleanMap(saved.spoken)
  next.lastReminderKey = saved.lastReminderKey || null

  const ids = Object.keys(next.profiles)
  next.activeProfileId = ids.includes(saved.activeProfileId)
    ? saved.activeProfileId
    : orderedProfiles(next)[0]?.id || null

  return writeLegacyMirror(reconcileLegacyMirror(next))
}

/**
 * Brings any saved blob — absent, version 1, or version 2 — up to date.
 * Idempotent: migrating an already-migrated blob changes nothing.
 */
export function migrateState(saved) {
  if (!isPlainObject(saved)) return emptyState()
  if (Number(saved.version) >= STATE_VERSION && isPlainObject(saved.profiles)) {
    return normalise(saved)
  }
  return fromLegacy(saved)
}
