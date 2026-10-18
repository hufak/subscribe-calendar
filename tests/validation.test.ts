import assert from 'node:assert/strict';
import test from 'node:test';
import { retrieveCalendar, validateIcs } from '../src/validate-calendar.ts';

const calendar = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Calendar test//EN\r\nBEGIN:VEVENT\r\nUID:1\r\nDTSTAMP:20261018T120000Z\r\nDTSTART:20261019T120000Z\r\nSUMMARY:A folded\r\n  title\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';

test('accepts ICS with folded lines and a byte order mark', () => {
  assert.doesNotThrow(() => validateIcs('\uFEFF' + calendar));
});

test('rejects HTML, incomplete components, missing metadata and multiple roots', () => {
  for (const content of ['<html>Log in</html>', calendar.replace('END:VEVENT\r\n', ''), calendar.replace('VERSION:2.0\r\n', ''), calendar.replace('PRODID:-//Calendar test//EN\r\n', ''), calendar + calendar]) {
    assert.throws(() => validateIcs(content), /valid ICS/);
  }
});

test('downloads and checks actual content, without sending credentials', async () => {
  await retrieveCalendar(new URL('https://example.org/feed?token=a%2Bb'), async (url, options) => {
    assert.equal(url, 'https://example.org/feed?token=a%2Bb');
    assert.equal(options?.credentials, 'omit');
    assert.equal(options?.referrerPolicy, 'no-referrer');
    return new Response(calendar, { headers: { 'Content-Type': 'text/plain' } });
  });
});

test('reports HTTP and CORS/network failures and rejects disguised HTML', async () => {
  const url = new URL('https://example.org/feed');
  await assert.rejects(retrieveCalendar(url, async () => new Response('', { status: 403 })), /HTTP 403/);
  await assert.rejects(retrieveCalendar(url, async () => { throw new TypeError('Failed to fetch'); }), /CORS/);
  await assert.rejects(retrieveCalendar(url, async () => new Response('<html>Login</html>', { headers: { 'Content-Type': 'text/calendar' } })), /valid ICS/);
});
