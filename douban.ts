import Parser from "rss-parser";
import { cleanHtml } from "./utils.ts";
import { RSS_URLS, getRssUrl } from "./rsshub.ts";

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
  let endpointIndex = 0;
  let lastError: Error | null = null;

  while (endpointIndex < 3) {
    // 最多尝试3次
    try {
      const feed = await parser.parseURL(
        getRssUrl(RSS_URLS.douban[type], endpointIndex)
      );
      const title =
        type === "movie" ? "🎬 豆瓣实时热门电影" : "📺 豆瓣实时热门电视剧";

      const formattedItems = feed.items
        .slice(0, 10) // Get top 10 items
        .map((item, index) => formatItem(item, index))
        .join("\n\n");

      return `${title}\n\n${formattedItems}`;
    } catch (error) {
      lastError = error as Error;
      console.log(
        `RSSHub endpoint ${endpointIndex + 1} failed, trying next...`
      );
      endpointIndex++;
    }
  }

  console.error(`Error parsing Douban ${type} feed:`, lastError);
  return "";
};

export const getDoubanRankings = async (): Promise<string> => {
  const [movies, tvShows] = await Promise.all([
    getFeedItems("movie"),
    getFeedItems("tv"),
  ]);

  return `${movies}\n\n${tvShows}`;
};
