# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable product direction

- OneShowTools is a product under OneShow AI Lab.
- OneShowTools is the shared control plane for many independently developed AI
  tools. It owns the tool catalog, unified users, roles and permissions,
  entitlements and credits, usage history, and administrative governance.
- Keep tool-specific prompts, inference pipelines, uploads, and business logic
  inside each individual tool. Integrate tools with the platform through stable,
  versioned contracts.
- Implement cross-tool capabilities once at the platform layer rather than
  duplicating them inside every tool.
- Keep Codex as a backend-only development executor for building and maintaining
  individual tools. Do not expose Codex in customer model settings, runtime
  status, or the public tool experience.
- Preserve the selected blue-and-white tool-portal paradigm: top navigation, search-led hero, primary tool library, and a secondary recent-usage/credits panel.
- Keep the visual system calm, bright, practical, and low-decoration rather than experimental or highly thematic.
- Scale the Tool Marketplace as a category directory rather than a wall of large cards. Keep all 13 product categories visible, use compact tool rows for real available tools, and let empty categories communicate future expansion without inventing fake products.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
