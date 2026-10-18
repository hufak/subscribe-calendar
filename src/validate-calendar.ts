import ICAL from 'ical.js';

export function validateIcs(text: string): void {
  try {
    const source = text.replace(/^\uFEFF/, '').trim();
    // Check balanced components as the parser tolerates some incomplete input.
    const stack: string[] = [];
    for (const line of source.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)) {
      if (/^BEGIN:/i.test(line)) stack.push(line.slice(6).toUpperCase());
      if (/^END:/i.test(line) && stack.pop() !== line.slice(4).toUpperCase()) throw new Error();
    }
    if (stack.length || !/^BEGIN:VCALENDAR\r?\n/i.test(source) || !/\r?\nEND:VCALENDAR$/i.test(source)) throw new Error();
    const component = new ICAL.Component(ICAL.parse(source));
    if (component.name !== 'vcalendar' || component.getFirstPropertyValue('version') !== '2.0' || !component.getFirstPropertyValue('prodid')) throw new Error();
    // Force parsing of typed values, including nested event and timezone properties.
    function checkValues(part: ICAL.Component) {
      for (const property of part.getAllProperties()) property.getValues();
      for (const child of part.getAllSubcomponents()) checkValues(child);
    }
    checkValues(component);
  } catch {
    throw new Error('This address did not return a valid ICS calendar. Enter an iCalendar feed URL, rather than a calendar web page or CalDAV account URL.');
  }
}

export async function retrieveCalendar(url: URL, fetcher: typeof fetch = fetch): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    let response: Response;
    try {
      response = await fetcher(url.href, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    } catch {
      if (controller.signal.aborted) throw new Error('The calendar server took too long to respond. Please try again.');
      throw new Error('The calendar could not be downloaded. Check the URL and your connection. The server must allow cross-origin requests (CORS); HTTP links may also be blocked on this HTTPS page.');
    }
    if (!response.ok) throw new Error(`The calendar server returned HTTP ${response.status}. Check that the feed is publicly accessible.`);
    let text: string;
    try { text = await response.text(); }
    catch { throw new Error('The calendar download was interrupted or timed out. Please try again.'); }
    validateIcs(text);
  } finally {
    clearTimeout(timeout);
  }
}
