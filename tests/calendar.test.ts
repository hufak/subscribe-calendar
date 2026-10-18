import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarLinks, caldavAccount, detectPlatform, parseCalendar } from '../src/calendar.ts';

test('detects supported platforms including desktop-mode iPad', () => {
  assert.equal(detectPlatform('Mozilla Android Linux'), 'android');
  assert.equal(detectPlatform('Mozilla Macintosh', 5), 'apple');
  assert.equal(detectPlatform('iPhone'), 'apple');
  assert.equal(detectPlatform('Windows NT 10.0'), 'windows');
  assert.equal(detectPlatform('X11 Linux x86_64'), 'other');
});

test('preserves path, encoded characters and nested query parameters', () => {
  const original = 'https://example.org/dav/a%20b/?token=a%2Bb&other=1';
  const url = parseCalendar(`?${new URLSearchParams({ url: original })}`);
  const links = calendarLinks(url);
  assert.equal(url.href, original);
  assert.equal(links.davx5, 'davx5://example.org/dav/a%20b/?token=a%2Bb&other=1');
  assert.equal(links.webcal, 'webcal://example.org/dav/a%20b/?token=a%2Bb&other=1');
  assert.equal(new URL(links.google).pathname, '/calendar/r');
  assert.equal(new URL(links.google).searchParams.get('cid'), links.webcal);
});

test('normalizes webcal input', () => {
  assert.equal(parseCalendar('?url=webcal://example.org/test.ics').href, 'https://example.org/test.ics');
});

test('rejects missing, ambiguous, unsafe and credential-containing URLs', () => {
  for (const search of ['', '?url=', '?url=/relative', '?url=javascript:alert(1)', '?url=data:text/html,hi', '?url=https://user:pass@example.org/', '?url=https://a.org&url=https://b.org']) {
    assert.throws(() => parseCalendar(search));
  }
});

test('derives a CalDAV account URL from the first /dav/ path segment', () => {
  const result = caldavAccount(new URL('https://example.org/remote.php/dav/calendars/user/feed?token=secret#part'));
  assert.equal(result.url.href, 'https://example.org/remote.php/dav/');
  assert.equal(result.trimmed, true);
  assert.equal(calendarLinks(result.url).davx5, 'davx5://example.org/remote.php/dav/');
});

test('keeps URLs without /dav/ in their path unchanged', () => {
  for (const value of ['https://example.org/feed.ics?next=/dav/user', 'https://example.org/dav/']) {
    const result = caldavAccount(new URL(value));
    assert.equal(result.url.href, value);
    assert.equal(result.trimmed, false);
  }
});

test('parses an explicit DAV URL without cropping its path or query', () => {
  const original = 'https://example.org/dav/calendars/alice/work/?token=a%2Bb#part';
  const query = `?${new URLSearchParams({ dav: original, url: 'https://example.org/feed.ics' })}`;
  const account = parseCalendar(query, 'dav');
  assert.equal(account.href, original);
  assert.equal(calendarLinks(account).davx5, original.replace('https:', 'davx5:'));
  assert.throws(() => parseCalendar('?dav=javascript:alert(1)', 'dav'));
  assert.throws(() => parseCalendar('?dav=', 'dav'));
  assert.throws(() => parseCalendar('?dav=https://a.org&dav=https://b.org', 'dav'));
});
