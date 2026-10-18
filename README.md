# Calendar subscription page

A small static Svelte + TypeScript app with Bits UI's accessible accordion, built with Vite. Native links, buttons, a device selector, visible keyboard focus and live clipboard feedback keep the main flow simple. No backend, analytics or external fonts.

## Develop

Use Node.js 22.18+ and npm.

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
```

Open `http://localhost:5173/?url=https%3A%2F%2Fexample.org%2Fcalendar.ics`.
Generate links with `new URLSearchParams({ url: calendarUrl })` so nested query parameters are encoded correctly.

## Behavior

- Android: recommends DAVx⁵ on Google Play and opens `davx5://host/path?query` on click. DAVx⁵ treats this as HTTPS and opens account setup; it may require authentication and calendar selection. It does not automatically finish a subscription.
- Apple devices: opens `webcal://host/path?query` on click.
- Windows/other: offers the registered webcal handler, web calendar alternatives and URL copying.
- Users can override device detection. App launches require an explicit click.
- Only HTTP(S) and webcal(s) input URLs are accepted. Embedded credentials and duplicate `url` parameters are rejected. Query tokens are preserved. External links do not send a referrer.
- CalDAV account URLs and iCalendar feeds are different. DAVx⁵ supports CalDAV account setup; Apple/web calendar subscriptions need a feed URL. The app cannot determine which type an arbitrary URL serves without contacting its server. Google needs a feed accessible to its servers and a desktop browser for adding subscriptions.

DAVx⁵ integration: https://manual.davx5.com/integration.html

## GitHub Pages

In the repository's **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**. Push to `main` (or run the workflow manually). The workflow checks Svelte compiler/accessibility diagnostics, runs tests, builds, and deploys `dist` to Pages.

Expected URL for this repository:
`https://hufak.github.io/subscribe-calendar/?url=ENCODED_CALENDAR_URL`

Vite uses relative asset paths, so the build also works at a domain root or another repository path. If your default branch differs, update `.github/workflows/deploy.yml`.

## Verification

`npm test` covers platform detection, validation and scheme conversion, including encoded tokens. Test actual handoff on devices with the relevant calendar app installed: a desktop browser cannot verify OS app registration or completion of account setup. Check keyboard navigation, accordion operation, clipboard feedback and screen reader announcements before publishing changes.

`npm run check` checks Svelte compiler warnings, including accessibility diagnostics; it is not a full TypeScript check. Full Svelte type checking is not configured because svelte-check requires an additional TypeScript version with the currently installed TypeScript 7. No additional TypeScript version was installed.

The favicon is Google’s Material Design `calendar_today` icon, licensed under Apache 2.0. See `public/material-icons-LICENSE.txt` and https://github.com/google/material-design-icons.

## Entering a calendar URL

With no `url` parameter, the page shows a URL form. Submission downloads the feed without credentials, parses it with lazily loaded ical.js, checks the VCALENDAR structure and required VERSION/PRODID fields, and parses property values. After validation it updates the `url` query parameter and shows subscription options. This is a feed parsing check, not exhaustive RFC 5545 semantic conformance testing. Existing query links continue to open directly, including CalDAV URLs for DAVx⁵.

Calendar servers must allow cross-origin requests (CORS) for the entry form to validate their feeds. A static GitHub Pages app cannot bypass that restriction. Network errors, HTTP failures, invalid content and timeouts leave the URL editable and do not update the query string.
