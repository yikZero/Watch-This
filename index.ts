import { z } from "zod";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { getFeedItems } from "./odyssey.ts";
import { sendTelegramNotification } from "./notification.ts";
import {
  getDoubanRankings,
  getDoubanWeeklyRankings,
  getDoubanKoreanHot,
  getDoubanGlobalWeeklyRankings,
} from "./douban.ts";
import { DateRange, EnrichedRankingItem } from "./types.ts";
import { AI_MODEL } from "./constants.ts";
import { enrichRankingItems } from "./doubanApi.ts";

const rankingSchema = z.object({
  tvSeries: z
    .array(z.string())
    .describe("Exactly 5 TV series names in Simplified Chinese, in ranked order"),
  movies: z
    .array(z.string())
    .describe("Exactly 5 movie names in Simplified Chinese, in ranked order"),
});

interface EnrichedRanking {
  tvSeries: EnrichedRankingItem[];
  movies: EnrichedRankingItem[];
}

function formatEnrichedItem(item: EnrichedRankingItem, index: number): string {
  let line = `${index + 1}. ${item.name}`;
  if (item.rating) {
    line += ` ${item.rating}`;
  }
  return line;
}

function formatRanking(ranking: EnrichedRanking): string {
  const tvSection = ranking.tvSeries
    .map((item, index) => formatEnrichedItem(item, index))
    .join("\n");
  const movieSection = ranking.movies
    .map((item, index) => formatEnrichedItem(item, index))
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
    const [
      odysseyRanking,
      doubanRankingRaw,
      doubanWeeklyRaw,
      doubanKoreanRaw,
      doubanGlobalWeeklyRaw,
    ] = await Promise.all([
      getFeedItems(),
      getDoubanRankings(),
      getDoubanWeeklyRankings(),
      getDoubanKoreanHot(),
      getDoubanGlobalWeeklyRankings(),
    ]);

    const hasOdysseyData = odysseyRanking.trim().length > 0;
    if (hasOdysseyData) {
      describeContent("Odyssey", odysseyRanking);
    } else {
      console.log("⚠️ No Odyssey data available");
    }

    const doubanRanking = ensureContent("Douban Hot", doubanRankingRaw);
    describeContent("Douban Hot", doubanRanking);

    const hasWeeklyData = doubanWeeklyRaw.trim().length > 0;
    if (hasWeeklyData) {
      describeContent("Douban Weekly (Chinese)", doubanWeeklyRaw);
    } else {
      console.log("⚠️ No Douban Weekly (Chinese) data available");
    }

    const hasKoreanData = doubanKoreanRaw.trim().length > 0;
    if (hasKoreanData) {
      describeContent("Douban Korean Hot", doubanKoreanRaw);
    } else {
      console.log("⚠️ No Douban Korean Hot data available");
    }

    const hasGlobalWeeklyData = doubanGlobalWeeklyRaw.trim().length > 0;
    if (hasGlobalWeeklyData) {
      describeContent("Douban Weekly (Global)", doubanGlobalWeeklyRaw);
    } else {
      console.log("⚠️ No Douban Weekly (Global) data available");
    }

    console.log("🤖 Generating ranking using OpenRouter...");
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const systemPrompt = `You are a professional film and TV analyst specialized in entertainment rankings. Your task is to analyze weekly entertainment data and generate a ranking list of popular TV series and movies tailored to a Chinese audience.

Do your scoring silently. Respond with ONLY the JSON object conforming to the provided schema — no preamble, no explanation of your calculations, no chain-of-thought text. The tvSeries and movies arrays must contain exactly 5 plain title strings each, in ranked order, without numbering, scoring, or commentary appended.`;

    const userPrompt = `Analyze the following entertainment data and generate rankings:

<odyssey_ranking>
${hasOdysseyData ? odysseyRanking : "No Odyssey data available this week"}
</odyssey_ranking>

<douban_hot_ranking>
${doubanRanking}
</douban_hot_ranking>

<douban_korean_hot>
${hasKoreanData ? doubanKoreanRaw : "No Douban Korean hot data available this week"}
</douban_korean_hot>

<douban_weekly_chinese>
${hasWeeklyData ? doubanWeeklyRaw : "No Douban weekly (Chinese) data available this week"}
</douban_weekly_chinese>

<douban_weekly_global>
${hasGlobalWeeklyData ? doubanGlobalWeeklyRaw : "No Douban weekly (global) data available this week"}
</douban_weekly_global>

Instructions:
1. Only include works that explicitly appear in the source data above. Do not invent titles.
2. Exclude children's content from consideration.
3. Prefer works that appear in multiple data sources.
4. **Audience preference** — the audience is Chinese and watches primarily:
   - 韩剧 (Korean dramas, romance / thriller / slice-of-life)
   - 小甜剧 (mainland Chinese sweet romance dramas, 偶像剧, 甜宠)
   - 华语正剧 / 悬疑 / 古装 when highly rated
   Strongly de-prioritise Western superhero shows, gritty HBO-style prestige dramas, and animation aimed at Western audiences — even if they appear in the Global Weekly list. Only include such a Western show in the final Top 5 if it both (a) has a Douban rating ≥ 9.3 and (b) clearly dominates scoring with no viable Chinese/Korean alternative.
5. Weekly rankings (口碑榜) indicate quality and sustained popularity.
6. Tie-breaking (apply in order when total scores are equal):
   a. Higher Douban rating wins.
   b. Appearing in more distinct data sources wins.
   c. Higher rank in Douban Hot wins.

Scoring Criteria:
- Douban Hot ranking (实时热门, primary): Top 5 = 20 points, 6-10 = 15 points
- Douban ratings above 9.0 add 5 bonus points
${hasWeeklyData ? "- Douban Weekly Chinese (华语口碑): Top 5 = 15 points, 6-10 = 10 points" : ""}
${hasKoreanData ? "- Douban Korean Hot (韩剧热门): Top 5 = 15 points, 6-10 = 10 points" : ""}
${hasGlobalWeeklyData ? "- Douban Weekly Global (全球口碑): Top 5 = 10 points, 6-10 = 5 points" : ""}
${hasOdysseyData ? "- Odyssey ranking (reference only): Top 5 = 5 points, 6-10 = 3 points" : ""}
- Calculate weighted scores to determine the final ranking

Generate:
- tvSeries: Top 5 TV series names (in Simplified Chinese)
- movies: Top 5 movie names (in Simplified Chinese)`;

    const result = await generateText({
      model: openrouter.chat(AI_MODEL, {
        provider: { order: ["anthropic"], allow_fallbacks: false },
      }),
      output: Output.object({ schema: rankingSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0,
    });
    console.log("✅ Ranking generated successfully");

    const output = result.output;
    if (!output) {
      throw new Error("Failed to generate structured ranking output");
    }

    console.log("\n📄 Generated Ranking:");
    console.log("=".repeat(50));
    console.log(JSON.stringify(output, null, 2));
    console.log("=".repeat(50));

    console.log("🔎 Enriching rankings with Douban API data...");
    const [enrichedTv, enrichedMovies] = await Promise.all([
      enrichRankingItems(output.tvSeries),
      enrichRankingItems(output.movies),
    ]);
    console.log("✅ Enrichment complete");

    const enrichedRanking: EnrichedRanking = {
      tvSeries: enrichedTv,
      movies: enrichedMovies,
    };

    const finalRanking = formatRanking(enrichedRanking);

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
