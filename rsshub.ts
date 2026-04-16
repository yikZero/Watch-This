export const RSSHUB_ENDPOINTS = [
  "https://rss.ygxz.in",
  "https://rsshub.pseudoyu.com",
  "https://rsshub.rssforever.com",
  "https://rsshub.yfi.moe",
];

export const RSS_URLS = {
  douban: {
    movie: "/douban/list/movie_real_time_hotest",
    tv: "/douban/list/tv_real_time_hotest",
    tvKorean: "/douban/list/tv_korean",
  },
  doubanWeekly: {
    movie: "/douban/movie/weekly/movie_weekly_best",
    tv: "/douban/movie/weekly/tv_chinese_best_weekly",
    tvGlobal: "/douban/movie/weekly/tv_global_best_weekly",
  },
  odyssey: "/telegram/channel/odysseyplus/searchQuery=%23TopOnOdyssey",
};

export const getRssUrl = (path: string, endpointIndex = 0): string => {
  if (endpointIndex >= RSSHUB_ENDPOINTS.length) {
    throw new Error("No more RSSHub endpoints available");
  }
  const url = `${RSSHUB_ENDPOINTS[endpointIndex]}${path}`;
  console.log(`Trying RSSHub endpoint ${endpointIndex + 1}: ${url}`);
  return url;
};
