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

  // Extract rating if exists
  const ratingMatch = description.match(/\d+\.\d+/);
  const rating = ratingMatch ? `⭐ ${ratingMatch[0]}` : "";

  // Extract year and country
  const yearCountryMatch = description.match(/\d{4} \/ .*? \/ /);
  const yearCountry = yearCountryMatch
    ? yearCountryMatch[0].replace(/\//g, "|").trim()
    : "";

  // Extract genres
  const genresMatch = description.match(/\/ .*? \/ /);
  const genres = genresMatch ? genresMatch[0].replace(/\//g, "|").trim() : "";

  // Extract director and actors
  const directorActorsMatch = description.match(/\/ .*?$/);
  const directorActors = directorActorsMatch
    ? directorActorsMatch[0].replace(/\//g, "|").trim()
    : "";

  return `${index + 1}. ${item.title} ${rating}
${yearCountry}${genres}${directorActors}`;
};

const getFeedItems = async (type: "movie" | "tv"): Promise<string> => {
  try {
    const feed = await fetchRssFeed(parser, RSS_URLS.douban[type]);
    const title =
      type === "movie" ? "🎬 豆瓣实时热门电影" : "📺 豆瓣实时热门电视剧";

    const formattedItems = feed.items
      .slice(0, TOP_ITEMS_COUNT)
      .map((item, index) => formatItem(item, index))
      .join("\n\n");

    if (!formattedItems) {
      throw new Error(`Douban ${type} feed did not return any items`);
    }

    return `${title}\n\n${formattedItems}`;
  } catch (error) {
    console.error(`Error parsing Douban ${type} feed:`, error);
    throw error instanceof Error
      ? error
      : new Error(`Unknown error while parsing Douban ${type} feed`);
  }
};

const getWeeklyFeedItems = async (type: "movie" | "tv"): Promise<string> => {
  try {
    const feed = await fetchRssFeed(parser, RSS_URLS.doubanWeekly[type]);
    const title =
      type === "movie" ? "🎬 豆瓣一周口碑电影榜" : "📺 豆瓣华语口碑剧集榜";

    const formattedItems = feed.items
      .slice(0, TOP_ITEMS_COUNT)
      .map((item, index) => formatItem(item, index))
      .join("\n\n");

    if (!formattedItems) {
      console.warn(`Douban weekly ${type} feed returned no items`);
      return "";
    }

    return `${title}\n\n${formattedItems}`;
  } catch (error) {
    console.error(`Error parsing Douban weekly ${type} feed:`, error);
    return "";
  }
};

export const getDoubanRankings = async (): Promise<string> => {
  const [movies, tvShows] = await Promise.all([
    getFeedItems("movie"),
    getFeedItems("tv"),
  ]);

  return `${movies}\n\n${tvShows}`;
};

export const getDoubanWeeklyRankings = async (): Promise<string> => {
  const [movies, tvShows] = await Promise.all([
    getWeeklyFeedItems("movie"),
    getWeeklyFeedItems("tv"),
  ]);

  const results = [movies, tvShows].filter(Boolean);
  return results.join("\n\n");
};
