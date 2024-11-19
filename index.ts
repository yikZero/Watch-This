import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import dotenv from "dotenv";
import { getFeedItems } from "./rss";
import { getHotSearchData } from "./hotsearchlist";
import { sendTelegramNotification } from "./notification";

dotenv.config();

async function generateRankingSummary() {
  try {
    const rssRankings = await getFeedItems();
    const hotSearchRanking = await getHotSearchData();

    const result = await generateText({
      model: anthropic("claude-3-5-haiku-latest"),
      system: `
      You are a professional film and TV analyst specialized in Chinese entertainment rankings. Follow these rules strictly:
      1. Only analyze popularity rankings, ignore broadcast/release dates and statistics
      2. List exactly 5 works per category
      3. Use numerical prefixes (1-5) for ranking
      4. Exclude all children's content
      5. Write in Simplified Chinese
      6. Follow the exact template format without additional commentary`,
      prompt: `Based on this week's entertainment data, generate two TOP5 lists using this template:

🎬 本周热门电影 TOP5
{5部最热门电影，用1-5标注排序}

📺 本周热门剧集 TOP5
{5部最热门剧集，用1-5标注排序}

数据来源:
主要: ${rssRankings}
参考: ${hotSearchRanking}`,
    });

    await sendTelegramNotification(result.text);

    return result.text;
  } catch (error) {
    console.error("Error:", error);
    await sendTelegramNotification("排行榜生成失败");
    throw error;
  }
}

generateRankingSummary()
  .then((summary) => console.log("\nSummary:\n", summary))
  .catch(console.error);
