import Parser from "rss-parser";
import { RSSHUB_ENDPOINTS, getRssUrl } from "./rsshub.ts";

const DEFAULT_TIMEOUT_MS = 15_000;

interface FetchOptions {
  timeoutMs?: number;
}

export async function fetchRssFeed<TFeed, TItem>(
  parser: Parser<TFeed, TItem>,
  path: string,
  options: FetchOptions = {}
): Promise<TFeed & Parser.Output<TItem>> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  let lastError: unknown = null;

  for (let endpointIndex = 0; endpointIndex < RSSHUB_ENDPOINTS.length; endpointIndex++) {
    const url = getRssUrl(path, endpointIndex);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      const xml = await response.text();
      const feed = await parser.parseString(xml);

      return feed;
    } catch (error) {
      lastError = error;
      const message =
        error instanceof Error
          ? error.name === "AbortError"
            ? `request timed out after ${timeoutMs}ms`
            : error.message
          : "Unknown error";
      console.log(`RSSHub endpoint ${endpointIndex + 1} failed (${message}), trying next...`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `All RSSHub endpoints failed for ${path}: ${lastError.message}`
      : `All RSSHub endpoints failed for ${path} with unknown error`
  );
}
