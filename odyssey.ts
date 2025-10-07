import Parser from "rss-parser";
import { cleanHtml } from "./utils.ts";
import { RSS_URLS } from "./rsshub.ts";
import { fetchRssFeed } from "./rssFetcher.ts";

type CustomFeed = {};
type CustomItem = {
  description: string;
  title: string;
  pubDate: string;
};

const parser: Parser<CustomFeed, CustomItem> = new Parser({
  customFields: {
    item: ["description", "title", "pubDate"],
  },
});

const getSevenDaysAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date;
};

const isWithinLastSevenDays = (pubDate: string) => {
  const sevenDaysAgo = getSevenDaysAgo();
  const itemDate = new Date(pubDate);
  return itemDate >= sevenDaysAgo;
};

const formatContent = (content: string) => {
  // Remove HTML tags and extra whitespace
  const cleaned = cleanHtml(content).replace(/\n+/g, "\n").trim();

  // Extract the date range from the title
  const dateRangeMatch = cleaned.match(/\((\d{2}\.\d{2} - \d{2}\.\d{2})\)/);
  const dateRange = dateRangeMatch ? dateRangeMatch[1] : "";

  // Format the content with proper spacing
  return `📊 Odyssey+ Weekly Rankings ${dateRange}\n\n${cleaned}`;
};

export const getFeedItems = async (): Promise<string> => {
  try {
    const feed = await fetchRssFeed(parser, RSS_URLS.odyssey);
    const formattedItems = feed.items
      .filter((item) => item.pubDate && isWithinLastSevenDays(item.pubDate))
      .map((item) => formatContent(item.description))
      .join("\n\n");

    if (!formattedItems) {
      throw new Error("Odyssey feed returned no items within the last seven days");
    }

    return formattedItems;
  } catch (error) {
    console.error("Error parsing Odyssey feed:", error);
    throw error instanceof Error
      ? error
      : new Error("Unknown error while parsing Odyssey feed");
  }
};
