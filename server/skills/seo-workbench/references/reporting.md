# Reporting and quality gate

Use this order:

1. Executive summary
2. Scope and data sources
3. Score or headline metrics with source labels
4. Findings grouped by priority
5. Recommended actions with owner/effort when useful
6. Limitations and next data connection

Before returning:

- Every number must exist in evidence or be explicitly labeled as a heuristic.
- Every site-wide statement must match crawl coverage.
- Every recommendation must map to a finding.
- Do not expose prompts, API keys, credentials, internal paths, or model identifiers.
- Return Markdown suitable for later HTML rendering. PDF remains a separate export step.
