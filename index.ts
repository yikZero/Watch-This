import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { sendTelegramNotification } from "./notification.ts";
import {
  getDoubanRankings,
  getDoubanWeeklyRankings,
  getDoubanKoreanHot,
  getDoubanGlobalWeeklyRankings,
} from "./douban.ts";
import { DateRange, EnrichedRankingItem } from "./types.ts";
import { enrichRankingItems } from "./doubanApi.ts";
import { generateDeterministicRanking, Ranking } from "./ranking.ts";

const rankingSchema = z.object({
  tvSeries: z
    .array(z.string())
    .describe("Exactly 5 TV series names in Simplified Chinese, in ranked order"),
  movies: z
    .array(z.string())
    .describe("Exactly 5 movie names in Simplified Chinese, in ranked order"),
});

const RANKING_STATE_PATH =
  process.env.RANKING_STATE_PATH ?? "data/previous-ranking.json";

interface EnrichedRanking {
  tvSeries: EnrichedRankingItem[];
  movies: EnrichedRankingItem[];
}

function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatRankingItem(item: EnrichedRankingItem, index: number): string {
  const rating = item.rating ? `  ${item.rating}` : "";
  return `${index + 1}. ${escapeTelegramHtml(item.name)}${rating}`;
}

function buildNotificationText(
  ranking: EnrichedRanking,
  dateRange: DateRange
): string {
  const tvSeries = ranking.tvSeries.map(formatRankingItem).join("\n");
  const movies = ranking.movies.map(formatRankingItem).join("\n");

  return [
    `<b>💥 本周影视热榜（${dateRange.start} - ${dateRange.end}）</b>`,
    "",
    "<b>📺 热门剧集</b>",
    tvSeries,
    "",
    "<b>🎬 热门电影</b>",
    movies,
  ].join("\n");
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

function ensureRankingLength(ranking: Ranking): Ranking {
  if (ranking.tvSeries.length !== 5 || ranking.movies.length !== 5) {
    throw new Error("Ranking must contain exactly 5 TV series and 5 movies");
  }
  return ranking;
}

async function loadPreviousRanking(): Promise<Ranking | null> {
  try {
    const raw = await readFile(RANKING_STATE_PATH, "utf8");
    const ranking = ensureRankingLength(rankingSchema.parse(JSON.parse(raw)));
    console.log(`✅ Previous ranking loaded from ${RANKING_STATE_PATH}`);
    return ranking;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`ℹ️ No usable previous ranking (${message})`);
    return null;
  }
}

async function savePreviousRanking(ranking: Ranking): Promise<void> {
  await mkdir(dirname(RANKING_STATE_PATH), { recursive: true });
  await writeFile(
    RANKING_STATE_PATH,
    `${JSON.stringify(ranking, null, 2)}\n`,
    "utf8"
  );
  console.log(`✅ Current ranking saved to ${RANKING_STATE_PATH}`);
}

async function generateRankingSummary(): Promise<string> {
  console.log("🚀 Starting ranking generation process...");
  try {
    const dateRange = getDateRange();
    const previousRanking = await loadPreviousRanking();

    console.log("🔍 Fetching data from sources...");
    const [
      doubanRankingRaw,
      doubanWeeklyRaw,
      doubanKoreanRaw,
      doubanGlobalWeeklyRaw,
    ] = await Promise.all([
      getDoubanRankings(),
      getDoubanWeeklyRankings(),
      getDoubanKoreanHot(),
      getDoubanGlobalWeeklyRankings(),
    ]);

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

    console.log("🧮 Calculating ranking with freshness adjustment...");
    const output = ensureRankingLength(
      generateDeterministicRanking(
        {
          doubanHot: doubanRanking,
          doubanWeekly: hasWeeklyData ? doubanWeeklyRaw : undefined,
          doubanKorean: hasKoreanData ? doubanKoreanRaw : undefined,
          doubanGlobalWeekly: hasGlobalWeeklyData
            ? doubanGlobalWeeklyRaw
            : undefined,
        },
        previousRanking
      )
    );
    console.log("✅ Ranking calculated successfully");

    console.log("\n📄 Generated Ranking:");
    console.log("=".repeat(50));
    console.log(JSON.stringify(output, null, 2));
    console.log("=".repeat(50));

    console.log("🔎 Enriching rankings with Douban data...");
    const [enrichedTv, enrichedMovies] = await Promise.all([
      enrichRankingItems(output.tvSeries),
      enrichRankingItems(output.movies),
    ]);
    console.log("✅ Enrichment complete");

    const enrichedRanking: EnrichedRanking = {
      tvSeries: enrichedTv,
      movies: enrichedMovies,
    };

    const notificationText = buildNotificationText(enrichedRanking, dateRange);

    console.log("📤 Sending notification to Telegram...");
    await sendTelegramNotification({ text: notificationText, parseMode: "HTML" });
    await savePreviousRanking(output);

    return notificationText;
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
