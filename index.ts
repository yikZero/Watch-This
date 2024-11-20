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
        1. Analyze ranking data from 3 sources with different weights:
          - Primary source (MisakaF热度数据): 60% weight
          - Secondary source (Odyssey+公益服点播数据): 30% weight
          - Search ranking data (搜索热度): 10% weight

        2. Scoring criteria:
          - For items with viewership data: Convert to score out of 60
          - Public service ranking positions: 1-3=30pts, 4-5=20pts, 6-8=15pts
          - Search ranking positions: Top 5=10pts, 6-10=5pts
          - Sum up weighted scores to determine final ranking

        3. Format requirements:
          - List exactly 5 works per category
          - Use numerical prefixes (1.-5.)
          - No need to display specific scores
          - Only bold category headers using markdown *header*
          - Remove all markdown formatting from list items
          - Write in Simplified Chinese
          - Follow the exact template format without any additional text or symbols

        4. Content filters:
          - Exclude children's content
          - For series, combine seasons under single entry`,
      prompt: `Based on this week's entertainment data, generate the ranking list using this template:

*📺 热门剧集*

{5部最热门剧集，用1.-5.标注排序}

*🎬 热门电影*

{5部最热门电影，用1.-5.标注排序}

数据来源:
${rssRankings}
搜索热度: ${hotSearchRanking}`,
    });

    const fullContent = `💥 *本周影视热榜（${dateRange.start} - ${dateRange.end}）*\n\n${result.text}\n\n#周末愉快 #影视热榜`;

    await sendTelegramNotification(fullContent, [
      {
        text: "开始追剧",
        url: "https://apps.apple.com/us/app/infuse-video-player/id1136220934",
      },
    ]);

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
