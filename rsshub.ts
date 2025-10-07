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
