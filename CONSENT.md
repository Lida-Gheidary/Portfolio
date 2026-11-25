# Portfolio consent controls

Each portfolio page embeds the cookieless Simple Analytics pageview script directly. The Google Tag Manager container, `GTM-NGJ5Q7GR`, loads once during page initialization. The homepage scroll condition controls the banner display. Cookie settings are available in each page footer.

## Google Consent Mode v2

The page queues denied defaults for `analytics_storage`, `ad_storage`, `ad_user_data`, and `ad_personalization` before loading GTM. When a valid preference exists, the page applies it before the container starts. The Analytics choice controls analytics storage, and Marketing controls the three advertising signals. With Advanced Consent Mode, GA4 can send cookieless requests while analytics storage is denied. The local preference expires after 180 days. Unavailable or invalid storage produces denied defaults.

Banner actions and changes from other tabs queue the Google consent update before emitting `portfolio_consent_update`. The website owns the consent defaults and updates. Withdrawing analytics clears accessible optional cookies. If a separate optional event listener already requested its script, the page also reloads to stop it.

## Portfolio GTM workspace

On November 25, 2026, workspace 4 of `GTM-NGJ5Q7GR` had zero pending changes. Its Google tag, `G-N6EYH2KSBC`, fires on Initialization – All Pages and uses all four built-in consent checks with no additional consent required. The page supplies consent defaults before it appends the GTM script. This setup does not require an additional consent tag.

The Simple Analytics template also fires on Initialization. Use events was enabled and automated events was off. The portfolio HTML loads the pageview script directly, and its on-page template policy blocks a second request for that script. The policy permits the GA4 destination during denied consent. Any future optional auto-events script still requires analytics consent. The existing blocklist prevents the legacy Cookiebot template and its two Custom HTML workarounds from running on portfolio pages.

## Verification

Run `node --test tests/*.test.cjs`. In GTM Preview use a fresh profile and check the consent timeline, network requests and cookies. Before any scroll or choice, verify that GA4 sends a denied-state request without setting analytics cookies, and that Simple Analytics records one pageview. Check rejection, analytics-only and marketing-only grants, saved choices, withdrawal and a navigation to a project page. On an analytics-only grant, advertising consent should stay denied. Confirm optional non-Google tags respect their own controls.

Google documents the [Advanced Consent Mode sequence](https://developers.google.com/tag-platform/security/concepts/consent-mode).
