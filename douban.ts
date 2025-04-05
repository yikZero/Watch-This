import Parser from "rss-parser";
import { cleanHtml } from "./utils.ts";

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

const RSS_URLS = {
  movie: "https://sinrowa.com/douban/list/movie_real_time_hotest",
  tv: "https://sinrowa.com/douban/list/tv_real_time_hotest",
};

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
    const feed = await parser.parseURL(RSS_URLS[type]);
    const title =
      type === "movie" ? "🎬 豆瓣实时热门电影" : "📺 豆瓣实时热门电视剧";

    const formattedItems = feed.items
      .slice(0, 10) // Get top 10 items
      .map((item, index) => formatItem(item, index))
      .join("\n\n");

    return `${title}\n\n${formattedItems}`;
  } catch (error) {
    console.error(`Error parsing Douban ${type} feed:`, error);
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
