import Parser from "rss-parser";
import { cleanHtml } from "./utils.ts";
import { RSS_URLS } from "./rsshub.ts";
import { fetchRssFeed } from "./rssFetcher.ts";
import { RssFeed, RssFeedItem } from "./types.ts";
import { TOP_ITEMS_COUNT } from "./constants.ts";

const parser: Parser<RssFeed, RssFeedItem> = new Parser({
  customFields: {
    item: ["title", "description", "pubDate"],
  },
});

const formatItem = (item: RssFeedItem, index: number): string => {
  const description = cleanHtml(item.description);

  const ratingMatch = description.match(/\d+\.\d+/);
  const rating = ratingMatch ? `⭐ ${ratingMatch[0]}` : "";

  const yearCountryMatch = description.match(/\d{4} \/ .*? \/ /);
  const yearCountry = yearCountryMatch
    ? yearCountryMatch[0].replace(/\//g, "|").trim()
    : "";

  const genresMatch = description.match(/\/ .*? \/ /);
  const genres = genresMatch ? genresMatch[0].replace(/\//g, "|").trim() : "";

  const directorActorsMatch = description.match(/\/ .*?$/);
  const directorActors = directorActorsMatch
    ? directorActorsMatch[0].replace(/\//g, "|").trim()
    : "";

  return `${index + 1}. ${item.title} ${rating}
${yearCountry}${genres}${directorActors}`;
};

async function fetchSection(
  path: string,
  title: string,
  options: { throwOnEmpty?: boolean } = {}
): Promise<string> {
  const { throwOnEmpty = false } = options;
  try {
    const feed = await fetchRssFeed(parser, path);
    const formattedItems = feed.items
      .slice(0, TOP_ITEMS_COUNT)
      .map((item, index) => formatItem(item, index))
      .join("\n\n");

    if (!formattedItems) {
      if (throwOnEmpty) {
        throw new Error(`${title} feed returned no items`);
      }
      console.warn(`⚠️ ${title} feed returned no items`);
      return "";
    }

    return `${title}\n\n${formattedItems}`;
  } catch (error) {
    if (throwOnEmpty) {
      console.error(`Error parsing ${title}:`, error);
      throw error instanceof Error
        ? error
        : new Error(`Unknown error while parsing ${title}`);
    }
    console.warn(`⚠️ ${title} failed, skipping:`, error instanceof Error ? error.message : error);
    return "";
  }
}

export const getDoubanRankings = async (): Promise<string> => {
  const [movies, tvShows] = await Promise.all([
    fetchSection(RSS_URLS.douban.movie, "🎬 豆瓣实时热门电影", { throwOnEmpty: true }),
    fetchSection(RSS_URLS.douban.tv, "📺 豆瓣实时热门电视剧", { throwOnEmpty: true }),
  ]);

  return `${movies}\n\n${tvShows}`;
};

export const getDoubanWeeklyRankings = async (): Promise<string> => {
  const [movies, tvShows] = await Promise.all([
    fetchSection(RSS_URLS.doubanWeekly.movie, "🎬 豆瓣一周口碑电影榜"),
    fetchSection(RSS_URLS.doubanWeekly.tv, "📺 豆瓣华语口碑剧集榜"),
  ]);

  return [movies, tvShows].filter(Boolean).join("\n\n");
};

export const getDoubanKoreanHot = async (): Promise<string> =>
  fetchSection(RSS_URLS.douban.tvKorean, "📺 豆瓣热门韩剧");

export const getDoubanGlobalWeeklyRankings = async (): Promise<string> =>
  fetchSection(RSS_URLS.doubanWeekly.tvGlobal, "📺 豆瓣全球口碑剧集榜");
