import Parser from "rss-parser";
import { cleanHtml } from "./utils.ts";
import { RSS_URLS } from "./rsshub.ts";
import { fetchRssFeed } from "./rssFetcher.ts";

type CustomFeed = {};
type CustomItem = {
  title: string;
  description: string;
  pubDate: string;
};

const parser: Parser<CustomFeed, CustomItem> = new Parser({
  customFields: {
    item: ["title", "description", "pubDate"],
  },
});

const formatItem = (item: CustomItem, index: number) => {
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
      .slice(0, 10) // Get top 10 items
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

export const getDoubanRankings = async (): Promise<string> => {
  const [movies, tvShows] = await Promise.all([
    getFeedItems("movie"),
    getFeedItems("tv"),
  ]);

  return `${movies}\n\n${tvShows}`;
};
