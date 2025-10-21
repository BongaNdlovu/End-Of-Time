# Bug Report — www.endoftime7.com

## Summary
- Menu sign-in fails on www.endoftime7.com; tutorials/videos often absent in Chrome; Edge sign-in fails.
- A syntax error in `menu.html` prevents menu functions from loading, causing undefined handlers on click.

## Environment
- Domain: www.endoftime7.com
- Firebase project: end-of-time-94cd3

## High-impact issues

1) `menu.html` syntax error halts scripts
- Cause: Unescaped apostrophe in a single-quoted string, breaking parsing.
- Effect: `enterGame`, `openAcademy`, `openPrayerNetwork` undefined at runtime.
- Fix: Use double quotes or escape the apostrophe.

2) Menu auth diverges from shared AuthManager
- Cause: Menu used redirect-only flow instead of shared `AuthManager` (redirect→popup fallback).
- Effect: Menu sign-in unreliable across browsers; game screen sign-in works.
- Fix: Load `auth-leaderboard.js`; call `AuthManager.init()`/`subscribe()`; bind buttons to `AuthManager.signIn()`/`signOut()` (now implemented in `menu.html`).

3) Videos/tutorials missing on Chrome
- Cause: LocalStorage gating (`endOfTime_skip*`) and autoplay restrictions.
- Effect: Videos/tutorials may not appear; Reset didn’t help due to autoplay rejection closing the flow.
- Fix: In `showLevelVideo`, keep modal open with controls on autoplay block (`NotAllowedError`); only close on Skip/Ended.

4) Edge sign-in fails (Authorized domains)
- Cause: `www.endoftime7.com` possibly missing in Firebase Auth Authorized domains.
- Fix: Add `www.endoftime7.com` in Firebase Console → Authentication → Settings → Authorized domains.

5) Service worker cache staleness
- Cause: Old HTML cached under `sda-trivia-v8`.
- Fix: Bump `CACHE_NAME` to force clients to fetch fresh HTML.

6) Storage bucket string (future risk)
- Cause: `firebasestorage.app` used instead of `appspot.com`.
- Fix when Storage is used: set `storageBucket: "end-of-time-94cd3.appspot.com"`.

## Minor
- Use `AudioManager.play(...)` in `script.js` transitions for consistency.

## Repro
- Open `www.endoftime7.com/menu.html` → console shows syntax error; clicking tiles logs undefined function errors.
- Chrome game screen: tutorials/videos don’t show if skip flags present; Reset didn’t help due to autoplay fail path.

## Fix Summary
- Escaped offending string in `menu.html` and unified menu auth with `AuthManager`.
- Improved `showLevelVideo` to persist modal with controls on autoplay block.
- Switched transition audio to `AudioManager.play`.
- Bumped service worker cache version.
- Corrected `storageBucket` to `appspot.com`.
