import dotenv from "dotenv";
import { getFeedItems } from "./odyssey";
import { sendTelegramNotification } from "./notification";
import { getDoubanRankings } from "./douban";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

dotenv.config();

async function extractFinalRanking(text) {
  console.log("📝 Extracting final ranking from generated text...");
  const regex = /<final_ranking>([\s\S]*?)<\/final_ranking>/;
  const match = text.match(regex);
  if (!match) {
    console.warn("⚠️ No final ranking tags found in the generated text");
    console.log("\nComplete AI response for debugging:");
    console.log("-".repeat(50));
    console.log(text);
    console.log("-".repeat(50));
    return "";
  }
  console.log("✅ Final ranking extracted successfully");
  return match[1].trim();
}

function getDateRange() {
  console.log("📅 Calculating date range for the weekly ranking...");
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

  const range = {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };

  console.log(`📍 Date range calculated: ${range.start} - ${range.end}`);
  return range;
}

function ensureContent(name: string, content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error(`${name} data is empty after fetching`);
  }
  return trimmed;
}

function describeContent(name: string, content: string) {
  const nonEmptyLines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
  console.log(`✅ ${name} data fetched successfully (${nonEmptyLines} non-empty lines)`);
}

async function generateRankingSummary() {
  console.log("🚀 Starting ranking generation process...");
  try {
    const dateRange = getDateRange();

    console.log("🔍 Fetching Odyssey data...");
    const odysseyRanking = ensureContent(
      "Odyssey",
      await getFeedItems()
    );
    describeContent("Odyssey", odysseyRanking);

    console.log("📚 Fetching Douban hot data...");
    const doubanRanking = ensureContent(
      "Douban",
      await getDoubanRankings()
    );
    describeContent("Douban", doubanRanking);

    console.log("🤖 Generating ranking using Cluade...");
    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: `You are a professional film and TV analyst specialized in entertainment rankings. Your task is to analyze weekly entertainment data and generate a ranking list of popular TV series and movies.`,
      prompt: `
      First, review the input data:

        <odyssey_ranking>
        ${odysseyRanking}
        </odyssey_ranking>

        <douban_ranking>
        ${doubanRanking}
        </douban_ranking>

        Instructions:

        1. Data Analysis:
          - Exclude children's content from consideration.
          - It is best to appear in two data sources. If there is no such data, Douban data will be displayed first.
          - Analyze ranking data using the Scoring Criteria.

        2. Scoring Criteria:
          - Douban ranking positions: Top 5 = 15 points, 6-10 = 10 points
          - Douban ratings above 9.0 add 5 points
          - Odyssey ranking positions: Top 5 = 10 points, 6-10 = 5 points
          - Sum up weighted scores to determine the final ranking

        3. Ranking Generation:
          - Generate separate rankings for TV series and movies
          - List exactly 5 works per category

        4. Output Formatting:
          - Use the following template, writing in Simplified Chinese:
            *📺 热门剧集*

            1. [TV Series 1]
            2. [TV Series 2]
            3. [TV Series 3]
            4. [TV Series 4]
            5. [TV Series 5]

            *🎬 热门电影*

            1. [Movie 1]
            2. [Movie 2]
            3. [Movie 3]
            4. [Movie 4]
            5. [Movie 5]
            
          - Use numerical prefixes (1.-5.) for each item
          - Only bold category headers using markdown *header*
          - Remove all markdown formatting from list items

        Before providing the final output, wrap your scoring and ranking process inside <scoring_process> tags. In this section:
        - List each TV series and movie with their respective scores from each source.
        - Show your calculations for the weighted scores.
        - Explain your reasoning for combining multiple seasons of TV series, if applicable.
        - Demonstrate how you arrived at the final rankings.
        This will help ensure accuracy and alignment with the given criteria. It's OK for this section to be quite long.

        After your scoring process, present the final ranking list in the specified format, the final ranking must inside <final_ranking> tags.

        Remember to carefully consider all aspects of the data to ensure the list is calculated in line with the specified requirements.`,
    });
    console.log("✅ Ranking generated successfully");

    console.log("\n📄 Complete AI Response:");
    console.log("=".repeat(50));
    console.log(result.text);
    console.log("=".repeat(50));

    const finalRanking = await extractFinalRanking(result.text);
    if (!finalRanking) {
      throw new Error("Failed to extract final ranking from generated text");
    }

    const fullContent = `💥 *本周影视热榜（${dateRange.start} - ${dateRange.end}）*\n\n${finalRanking}\n\n#周末愉快 #影视热榜`;

    console.log("📤 Sending notification to Telegram...");
    await sendTelegramNotification(fullContent, [
      {
        text: "开始追剧",
        url: "https://apps.apple.com/us/app/infuse-video-player/id1136220934",
      },
    ]);

    return fullContent;
  } catch (error) {
    console.error("❌ Error in generateRankingSummary:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    throw error;
  }
}

generateRankingSummary()
  .then((summary) => {
    console.log("\n📋 Final Summary Generated:");
    console.log("=".repeat(50));
    console.log(summary);
    console.log("=".repeat(50));
    console.log("✨ Process completed successfully!");
  })
  .catch((error) => {
    console.error("❌ Process failed:", error);
    process.exit(1);
  });
