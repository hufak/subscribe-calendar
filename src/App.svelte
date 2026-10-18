<script lang="ts">
  import { tick } from 'svelte';
  import { Accordion, Dialog } from 'bits-ui';
  import { calendarLinks, caldavAccount, detectPlatform, parseCalendar } from './calendar';

  const query = new URLSearchParams(window.location.search);
  const davOnly = query.has('dav');
  const parameter = davOnly ? 'dav' : 'url';
  const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
  const accountOptions = platform === 'android' ? ['android', 'apple'] : ['apple', 'android'];
  let calendar = $state<URL | undefined>();
  let error = $state('');
  let errorOpen = $state(false);
  try {
    if (query.has(parameter)) calendar = parseCalendar(window.location.search, parameter);
  }
  catch (cause) {
    error = cause instanceof Error ? cause.message : 'Unable to read this calendar link.';
    errorOpen = true;
  }
  let feedInput = $state<HTMLInputElement>();
  const links = $derived(calendar ? calendarLinks(calendar) : undefined);
  const account = $derived(calendar ? (davOnly ? { url: calendar, trimmed: false } : caldavAccount(calendar)) : undefined);
  const accountLinks = $derived(account ? calendarLinks(account.url) : undefined);
  let status = $state('');
  let enteredUrl = $state(query.get(parameter) ?? '');
  let checking = $state(false);
  let heading = $state<HTMLHeadingElement>();

  async function submitCalendar(event: SubmitEvent) {
    event.preventDefault();
    if (checking) return;
    checking = true;
    error = '';
    try {
      const candidate = parseCalendar(`?${new URLSearchParams({ url: enteredUrl.trim() })}`);
      if (!davOnly) {
        const { retrieveCalendar } = await import('./validate-calendar');
        await retrieveCalendar(candidate);
      }
      const pageUrl = new URL(window.location.href);
      pageUrl.searchParams.set(parameter, candidate.href);
      window.history.replaceState(null, '', pageUrl);
      calendar = candidate;
      status = davOnly ? '' : 'Calendar validated.';
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
  let caldavInput = $state<HTMLInputElement>();
  const davxDownloads = 'https://www.davx5.com/download';
  const playStore = 'https://play.google.com/store/apps/details?id=at.bitfire.davdroid';

  async function copyUrl(input: HTMLInputElement | undefined) {
    try {
      await navigator.clipboard.writeText(input?.value ?? calendar!.href);
      status = 'Calendar URL copied.';
    } catch {
      input?.focus();
      input?.select();
      status = 'Select and copy the calendar URL from the field above.';
    }
  }
</script>

<svelte:head><title>{davOnly ? 'Read/Write calendar access' : 'Subscribe to a calendar'}</title></svelte:head>

<main>
  <section class:card={!calendar} aria-labelledby="page-title">
    <h1 id="page-title" class:visually-hidden={!!calendar} bind:this={heading} tabindex="-1">{davOnly ? 'Read/Write calendar access' : 'Subscribe to a calendar'}</h1>

    {#if !calendar}
      <form onsubmit={submitCalendar} aria-busy={checking}>
        <label class="label" for="feed-url">Calendar URL</label>
        <input id="feed-url" bind:this={feedInput} type="url" bind:value={enteredUrl} required placeholder="https://example.org/calendar.ics" readonly={checking} />
        <button class="primary" type="submit" disabled={checking}>{checking ? 'Checking calendar…' : 'Continue'}</button>
        <p class="status" role="status">{checking ? 'Downloading and checking the calendar…' : ''}</p>
      </form>
    {:else if links}
      <div class="source"><span class="source-icon" aria-hidden="true">↗</span><div><span class="label">Calendar source</span><strong>{calendar.host}</strong></div></div>
      <Accordion.Root type="single" value={davOnly ? 'read-write' : 'subscribe'} class="access-sections">
        {#if !davOnly}
        <Accordion.Item value="subscribe" class="access-section">
          <Accordion.Header level={2}>
            <Accordion.Trigger class="help-trigger access-trigger">Subscribe (read-only) <span aria-hidden="true">+</span></Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content class="access-content">

      {#if platform === 'android'}
        {@render androidButton(true)}
      {:else}
        {@render calendarAppButton(true)}
      {/if}
      {#if platform === 'android'}
        {@render androidHelp()}
      {:else}
        <p class="hint">Requires an iCalendar feed and a compatible calendar app.</p>
      {/if}

      <Accordion.Root type="single" class="help">
        <Accordion.Item value="options">
          <Accordion.Header>
            <Accordion.Trigger class="help-trigger options-trigger">Using {platform === 'android' ? 'Apple / Windows / another calendar app' : 'Android / Google Calendar / Outlook'}? <span aria-hidden="true">+</span></Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content class="help-content">
            {#if platform === 'android'}
              {@render calendarAppButton(false)}
            {:else}
              {@render androidButton(false)}
              {@render androidHelp()}
            {/if}
            <a target="_blank" rel="noopener noreferrer" class="secondary subscription-button" href={links.google}>
              <img class="platform-icon" src="./favicon.svg" alt="" width="32" height="32" />
              <span>Subscribe with Google Calendar</span>
            </a>
            <p class="hint">Open Google Calendar on a computer and confirm the subscription. Google needs a publicly accessible iCalendar feed.</p>
            <a target="_blank" rel="noopener noreferrer" class="secondary subscription-button" href="https://outlook.live.com/calendar/">
              <img class="platform-icon" src="./favicon.svg" alt="" width="32" height="32" />
              <span>Subscribe with Outlook</span>
            </a>
            <p class="hint">Choose “Add calendar” → “Subscribe from web” and paste the calendar URL.</p>
            <p class="hint">Apple, Windows and web calendar subscriptions require an iCalendar feed. For a CalDAV account, use DAVx⁵ on Android or your calendar app’s account settings.</p>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
      <div class="copy-area">
        <label class="label" for="calendar-url">Calendar URL</label>
        <div class="copy-row"><input id="calendar-url" bind:this={urlInput} value={calendar.href} readonly /><button onclick={() => copyUrl(urlInput)}>Copy URL</button></div>
        <p class="status" role="status">{status}</p>
      </div>
          </Accordion.Content>
        </Accordion.Item>
        {/if}
        <Accordion.Item value="read-write" class="access-section">
          <Accordion.Header level={2}>
            <Accordion.Trigger class="help-trigger access-trigger">Read/Write calendar access <span aria-hidden="true">+</span></Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content class="access-content account-instructions">
            <p>Using your cloud username and password you can set up read/write access to the calendar(s).</p>
            <label class="label" for="caldav-url">CalDAV account URL</label>
            <div class="copy-row">
              <input id="caldav-url" bind:this={caldavInput} value={account?.url.href} readonly aria-describedby="caldav-note" />
              <button onclick={() => copyUrl(caldavInput)}>Copy URL</button>
            </div>
            <p class="status" role="status">{status}</p>
            <Accordion.Root type="single" value={accountOptions[0]} class="account-options">
              {#each accountOptions as option (option)}
                <Accordion.Item value={option} class="account-option">
                  <Accordion.Header level={3}>
                    <Accordion.Trigger class="help-trigger options-trigger">
                      {option === 'android' ? 'DAVx⁵ on Android' : 'Apple Calendar (iCal)'}
                      <span aria-hidden="true">+</span>
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content class="help-content">
                    {#if option === 'apple'}
            <p><strong>Mac:</strong> In Calendar, choose “Add Account” → “Other CalDAV Account”. Choose manual setup if needed, then enter the server address and your username and password.</p>
            <p><strong>iPhone or iPad:</strong> In Settings, open Apps → Calendar → Calendar Accounts → Add Account. Choose the option to add a CalDAV account (under “Other” on some versions), then enter the server address and your credentials. Enable Calendars and save.</p>
            <p class="hint">Use the server address and any advanced path settings supplied by your calendar provider.</p>

                    {:else}
            <a target="_blank" rel="noopener noreferrer" class="primary subscription-button" href={accountLinks?.davx5}>
              <img class="platform-icon" src="./icons/android.svg" alt="" width="32" height="32" />
              <span>Set up CalDAV in DAVx⁵</span>
            </a>
            <ol>
              <li>{@render davxDownloadLinks()}</li>
              <li>Open setup using the button above, or add an account in DAVx⁵ using “Login with URL and user name”.</li>
              <li>Confirm the CalDAV URL and enter your username and password in DAVx⁵.</li>
              <li>Finish account setup, select the calendar to synchronize, and use it in your calendar app.</li>
            </ol>
            {#if calendar.protocol === 'http:'}<p class="hint">This setup link opens the server over HTTPS. For an HTTP-only server, enter the address manually in DAVx⁵.</p>{/if}
                    {/if}
                  </Accordion.Content>
                </Accordion.Item>
              {/each}
            </Accordion.Root>

          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
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

{#snippet androidHelp()}
  <p class="hint">{@render davxDownloadLinks()} Then subscribe to set up synchronization.</p>
  {#if calendar?.protocol === 'http:'}<p class="hint">DAVx⁵ opens this address over HTTPS. Your calendar server must support HTTPS.</p>{/if}
{/snippet}

{#snippet calendarAppButton(primary: boolean)}
  <a target="_blank" rel="noopener noreferrer" class={`${primary ? 'primary' : 'secondary'} subscription-button`} href={links?.webcal}>
    <span class="platform-icons" aria-hidden="true">
      <img class="platform-icon" src="./icons/apple.svg" alt="" width="28" height="28" />
      <img class="platform-icon" src="./icons/windows.svg" alt="" width="28" height="28" />
      <img class="platform-icon" src="./icons/other.svg" alt="" width="28" height="28" />
    </span>
    <span>Subscribe to calendar<span class="button-platforms">Apple / Windows / other calendar apps</span></span>
  </a>
{/snippet}

{#snippet androidButton(primary: boolean)}
  <a target="_blank" rel="noopener noreferrer" class={`${primary ? 'primary' : 'secondary'} subscription-button`} href={links?.davx5}>
    <img class="platform-icon" src="./icons/android.svg" alt="" width="32" height="32" />
    <span>Subscribe to calendar<span class="button-platforms">Android with DAVx⁵</span></span>
  </a>
{/snippet}

{#snippet davxDownloadLinks()}
  Install DAVx⁵ using the <a target="_blank" rel="noopener noreferrer" class="text-link" href={davxDownloads}>free download option (F-Droid) on the DAVx⁵ website</a>, or get it on <a target="_blank" rel="noopener noreferrer" class="text-link" href={playStore}>Google Play (paid)</a>.
{/snippet}
