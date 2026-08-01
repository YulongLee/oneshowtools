# Website audit

- HTTP status, redirect chain, canonical, robots directives, sitemap discovery, title, description, headings, viewport, images, and links are observable evidence.
- A robots.txt file controls crawling, not guaranteed indexing. Do not report `Disallow` as a noindex mechanism.
- Canonical annotations are signals; search engines may select another canonical.
- Check a bounded sample and state coverage. Do not generalize a sampled issue to the whole domain without evidence.
- Broken-link checks cover only attempted links and recorded responses. Timeouts are unknown, not necessarily broken.
- Mobile friendliness from viewport markup is a heuristic. A Lighthouse/PageSpeed result is a separate provider observation.
