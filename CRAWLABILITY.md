# Crawlability and discovery

The configured public base URL is `https://lida-gheidary.github.io/Portfolio/`, matching this GitHub Pages project. If the site moves to a custom domain, update canonical URLs, social metadata, JSON-LD identifiers, sitemap URLs and llms.txt links together.

## Included in this repository

- The homepage, About page and four indexable project case studies have canonical URLs, descriptions, social preview metadata and JSON-LD identifying Lida Gheidary, the website and the page's subject.
- The Lida's Lens case study MUST retain `noindex, nofollow`, at the site owner's explicit request. Do not remove this directive for SEO or LLM discovery work without an explicit change of instruction.
- The Lida's Lens case study is excluded from the sitemap, llms.txt and all structured project lists. Its author/creator JSON-LD and other added discovery metadata have been removed. Its visible homepage card uses `data-nosnippet`, and its link uses `rel="nofollow"`.
- These signals limit indexing and promotion; public content and links can still reveal a relationship between the sites. They are not access controls or a guarantee of separation.
- `sitemap.xml` lists the six indexable content pages, using the homepage's canonical directory URL.
- `llms.txt` is an optional concise guide. It links to the homepage's Projects section without listing individual projects or their status, as requested by the site owner. Public pages advertise it with `rel="describedby"`. It supplements the existing HTML; it is not a crawler-access policy or a requirement for Google AI search features.
- The Cookie Declaration at `privacy-policy.html` loads its content from Cookiebot's declaration script. It retains `noindex, follow` and is excluded from the sitemap and LLM guide.
- All main case-study content is in the HTML, including the contents of native accordion sections. JavaScript is used for interactions, not to fetch the main text.

## Domain-root robots.txt

Crawler rules must be served from `https://lida-gheidary.github.io/robots.txt`. A file deployed to `https://lida-gheidary.github.io/Portfolio/robots.txt` would not govern crawling, so no ineffective subdirectory policy has been added.

If the host-root file is absent with HTTP 404, crawlers normally proceed without restrictions. If one exists, verify that it permits `/Portfolio/` for the crawlers you want. This repository does not control the host-root file.

A sitemap declaration can be added to the host-root file:

```text
Sitemap: https://lida-gheidary.github.io/Portfolio/sitemap.xml
```

Do not replace an existing host-root policy without considering its other project sites. Search crawlers and model-training crawlers have separate purposes; this change adds no training-specific rules.

## After publishing

1. Confirm the public pages, sitemap and llms.txt return HTTP 200, and that canonical URLs match the final deployed host and path.
2. Check the host-root robots.txt and any hosting/CDN restrictions. Do not block required CSS, JavaScript or images.
3. Submit `https://lida-gheidary.github.io/Portfolio/sitemap.xml` in Google Search Console and Bing Webmaster Tools, if those accounts are configured.
4. Inspect representative indexable URLs using the search engines' URL inspection tools. Confirm that the Lida's Lens case study remains excluded by `noindex, nofollow`. Validate the indexable pages' JSON-LD against Schema.org. Rich-result eligibility varies by page type.
5. When adding or removing projects, update sitemap.xml and the homepage's structured project list to match the pages intended for indexing. Keep Lida's Lens excluded even though its portfolio card remains visible. Keep llms.txt's general Projects entry rather than adding individual project listings. When changing descriptions or images, update the indexable pages' social and structured metadata as well.

Local validation checks structure and consistency; it does not prove a live server response, indexing, ranking or citation by an AI system.

## Live check on 24 October 2026

Release `81c500d24b75e8158d3891f42b47ae1280ba60ba` was committed and pushed to `main`. GitHub Pages deployment [40092699261](https://github.com/Lida-Gheidary/Portfolio/actions/runs/40092699261) completed successfully. All eight published HTML pages, `llms.txt` and `sitemap.xml` returned HTTP 200 and matched the checked local content, including the canonical URLs and Lida's Lens `noindex, nofollow` directive. The three new CRM screenshots and the page-context dataLayer screenshot also returned HTTP 200. This verified deployment and source content, not crawler indexing or Cookiebot's browser-rendered declaration.

An earlier check on the same date found the domain-root robots.txt returned HTTP 404, so there was no robots.txt policy blocking the portfolio at that time. `AGENTS.md` and this working document remain local and were not included in the public release.

## Primary references

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: robots.txt placement and syntax](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt)
- [Google: building and submitting a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [OpenAI: crawler overview](https://developers.openai.com/api/docs/bots)
- [Anthropic: crawler controls](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [llms.txt proposal](https://llmstxt.org/)
