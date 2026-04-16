# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `bun install` — install deps (generates `bun.lock`)
- `bun start` (or `bun run index.ts`) — runs the one-shot pipeline
- `bun run typecheck` — `tsc --noEmit`; the only way to validate code since there are no tests

Bun runs `.ts` natively and auto-loads `.env`; there is no build step and no `dotenv` import. Requires `.env` with `OPENROUTER_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (and optional `BARK_KEY`). See `.env.example`.

## Architecture

This is a **one-shot CLI script**, not a long-running service. `index.ts` runs top-to-bottom and exits. It is triggered weekly by `.github/workflows/work.yml` (cron `30 11 * * 5` — Friday 11:30 UTC) via `oven-sh/setup-bun@v2`.

### Pipeline (all in `index.ts`)

1. **Compute date range** — `getDateRange()` walks forward to the next Friday, then back 7 days. Used only for the human-readable header in the Telegram message.
2. **Fetch sources in parallel** — four Douban feeds via `Promise.all` (all routed through `fetchRssFeed`'s RSSHub fallback):
   - `getDoubanRankings()` (`douban.ts`) — 豆瓣实时热门 movies + TV. **Required**, throws if empty.
   - `getDoubanWeeklyRankings()` — 豆瓣一周口碑电影榜 + 华语口碑剧集榜. **Optional**.
   - `getDoubanKoreanHot()` — 豆瓣热门韩剧. **Optional**.
   - `getDoubanGlobalWeeklyRankings()` — 豆瓣全球口碑剧集榜 (captures quality K/日/美剧). **Optional**.
3. **AI ranking** — `generateText` from `ai` with `@openrouter/ai-sdk-provider`, using the modern `output: Output.object({ schema })` API (Zod schema — *not* `experimental_output` or `jsonSchema()`). Result accessed as `result.output`. Model is `AI_MODEL` from `constants.ts` (`google/gemini-3-flash-preview`). Prompt conditionally includes scoring rules only for data sources that actually returned data — extend this pattern when adding new sources.
4. **Enrich** — `enrichRankingItems` in `doubanApi.ts` looks up each title via Douban's Frodo API to attach the rating. Serial with a 300ms delay between requests. **Note**: `searchDouban` iterates the top-5 candidates and only accepts ones whose normalized title matches the queried keyword (via `titleMatches` — bidirectional `includes` after normalizing punctuation/whitespace). This guards against Douban's fuzzy search returning bogus matches for mis-spelled titles. Non-matches degrade to `{ name }` with a warning log.
5. **Format & send** — `formatRanking` builds Markdown; `sendTelegramNotification` posts with an inline button.

### RSSHub endpoint fallback

All RSS fetching goes through `fetchRssFeed` in `rssFetcher.ts`, which iterates `RSSHUB_ENDPOINTS` (four mirrors in `rsshub.ts`) and tries each with a 15s `AbortController` timeout until one succeeds. When adding a new RSS source, define the path in `RSS_URLS` (not a full URL) and pass it through `fetchRssFeed` so it inherits the fallback.

### Douban API specifics (`doubanApi.ts`)

The Frodo endpoints (`frodo.douban.com/api/v2`) are reverse-engineered from Douban's WeChat mini program. They require the hardcoded `apiKey`, the `MicroMessenger` User-Agent, and the `servicewechat.com` Referer — don't change these without reason.

## Conventions

- **ESM + `.ts` extensions in imports**: `tsconfig.json` has `"module": "ESNext"` and `allowImportingTsExtensions: true`, and `package.json` has `"type": "module"`. All imports inside the repo use explicit `.ts` suffixes (e.g. `from "./odyssey.ts"`). Keep this when adding new modules.
- **Optional vs. required sources**: everything except Douban Hot degrades to `""` on failure. `index.ts` branches on `hasXxxData` flags to alter the prompt — preserve this pattern if adding new sources, and add the corresponding scoring line only inside the same conditional.
- **Source helpers in `douban.ts`**: all go through the internal `fetchSection(path, title, opts)` helper. Add a new source by exporting a one-liner that calls `fetchSection(...)` with the right RSS path + section title.
- **Model selection**: change `AI_MODEL` in `constants.ts`, not in `index.ts`. The slug is an OpenRouter model identifier (e.g. `anthropic/claude-sonnet-4.6`, `google/gemini-3-flash-preview`). Current default: Claude Sonnet 4.6 — chosen for instruction-following consistency on the scoring rules.
- **Output language**: titles in the AI output must be Simplified Chinese (the Zod schema's `describe()` enforces this; the Telegram template also uses Chinese).
