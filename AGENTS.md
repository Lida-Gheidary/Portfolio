# Portfolio project instructions

## Restricted content case-study indexing boundary

- The case study at `projects/content-analytics.html` MUST retain `<meta name="robots" content="noindex, nofollow">` and all indexing boundaries below.
- Legacy branded case-study pages and redirects have been removed at the owner's request. Do not recreate them.
- The owner does not want search engines or LLM discovery metadata to associate this portfolio with the content website presented in the restricted case study.
- Keep that case study out of `sitemap.xml`, `llms.txt`, structured project lists and site-wide author/creator relationships. Do not add promotion or discovery metadata to the case-study page.
- Keep the homepage card's `data-nosnippet` attribute and its case-study link's `rel="nofollow"`.
- Do not reverse these choices as a generic SEO or crawlability improvement. Only change them when the user explicitly requests a different indexing policy.
- Preserve the visible case study and portfolio card unless the user requests their removal. Do not claim that noindex, nofollow or snippet controls guarantee anonymity or prevent all associations between public pages.
