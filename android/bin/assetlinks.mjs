#!/usr/bin/env node
/**
 * Writes public/.well-known/assetlinks.json — the file that tells Android the
 * TWA and this website are the same publisher.
 *
 * Why this is a script and not a checked-in constant: the file's whole content
 * is the SHA-256 fingerprint of the key the APK was signed with, and that key
 * does not exist until someone generates it. A placeholder committed here would
 * be worse than nothing — Android would fetch it, fail the match, and silently
 * show the app with a browser URL bar across the top, which looks like a bug in
 * the app rather than a mismatched certificate.
 *
 * The generated file IS committed, because Vercel deploys from git and the
 * fingerprint has to be live on the origin before an install will verify.
 *
 *   node android/bin/assetlinks.mjs --keystore android/birth-calendar.keystore --alias birth-calendar
 *   node android/bin/assetlinks.mjs --fingerprint AA:BB:...:FF
 *   node android/bin/assetlinks.mjs --check          # compare against the live origin
 *
 * Play App Signing note: if the app is uploaded to Play, Google re-signs it with
 * its own key, and the fingerprint that matters is the one Play shows under
 * "App signing key certificate" — not the upload key. Pass that one instead.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const target = resolve(root, 'public/.well-known/assetlinks.json')
const manifest = JSON.parse(readFileSync(resolve(root, 'android/twa-manifest.json'), 'utf8'))

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

function fail(message) {
  console.error(`assetlinks: ${message}`)
  process.exit(1)
}

/** Pull the SHA-256 line out of `keytool -list`. */
function fingerprintFromKeystore(keystore, alias) {
  const password = process.env.KEYSTORE_PASSWORD
  if (!password) {
    fail('set KEYSTORE_PASSWORD to read the keystore (it is never written to disk by this script)')
  }
  let output
  try {
    output = execFileSync(
      'keytool',
      ['-list', '-v', '-keystore', keystore, '-alias', alias, '-storepass', password],
      { encoding: 'utf8' }
    )
  } catch (error) {
    fail(`keytool failed — is a JDK installed and the alias correct?\n${error.message}`)
  }
  const match = output.match(/SHA256:\s*([0-9A-F:]{95})/i)
  if (!match) fail('no SHA-256 fingerprint in the keytool output')
  return match[1].toUpperCase()
}

function build(fingerprint) {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: manifest.packageId,
        sha256_cert_fingerprints: [fingerprint]
      }
    }
  ]
}

async function check() {
  const url = `https://${manifest.host}/.well-known/assetlinks.json`
  const response = await fetch(url)
  if (!response.ok) fail(`${url} returned ${response.status} — it is not deployed yet`)
  const live = JSON.stringify(await response.json())
  let local
  try {
    local = JSON.stringify(JSON.parse(readFileSync(target, 'utf8')))
  } catch {
    fail('no local public/.well-known/assetlinks.json to compare against')
  }
  if (live !== local) {
    fail(`the live file at ${url} does not match the local one — deploy, then re-check`)
  }
  console.log(`assetlinks: ${url} matches the committed file`)
}

if (process.argv.includes('--check')) {
  await check()
} else {
  const explicit = arg('fingerprint')
  const fingerprint = explicit
    ? explicit.toUpperCase()
    : fingerprintFromKeystore(
        arg('keystore') ?? resolve(root, 'android', manifest.signingKey.path),
        arg('alias') ?? manifest.signingKey.alias
      )

  if (!FINGERPRINT.test(fingerprint)) {
    fail(`"${fingerprint}" is not a SHA-256 fingerprint (32 colon-separated hex bytes)`)
  }

  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(build(fingerprint), null, 2)}\n`)
  console.log(`assetlinks: wrote ${target} for ${manifest.packageId}`)
  console.log('assetlinks: commit it and deploy before installing the APK, or the URL bar will show')
}
