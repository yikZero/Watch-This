export const RSSHUB_ENDPOINTS = [
  "https://armjp.traekle.com",
  "https://rss.ygxz.in",
  "http://115.133.57.85:9001",
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
