<script lang="ts">
  import { tick } from 'svelte';
  import { Accordion, Dialog } from 'bits-ui';
  import { calendarLinks, detectPlatform, parseCalendar, type Platform } from './calendar';

  let platform = $state<Platform>(detectPlatform(navigator.userAgent, navigator.maxTouchPoints));
  let calendar = $state<URL | undefined>();
  let error = $state('');
  let errorOpen = $state(false);
  try {
    if (new URLSearchParams(window.location.search).has('url')) calendar = parseCalendar(window.location.search);
  }
  catch (cause) {
    error = cause instanceof Error ? cause.message : 'Unable to read this calendar link.';
    errorOpen = true;
  }
  let feedInput = $state<HTMLInputElement>();
  const links = $derived(calendar ? calendarLinks(calendar) : undefined);
  let status = $state('');
  let enteredUrl = $state(new URLSearchParams(window.location.search).get('url') ?? '');
  let checking = $state(false);
  let heading = $state<HTMLHeadingElement>();

  async function submitCalendar(event: SubmitEvent) {
    event.preventDefault();
    if (checking) return;
    checking = true;
    error = '';
    try {
      const candidate = parseCalendar(`?${new URLSearchParams({ url: enteredUrl.trim() })}`);
      const { retrieveCalendar } = await import('./validate-calendar');
      await retrieveCalendar(candidate);
      const pageUrl = new URL(window.location.href);
      pageUrl.searchParams.set('url', candidate.href);
      window.history.replaceState(null, '', pageUrl);
      calendar = candidate;
      status = 'Calendar validated.';
      await tick();
      heading?.focus();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Unable to validate this calendar.';
      errorOpen = true;
    } finally {
      checking = false;
    }
  }

  let urlInput = $state<HTMLInputElement>();
  const playStore = 'https://play.google.com/store/apps/details?id=at.bitfire.davdroid';

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(calendar!.href);
      status = 'Calendar URL copied.';
    } catch {
      urlInput?.focus();
      urlInput?.select();
      status = 'Select and copy the calendar URL from the field above.';
    }
  }
</script>

<svelte:head><title>Subscribe to a calendar</title></svelte:head>

<main>
  <section class="card" aria-labelledby="page-title">
    <h1 id="page-title" bind:this={heading} tabindex="-1">Subscribe to a calendar</h1>

    {#if !calendar}
      <form onsubmit={submitCalendar} aria-busy={checking}>
        <label class="label" for="feed-url">Calendar URL</label>
        <input id="feed-url" bind:this={feedInput} type="url" bind:value={enteredUrl} required placeholder="https://example.org/calendar.ics" readonly={checking} />
        <button class="primary" type="submit" disabled={checking}>{checking ? 'Checking calendar…' : 'Continue'}</button>
        <p class="status" role="status">{checking ? 'Downloading and checking the calendar…' : ''}</p>
      </form>
    {:else if links}
      <div class="source"><span class="source-icon" aria-hidden="true">↗</span><div><span class="label">Calendar source</span><strong>{calendar.host}</strong></div></div>
      <label class="label" for="device">Your device</label>
      <select id="device" bind:value={platform}>
        <option value="android">Android</option>
        <option value="apple">iPhone, iPad or Mac</option>
        <option value="windows">Windows</option>
        <option value="other">Another device</option>
      </select>

      {#if platform === 'android'}
        <div class="setup">
          <h2>Connect with DAVx⁵</h2>
          <p>Install DAVx⁵ from the Play Store, then open your calendar link to set up synchronization. You may need to sign in and choose a calendar in DAVx⁵.</p>
          <a class="secondary" href={playStore}>Get DAVx⁵ on Google Play <span aria-hidden="true">↗</span></a>
          <a class="primary" href={links.davx5}>Subscribe with DAVx⁵ <span aria-hidden="true">→</span></a>
          {#if calendar.protocol === 'http:'}<p class="hint">DAVx⁵ opens this address over HTTPS. Your calendar server must support HTTPS.</p>{/if}
        </div>
      {:else}
        <div class="setup">
          <h2>{platform === 'apple' ? 'Open in Apple Calendar' : 'Open in your calendar app'}</h2>
          <p>Your device will ask you to open a calendar app. Review the calendar there to confirm your subscription.</p>
          <a class="primary" href={links.webcal}>Subscribe to calendar <span aria-hidden="true">→</span></a>
          <p class="hint">Requires an iCalendar subscription feed. A CalDAV account URL must be added in your app’s account settings.</p>
        </div>
      {/if}

      <Accordion.Root type="single" class="help">
        <Accordion.Item value="options">
          <Accordion.Header>
            <Accordion.Trigger class="help-trigger">Other ways to connect <span aria-hidden="true">+</span></Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content class="help-content">
            <p>For a publicly accessible iCalendar feed, you can also subscribe through a web calendar:</p>
            <a class="text-link" href={links.google}>Open Google Calendar ↗</a>
            <p class="hint">Google requires a computer browser to add subscriptions. The mobile app cannot add a new feed.</p>
            <a class="text-link" href="https://outlook.live.com/calendar/">Open Outlook Calendar ↗</a>
            <p class="hint">Choose “Add calendar” → “Subscribe from web” and paste the calendar URL.</p>
            <p>For a CalDAV account, use DAVx⁵ on Android or add the account in your calendar app’s settings. These web subscription options do not configure CalDAV accounts.</p>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
      <div class="copy-area">
        <label class="label" for="calendar-url">Calendar URL</label>
        <div class="copy-row"><input id="calendar-url" bind:this={urlInput} value={calendar.href} readonly /><button onclick={copyUrl}>Copy URL</button></div>
        <p class="status" role="status">{status}</p>
      </div>
    {/if}
  </section>
</main>

<Dialog.Root bind:open={errorOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content
      class="dialog-content"
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        feedInput?.focus();
      }}
    >
      <Dialog.Title class="dialog-title">Unable to open calendar</Dialog.Title>
      <Dialog.Description class="dialog-description">{error}</Dialog.Description>
      <Dialog.Close class="primary dialog-close">Close</Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
