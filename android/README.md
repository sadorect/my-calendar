# Android packaging

The Android app is a **Trusted Web Activity** — a thin native shell that opens
`https://my-birthcalendar.vercel.app` full-screen in Chrome's engine, with no
browser UI. There is no second copy of the app: what ships on Android is the
same PWA the browser gets, so a Vercel deploy updates the installed app with no
release, no review, and no store round trip.

That is the whole reason for choosing a TWA over a Capacitor shell. The one
thing it costs is a hard dependency on the site being reachable on first launch;
after that the service worker has cached it and it opens offline like the PWA
does.

## What is in here

| File                      | What it is                                                           |
| ------------------------- | -------------------------------------------------------------------- |
| `twa-manifest.json`       | The source of truth. Package id, colours, icons, shortcuts, version. |
| `bin/build.sh`            | Toolchain check → project generation → signed build.                 |
| `bin/assetlinks.mjs`      | Writes `public/.well-known/assetlinks.json` from the signing key.    |
| `birth-calendar.keystore` | **Not in git.** The signing key. See below.                          |
| `dist/`                   | **Not in git.** Build output.                                        |

The Gradle project (`app/`, `gradlew`, `build.gradle`…) is generated into this
directory by Bubblewrap and is also not in git — it is a build artefact
regenerated from `twa-manifest.json`, and checking it in would mean maintaining
a second, quietly diverging copy of every value in that file.

## Prerequisites

On a laptop or CI runner:

```bash
npm i -g @bubblewrap/cli   # offers to fetch the Android SDK and a JDK on first run
```

On the VPS the toolchain is not installed on the host — it is the
`grinmuzik/bubblewrap` Docker image (Bubblewrap, JDK 17, Android SDK), and the
build runs inside it with the repo mounted. Bubblewrap needs a config that
names the JDK and SDK, and the passwords come in as environment variables:

```bash
mkdir -p bwhome/.bubblewrap
echo '{"jdkPath":"/opt/java/openjdk","androidSdkPath":"/opt/android-sdk"}' > bwhome/.bubblewrap/config.json
. /home/deploy/.birth-calendar-android/keystore.env
cp /home/deploy/.birth-calendar-android/birth-calendar.keystore android/
sudo docker run --rm -u "$(id -u):$(id -g)" -e HOME=/home/bw \
  -v "$PWD/bwhome:/home/bw" -v "$PWD:/work" -w /work/android \
  -e BUBBLEWRAP_KEYSTORE_PASSWORD="$KEYSTORE_PASSWORD" -e BUBBLEWRAP_KEY_PASSWORD="$KEYSTORE_PASSWORD" \
  grinmuzik/bubblewrap:latest sh -c 'bubblewrap update --skipVersionUpgrade && bubblewrap build --skipPwaValidation' < /dev/null
cp android/app-release-signed.apk public/downloads/birth-calendar.apk
```

Bump `appVersionCode` (and `appVersionName`) in `twa-manifest.json` before a
rebuild, or Android will refuse the update over the installed copy.

## Building

```bash
./android/bin/build.sh
```

It refuses to guess: no JDK, no Bubblewrap, or no keystore each stop the build
with the exact command that fixes it. Output lands in `android/dist/` as
`birth-calendar-<version>.apk`.

## Where the APK is served from

`public/downloads/birth-calendar.apk` — committed, so Vercel serves it from the
same origin the app wraps. The in-app Share panel offers it on Android in place
of the browser install prompt, and links to it everywhere else. The path is
stable on purpose; the service worker is told to neither precache it nor answer
its navigation with `index.html` (`globIgnores` / `navigateFallbackDenylist` in
`vite.config.js`).

## The signing key

Generated once, and it is the app's identity forever:

```bash
keytool -genkeypair -v \
  -keystore android/birth-calendar.keystore \
  -alias birth-calendar \
  -keyalg RSA -keysize 4096 -validity 10000
```

Android refuses an update signed with a different key. There is no recovery
path — a lost keystore means a new package id and every existing install is
stranded on the version it has. **Back it up somewhere that is not the machine
that builds.**

## Digital Asset Links — the half that is easy to forget

An APK claiming a domain proves nothing on its own. Android fetches
`https://my-birthcalendar.vercel.app/.well-known/assetlinks.json` and checks
that it names this package and this signing key. If it does not match, the app
still runs — but with a browser URL bar across the top, which reads as a bug in
the app rather than a certificate mismatch. This is the single most common way a
TWA ships broken.

So, after the first build:

```bash
KEYSTORE_PASSWORD=... node android/bin/assetlinks.mjs
git add public/.well-known/assetlinks.json && git commit && git push
node android/bin/assetlinks.mjs --check     # after Vercel finishes deploying
```

The generated file is committed on purpose: Vercel deploys from git, and the
fingerprint has to be live on the origin before an install will verify. A
placeholder is _not_ committed on purpose, for the reason above.

If the app ever goes to Google Play, Play re-signs it with its own key. The
fingerprint that matters then is the one under **App signing key certificate**
in the Play console, not the upload key — pass it with `--fingerprint`.

## Releasing a new version

The web app updates itself on every Vercel deploy; a new APK is only needed when
something in `twa-manifest.json` changes — the name, icons, colours, shortcuts,
or the origin. When that happens, bump **both** `appVersionName` and
`appVersionCode` (Android orders updates by the integer, and it must strictly
increase), rebuild, and replace the hosted download.

## Hosting the download

The signed APK is served from the VPS and linked from the Birth Calendar card on
`dashboard.sadorect.com`. Publishing a build is a copy:

```bash
scp android/dist/birth-calendar-1.0.0.apk \
    dashboard.sadorect.com:/home/dashboard/appdash/public/downloads/
```

The dashboard globs that directory, reads the version out of the filename and
shows the newest build — so the link appears when the file does and disappears
when it does not, and can never 404. Delete the previous APK when you copy a new
one; nothing prunes them.

Two things to know about that directory: the file is served by Apache before
Laravel sees the request, so **the download URL is public** even though the
dashboard itself needs a login — which is what you want for an app people
install, but worth knowing. And the version must be in the filename, in the
`birth-calendar-<version>.apk` shape `bin/build.sh` already produces.
