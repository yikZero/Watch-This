import Parser from "rss-parser";
import { cleanHtml } from "./utils.ts";

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

const RSS_URL =
  "https://sinrowa.com/telegram/channel/odysseyplus/searchQuery=%23TopOnOdyssey";

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
    const feed = await parser.parseURL(RSS_URL);

    const formattedItems = feed.items
      .filter((item) => item.pubDate && isWithinLastSevenDays(item.pubDate))
      .map((item) => formatContent(item.description))
      .join("\n\n");

    return formattedItems;
  } catch (error) {
    console.error("Error parsing Odyssey+ feed:", error);
    return "";
  }
};
