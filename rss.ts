import Parser from "rss-parser";
import { cleanHtml } from "./utils.ts";

type CustomFeed = {};
type CustomItem = {
  description: string;
};

const parser: Parser<CustomFeed, CustomItem> = new Parser({
  customFields: {
    item: ["description"],
  },
});

const RSS_URLS = [
  {
    text: "MisakaF热度数据",
    url: "https://sinrowa.com/telegram/channel/misakaf_emby/searchQuery=%23%E6%AF%8F%E5%91%A8%E6%A6%9C%E5%8D%95",
  },
  {
    text: "Odyssey+公益服点播数据",
    url: "https://sinrowa.com/telegram/channel/odysseyplus/searchQuery=%23TopOnOdyssey",
  },
];

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

export const getFeedItems = async (): Promise<string> => {
  try {
    const feeds = await Promise.all(
      RSS_URLS.map(async (urlObj) => ({
        text: urlObj.text,
        feed: await parser.parseURL(urlObj.url),
      }))
    );

    const formattedItems = feeds
      .flatMap(({ text, feed }) =>
        feed.items
          .filter((item) => item.pubDate && isWithinLastSevenDays(item.pubDate))
          .map((item) => {
            const content = cleanHtml(item.description);
            return `${text}\n${item.pubDate}:\n${content}`;
          })
      )
      .join("\n\n");

    return formattedItems;
  } catch (error) {
    console.error("解析出错:", error);
    return "";
  }
};
