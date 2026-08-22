#!/usr/bin/env bash
#
# Builds the signed APK from android/twa-manifest.json.
#
# Run this where an Android toolchain lives — a laptop, or a CI runner. The
# production VPS has neither a JDK nor the Android SDK, and installing ~2GB of
# build tooling onto a machine whose job is serving other people's sites is not
# a trade worth making for an artefact that is rebuilt a few times a year.
#
# Everything the build needs is in this repo except the keystore, which is
# deliberately not in git.
set -euo pipefail

# Bubblewrap generates its Gradle project into the working directory, so the
# whole build happens inside android/ and nothing lands in the repo root.
cd "$(dirname "$0")/.."
keystore="birth-calendar.keystore"
alias_name="birth-calendar"
out="dist"

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
die() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }

step "Checking the toolchain"
command -v java >/dev/null || die "no JDK on PATH. Install a JDK 17 (e.g. 'apt install openjdk-17-jdk' or Temurin)."
command -v keytool >/dev/null || die "keytool missing — the JDK install is incomplete."
command -v bubblewrap >/dev/null || die "bubblewrap missing. Install it with: npm i -g @bubblewrap/cli
       On first run it offers to download the Android SDK and a JDK for you; accept."
echo "java:       $(java -version 2>&1 | head -1)"
echo "bubblewrap: $(bubblewrap --version 2>/dev/null | head -1)"

step "Signing key"
if [ ! -f "$keystore" ]; then
  cat <<EOF
No keystore at android/$keystore.

This key IS the app's identity. Android refuses an update signed with a
different one, and there is no recovery path — losing it means shipping a new
package name, and every existing install is orphaned. Generate it once, then
back it up somewhere that is not this machine.

  keytool -genkeypair -v \\
    -keystore android/$keystore \\
    -alias $alias_name \\
    -keyalg RSA -keysize 4096 -validity 10000

Then re-run this script.
EOF
  exit 1
fi

step "Generating the Android project"
# twa-manifest.json is the checked-in source of truth; the Gradle project is a
# build artefact regenerated from it, which is why none of it is in git.
if [ ! -f gradlew ]; then
  bubblewrap init --manifest="$(node -p "require('./twa-manifest.json').webManifestUrl")" --directory=.
else
  bubblewrap update
fi

step "Building"
bubblewrap build --skipPwaValidation

mkdir -p "$out"
version=$(node -p "require('./twa-manifest.json').appVersionName")
found=0
for artefact in app-release-signed.apk app-release-bundle.aab; do
  [ -f "$artefact" ] || continue
  cp "$artefact" "$out/birth-calendar-${version}.${artefact##*.}"
  echo "  android/$out/birth-calendar-${version}.${artefact##*.}"
  found=1
done
[ "$found" = 1 ] || die "the build produced no APK — read the Gradle output above"

step "Next: make the site vouch for this key"
cat <<'EOF'
The APK is only half of a TWA. Until the site serves a matching fingerprint,
the installed app opens with a browser URL bar across the top.

  KEYSTORE_PASSWORD=... node android/bin/assetlinks.mjs
  git add public/.well-known/assetlinks.json && git commit && git push

Vercel deploys on push. Confirm it landed:

  node android/bin/assetlinks.mjs --check
EOF
