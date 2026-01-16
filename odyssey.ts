import Parser from "rss-parser";
import { cleanHtml } from "./utils.ts";
import { RSS_URLS } from "./rsshub.ts";
import { fetchRssFeed } from "./rssFetcher.ts";
import { RssFeed, RssFeedItem } from "./types.ts";
import { DAYS_LOOKBACK } from "./constants.ts";

const parser: Parser<RssFeed, RssFeedItem> = new Parser({
  customFields: {
    item: ["description", "title", "pubDate"],
  },
});

const getDaysAgo = (days: number = DAYS_LOOKBACK): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const isWithinDateRange = (pubDate: string): boolean => {
  const cutoffDate = getDaysAgo();
  const itemDate = new Date(pubDate);
  return itemDate >= cutoffDate;
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
      .filter((item) => item.pubDate && isWithinDateRange(item.pubDate))
      .map((item) => formatContent(item.description))
      .join("\n\n");

    if (!formattedItems) {
      console.warn("⚠️ Odyssey feed returned no items within the last seven days");
      return "";
    }

    return formattedItems;
  } catch (error) {
    console.error("Error parsing Odyssey feed:", error);
    console.warn("⚠️ Continuing without Odyssey data");
    return "";
  }
};
