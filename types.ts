// RSS Feed Types
export type RssFeed = object;

export interface RssFeedItem {
  title: string;
  description: string;
  pubDate: string;
}

// Date Range Type
export interface DateRange {
  start: string;
  end: string;
}

// Telegram Types
export interface TelegramButton {
  text: string;
  url: string;
}

export interface TelegramRequestData {
  chat_id: string | number;
  text: string;
  parse_mode: "Markdown" | "HTML";
  reply_markup?: {
    inline_keyboard: Array<Array<{ text: string; url: string }>>;
  };
}
