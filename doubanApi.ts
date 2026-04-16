import axios from "axios";
import { DoubanSearchResult, DoubanMovieDetail, EnrichedRankingItem } from "./types.ts";

const DOUBAN_API_KEY = "054022eaeae0b00e0fc068c0c0a2102a";
const DOUBAN_HEADERS = {
  "User-Agent": "MicroMessenger/8.0.0",
  Referer: "https://servicewechat.com/wx2f9b06c1de1ccfca/91/page-frame.html",
};

const normalizeTitle = (s: string): string =>
  s.replace(/[\s\u3000·•・:：,，.。!！?？"'"""''（）()\[\]【】-]/g, "").toLowerCase();

function titleMatches(queried: string, candidate: string): boolean {
  const q = normalizeTitle(queried);
  const c = normalizeTitle(candidate);
  if (!q || !c) return false;
  return q === c || c.includes(q) || q.includes(c);
}

async function searchDouban(keyword: string): Promise<string | null> {
  try {
    const { data } = await axios.get<DoubanSearchResult>(
      "https://frodo.douban.com/api/v2/search/movie",
      {
        params: { q: keyword, count: 5, apiKey: DOUBAN_API_KEY },
        headers: DOUBAN_HEADERS,
        timeout: 10_000,
      }
    );

    const candidates = data?.items ?? [];
    for (const item of candidates) {
      if (item.target && titleMatches(keyword, item.target.title)) {
        return item.target.id;
      }
    }

    const topTitle = candidates[0]?.target?.title;
    console.warn(
      `Douban search: no confident match for "${keyword}"` +
        (topTitle ? ` (top candidate was "${topTitle}")` : "")
    );
    return null;
  } catch (error) {
    console.warn(`Douban search failed for "${keyword}":`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function getDoubanDetail(subjectId: string): Promise<DoubanMovieDetail | null> {
  try {
    const { data } = await axios.get<DoubanMovieDetail>(
      `https://frodo.douban.com/api/v2/movie/${subjectId}`,
      {
        params: { apiKey: DOUBAN_API_KEY },
        headers: DOUBAN_HEADERS,
        timeout: 10_000,
      }
    );
    return data;
  } catch (error) {
    console.warn(`Douban detail failed for ID ${subjectId}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export async function enrichRankingItem(name: string): Promise<EnrichedRankingItem> {
  const subjectId = await searchDouban(name);
  if (!subjectId) return { name };

  const detail = await getDoubanDetail(subjectId);
  if (!detail) return { name };

  const rating = detail.rating?.value || undefined;
  return { name, rating };
}

export async function enrichRankingItems(names: string[]): Promise<EnrichedRankingItem[]> {
  const results: EnrichedRankingItem[] = [];
  for (const name of names) {
    results.push(await enrichRankingItem(name));
    // Small delay to avoid hitting Douban API rate limits
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return results;
}
