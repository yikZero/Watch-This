import dotenv from "dotenv";
import { getFeedItems } from "./odyssey.ts";
import { sendTelegramNotification } from "./notification.ts";
import { getDoubanRankings, getDoubanWeeklyRankings } from "./douban.ts";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output, jsonSchema } from "ai";
import { DateRange } from "./types.ts";
import { AI_MODEL } from "./constants.ts";

dotenv.config();

interface RankingOutput {
  tvSeries: string[];
  movies: string[];
}

const rankingSchema = jsonSchema<RankingOutput>({
  type: "object",
  properties: {
    tvSeries: {
      type: "array",
      items: { type: "string" },
      description: "Top 5 TV series names in Simplified Chinese",
    },
    movies: {
      type: "array",
      items: { type: "string" },
      description: "Top 5 movie names in Simplified Chinese",
    },
  },
  required: ["tvSeries", "movies"],
  additionalProperties: false,
});

function formatRanking(ranking: RankingOutput): string {
  const tvSection = ranking.tvSeries
    .map((name, index) => `${index + 1}. ${name}`)
    .join("\n");
  const movieSection = ranking.movies
    .map((name, index) => `${index + 1}. ${name}`)
    .join("\n");

  return `*📺 热门剧集*\n\n${tvSection}\n\n*🎬 热门电影*\n\n${movieSection}`;
}

function getDateRange(): DateRange {
  console.log("📅 Calculating date range for the weekly ranking...");
  const currentDate = new Date();
  const endDate = new Date(currentDate);

  while (endDate.getDay() !== 5) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const formatDate = (date: Date): string => {
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

function describeContent(name: string, content: string): void {
  const nonEmptyLines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
  console.log(
    `✅ ${name} data fetched successfully (${nonEmptyLines} non-empty lines)`
  );
}

async function generateRankingSummary(): Promise<string> {
  console.log("🚀 Starting ranking generation process...");
  try {
    const dateRange = getDateRange();

    console.log("🔍 Fetching data from sources...");
    const [odysseyRanking, doubanRankingRaw, doubanWeeklyRaw] = await Promise.all([
      getFeedItems(),
      getDoubanRankings(),
      getDoubanWeeklyRankings(),
    ]);

    const hasOdysseyData = odysseyRanking.trim().length > 0;
    if (hasOdysseyData) {
      describeContent("Odyssey", odysseyRanking);
    } else {
      console.log(
        "⚠️ No Odyssey data available, proceeding with Douban data only"
      );
    }

    const doubanRanking = ensureContent("Douban Hot", doubanRankingRaw);
    describeContent("Douban Hot", doubanRanking);

    const hasWeeklyData = doubanWeeklyRaw.trim().length > 0;
    if (hasWeeklyData) {
      describeContent("Douban Weekly", doubanWeeklyRaw);
    } else {
      console.log("⚠️ No Douban Weekly data available");
    }

    console.log("🤖 Generating ranking using Claude...");
    const systemPrompt = `You are a professional film and TV analyst specialized in entertainment rankings. Your task is to analyze weekly entertainment data and generate a ranking list of popular TV series and movies.`;
    const userPrompt = `Analyze the following entertainment data and generate rankings:

<odyssey_ranking>
${hasOdysseyData ? odysseyRanking : "No Odyssey data available this week"}
</odyssey_ranking>

<douban_hot_ranking>
${doubanRanking}
</douban_hot_ranking>

<douban_weekly_ranking>
${hasWeeklyData ? doubanWeeklyRaw : "No Douban Weekly data available this week"}
</douban_weekly_ranking>

Instructions:
1. Exclude children's content from consideration.
2. Prefer works that appear in multiple data sources.
3. Weekly rankings (口碑榜) indicate quality and sustained popularity.

Scoring Criteria:
- Douban Hot ranking (实时热门, primary): Top 5 = 20 points, 6-10 = 15 points
- Douban ratings above 9.0 add 5 bonus points
${hasWeeklyData ? "- Douban Weekly ranking (口碑榜, secondary): Top 5 = 15 points, 6-10 = 10 points" : ""}
${hasOdysseyData ? "- Odyssey ranking (reference only): Top 5 = 5 points, 6-10 = 3 points" : ""}
- Calculate weighted scores to determine the final ranking

Generate:
- tvSeries: Top 5 TV series names (in Simplified Chinese)
- movies: Top 5 movie names (in Simplified Chinese)`;

    const result = await generateText({
      model: anthropic(AI_MODEL),
      experimental_output: Output.object({ schema: rankingSchema }),
      system: systemPrompt,
      prompt: userPrompt,
    });
    console.log("✅ Ranking generated successfully");

    const output = result.experimental_output;
    if (!output) {
      throw new Error("Failed to generate structured ranking output");
    }

    console.log("\n📄 Generated Ranking:");
    console.log("=".repeat(50));
    console.log(JSON.stringify(output, null, 2));
    console.log("=".repeat(50));

    const finalRanking = formatRanking(output);

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
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      });
    }
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
