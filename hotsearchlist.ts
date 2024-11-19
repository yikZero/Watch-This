import axios from "axios";

export const getHotSearchData = async (): Promise<string> => {
  try {
    const response = await axios.get(
      "https://rankv21.aiyifan.tv/v3/list/gethotsearchlist",
      {
        params: {
          cinema: 1,
          size: 10,
        },
      }
    );

    if (response.data.ret === 200 && response.data.data.info) {
      const titles = response.data.data.info[0].map(
        (item: { title: string }) => item.title
      );

      return titles.map((title, index) => `${index + 1}. ${title}`).join("\n");
    }

    return "";
  } catch (error) {
    console.error("获取热搜数据失败:", error);
    return "";
  }
};
