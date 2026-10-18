export type Platform = 'android' | 'apple' | 'windows' | 'other';

export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/Android/i.test(userAgent)) return 'android';
  if (/iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(userAgent)) return 'apple';
  // iPadOS can use a desktop-style user agent.
  if (/Mac/i.test(userAgent) && maxTouchPoints > 1) return 'apple';
  if (/Windows/i.test(userAgent)) return 'windows';
  return 'other';
}

export function parseCalendar(search: string, parameter: 'url' | 'dav' = 'url'): URL {
  const values = new URLSearchParams(search).getAll(parameter);
  if (values.length === 0 || !values[0]?.trim()) {
    throw new Error('This link is missing a calendar URL. Ask the calendar owner for a complete subscription link.');
  }
  if (values.length !== 1) throw new Error(`This link contains more than one calendar URL. Please use a link with a single ${parameter} parameter.`);
  let url: URL;
  try { url = new URL(values[0]); }
  catch { throw new Error('The calendar URL is not valid. Please ask the calendar owner for a new link.'); }
  if (!['https:', 'http:', 'webcal:', 'webcals:'].includes(url.protocol) || !url.hostname) {
    throw new Error('The calendar URL must start with https://, http://, webcal:// or webcals://.');
  }
  if (url.username || url.password) throw new Error('Please use a calendar URL without a username or password. Sign in inside your calendar app instead.');
  // Reparse after replacing a custom scheme so URL applies HTTP URL rules.
  return new URL(url.href.replace(/^webcals?:/i, 'https:'));
}

export function calendarLinks(url: URL) {
  const webcal = url.href.replace(/^https?:/i, 'webcal:');
  return {
    webcal,
    davx5: url.href.replace(/^https?:/i, 'davx5:'),
    google: `https://calendar.google.com/calendar/r?${new URLSearchParams({ cid: webcal })}`,
  };
}

export function caldavAccount(url: URL): { url: URL; trimmed: boolean } {
  const index = url.pathname.indexOf('/dav/');
  const account = new URL(url.href);
  if (index >= 0) {
    account.pathname = account.pathname.slice(0, index + '/dav/'.length);
    account.search = '';
    account.hash = '';
  }
  return { url: account, trimmed: account.href !== url.href };
}
