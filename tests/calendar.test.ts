import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarLinks, detectPlatform, parseCalendar } from '../src/calendar.ts';

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
  assert.equal(new URL(links.google).searchParams.get('cid'), original);
});

test('normalizes webcal input', () => {
  assert.equal(parseCalendar('?url=webcal://example.org/test.ics').href, 'https://example.org/test.ics');
});

test('rejects missing, ambiguous, unsafe and credential-containing URLs', () => {
  for (const search of ['', '?url=', '?url=/relative', '?url=javascript:alert(1)', '?url=data:text/html,hi', '?url=https://user:pass@example.org/', '?url=https://a.org&url=https://b.org']) {
    assert.throws(() => parseCalendar(search));
  }
});
