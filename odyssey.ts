import Parser from "rss-parser";
import { cleanHtml } from "./utils.ts";
import { RSS_URLS, getRssUrl } from "./rsshub.ts";

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
  let endpointIndex = 0;
  let lastError: Error | null = null;

  while (endpointIndex < 3) {
    // 最多尝试3次
    try {
      const feed = await parser.parseURL(
        getRssUrl(RSS_URLS.odyssey, endpointIndex)
      );
      const formattedItems = feed.items
        .filter((item) => item.pubDate && isWithinLastSevenDays(item.pubDate))
        .map((item) => formatContent(item.description))
        .join("\n\n");

      return formattedItems;
    } catch (error) {
      lastError = error as Error;
      console.log(
        `RSSHub endpoint ${endpointIndex + 1} failed, trying next...`
      );
      endpointIndex++;
    }
  }

  console.error("Error parsing Odyssey feed:", lastError);
  return "";
};
