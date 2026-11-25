# Portfolio consent controls

The portfolio uses local consent controls in `consent.js` and `consent.css`. Each main page loads the cookieless Simple Analytics pageview script directly. It runs before any banner choice, including on the homepage hero, and continues after a rejection. Optional tracking is off on first visits. The initial panel offers Accept and Customize. Customize reveals category controls, Reject optional and Save preferences; opening customization does not grant consent. Every main page has a footer settings button. The current choice expires after 180 days. A blocked or invalid browser storage record never grants consent.

On the homepage, `data-consent-start="main"` on the consent script delays both the initial banner and the GTM loader until the second section (`#main`, containing Projects) reaches the top of the viewport and the hero has left view. This also delays GTM for visitors with remembered analytics consent. Anchor navigation and restored scroll positions past the hero unlock the same gate. The gate stays open for the rest of that page visit. Direct visits to About and project pages can show the banner immediately and load GTM if analytics was previously allowed.

The current portfolio container is `GTM-NGJ5Q7GR`. Its published resource was inspected on 18 November 2026. It contains Google Analytics (`G-N6EYH2KSBC`), Simple Analytics, a Cookiebot template and two Custom HTML tags that hide and reveal the old Cookiebot interface. The new pages use the existing analytics container only after analytics consent. Marketing-only consent does not load that container because it has no marketing tags.

The on-page GTM blocklist disables the audited Cookiebot template (`cvt_57SF4`) and Custom HTML (`html`). The latter currently consists only of the two obsolete banner workarounds. The `inject_script` policy prevents GTM templates from loading the Simple Analytics pageview script a second time. With analytics consent it permits the existing Google tag and the optional Simple Analytics auto-events script if configured in GTM. No live GTM container was edited or published for this change.

Changing categories after tracking has started reloads the page so already-running scripts stop. Analytics withdrawal also sets the Google Analytics disable flag and removes accessible optional cookies. A storage event applies changes across open portfolio tabs. Cookies or storage on other origins cannot be removed by the portfolio.

## Maintaining the integration

- Review the tag inventory before publishing GTM changes. New Custom HTML tags are deliberately blocked, and new template script URLs require a policy update.
- Add accurate provider information to `privacy-policy.html` before adding new tools. Increment the consent version and storage key when tools or purposes change, so previous choices do not silently authorize a new setup.
- Check first visits, Reject, analytics-only, marketing-only, Accept, withdrawal, expiry and storage failures. Run `node --test tests/*.test.cjs` for local controller and repository checks.
- Preview the deployed container in Tag Assistant before changing the audited template IDs. A local code test does not replace a live network check.

This follows Google's [basic consent-mode sequence](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic): defaults and consent choices precede the optional GTM loader. The Cookiebot exclusions use Google's [tag restriction controls](https://developers.google.com/tag-platform/tag-manager/restrict) and [custom-template policy API](https://developers.google.com/tag-platform/tag-manager/templates/policies).
