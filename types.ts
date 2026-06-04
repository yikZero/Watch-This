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

// Douban API Types
export interface DoubanSearchResult {
  items: Array<{
    target: {
      id: string;
      title: string;
    };
  }>;
}

export interface DoubanMovieDetail {
  id: string;
  title: string;
  rating: {
    value: number;
  };
}

export interface EnrichedRankingItem {
  name: string;
  rating?: number;
}
