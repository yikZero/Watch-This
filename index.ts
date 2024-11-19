import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import dotenv from "dotenv";
import { getFeedItems } from "./rss";
import { getHotSearchData } from "./hotsearchlist";
import { sendTelegramNotification } from "./notification";

dotenv.config();

function getDateRange() {
  const currentDate = new Date();
  const endDate = new Date(currentDate);

  while (endDate.getDay() !== 5) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const formatDate = (date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${month}.${day}`;
  };

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };
}

async function generateRankingSummary() {
  try {
    const dateRange = getDateRange();
    const rssRankings = await getFeedItems();
    const hotSearchRanking = await getHotSearchData();

    const result = await generateText({
      model: anthropic("claude-3-5-haiku-latest"),
      system: `
      You are a professional film and TV analyst specialized in Chinese entertainment rankings. Follow these rules strictly:
      1. Only analyze popularity rankings, ignore broadcast/release dates and statistics
      2. List exactly 5 works per category
      3. Use numerical prefixes (1.-5.) for ranking
      4. Exclude all children's content
      5. Markdown markup that needs to keep the title
      6. Write in Simplified Chinese
      7. Follow the exact template format without additional commentary`,
      prompt: `Based on this week's entertainment data, generate the ranking list using this template:

*🎬 热门电影*

{5部最热门电影，用1.-5.标注排序}


*📺 热门剧集*

{5部最热门剧集，用1.-5.标注排序}

数据来源:
主要: ${rssRankings}
参考: ${hotSearchRanking}`,
    });

    const fullContent = `#周五下班快乐\n\n💥 *本周影视热榜 (${dateRange.start} - ${dateRange.end})*\n\n${result.text}`;

    await sendTelegramNotification(fullContent);

    return fullContent;
  } catch (error) {
    console.error("Error:", error);
    await sendTelegramNotification("排行榜生成失败");
    throw error;
  }
}

generateRankingSummary()
  .then((summary) => console.log("\nSummary:\n", summary))
  .catch(console.error);
