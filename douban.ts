import axios from "axios";

interface DoubanSubject {
  title: string;
  rate: string;
  url: string;
}

export const getDoubanMovieHot = async (
  limit: number = 10
): Promise<string> => {
  try {
    const response = await axios.get(
      "https://movie.douban.com/j/search_subjects",
      {
        params: {
          type: "movie",
          tag: "热门",
          page_limit: 50,
          page_start: 0,
        },
      }
    );

    if (response.data && response.data.subjects) {
      const movies = response.data.subjects.slice(0, limit);
      return formatDoubanList(movies, "电影");
    }

    return "";
  } catch (error) {
    console.error("获取豆瓣电影热榜失败:", error);
    return "";
  }
};

export const getDoubanTVHot = async (limit: number = 10): Promise<string> => {
  try {
    const response = await axios.get(
      "https://movie.douban.com/j/search_subjects",
      {
        params: {
          type: "tv",
          tag: "热门",
          page_limit: 50,
          page_start: 0,
        },
      }
    );

    if (response.data && response.data.subjects) {
      const tvShows = response.data.subjects.slice(0, limit);
      return formatDoubanList(tvShows, "剧集");
    }

    return "";
  } catch (error) {
    console.error("获取豆瓣电视剧热榜失败:", error);
    return "";
  }
};

const formatDoubanList = (items: DoubanSubject[], type: string): string => {
  if (!items || items.length === 0) {
    return "";
  }

  const header = `📊 豆瓣热门${type}榜单：\n\n`;

  const list = items
    .map((item, index) => {
      const rating = item.rate ? `⭐${item.rate}` : "暂无评分";
      return `${index + 1}. ${item.title} ${rating}`;
    })
    .join("\n");

  return header + list;
};

export const getDoubanHot = async (limit: number = 10): Promise<string> => {
  try {
    const movieHot = await getDoubanMovieHot(limit);
    const tvHot = await getDoubanTVHot(limit);

    return movieHot + "\n\n" + tvHot;
  } catch (error) {
    console.error("获取豆瓣热榜失败:", error);
    return "";
  }
};
