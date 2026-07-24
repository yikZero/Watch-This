export interface Ranking {
  tvSeries: string[];
  movies: string[];
}

type Category = "tvSeries" | "movies";

interface RankedItem {
  title: string;
  rank: number;
  rating?: number;
  category: Category;
}

interface Candidate {
  title: string;
  score: number;
  rating: number;
  sources: Set<string>;
  bestHotRank: number;
  repeated: boolean;
}

interface RankingSources {
  doubanHot: string;
  doubanWeekly?: string;
  doubanKorean?: string;
  doubanGlobalWeekly?: string;
}

function parseRankedItems(content: string): RankedItem[] {
  const items: RankedItem[] = [];
  let category: Category | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("🎬")) {
      category = "movies";
      continue;
    }
    if (line.startsWith("📺")) {
      category = "tvSeries";
      continue;
    }
    if (!category) continue;

    const match = line.match(/^(\d+)\.\s+(.+?)(?:\s+⭐\s+(\d+(?:\.\d+)?))?$/);
    if (!match) continue;

    items.push({
      rank: Number(match[1]),
      title: match[2].trim(),
      rating: match[3] ? Number(match[3]) : undefined,
      category,
    });
  }

  return items;
}

function addSource(
  maps: Record<Category, Map<string, Candidate>>,
  content: string | undefined,
  source: string,
  points: (rank: number) => number,
  previous: Ranking | null
): void {
  if (!content) return;

  for (const item of parseRankedItems(content)) {
    const map = maps[item.category];
    const previousTitles = new Set(previous?.[item.category] ?? []);
    const candidate = map.get(item.title) ?? {
      title: item.title,
      score: 0,
      rating: 0,
      sources: new Set<string>(),
      bestHotRank: Number.POSITIVE_INFINITY,
      repeated: previousTitles.has(item.title),
    };

    candidate.score += points(item.rank);
    candidate.rating = Math.max(candidate.rating, item.rating ?? 0);
    candidate.sources.add(source);
    if (source === "hot") candidate.bestHotRank = Math.min(candidate.bestHotRank, item.rank);
    map.set(item.title, candidate);
  }
}

function selectTopFive(candidates: Candidate[]): string[] {
  const scored = candidates
    .map((candidate) => ({
      ...candidate,
      adjustedScore:
        candidate.score + (candidate.rating > 9 ? 5 : 0) - (candidate.repeated ? 12 : 0),
    }))
    .sort(
      (a, b) =>
        b.adjustedScore - a.adjustedScore ||
        b.rating - a.rating ||
        b.sources.size - a.sources.size ||
        a.bestHotRank - b.bestHotRank ||
        a.title.localeCompare(b.title, "zh-CN")
    );

  const hasEnoughFreshTitles = scored.filter((item) => !item.repeated).length >= 3;
  const selected: typeof scored = [];
  let repeatedCount = 0;

  for (const item of scored) {
    if (selected.length === 5) break;
    if (hasEnoughFreshTitles && item.repeated && repeatedCount >= 2) continue;
    selected.push(item);
    if (item.repeated) repeatedCount += 1;
  }

  if (selected.length < 5) {
    for (const item of scored) {
      if (selected.length === 5) break;
      if (!selected.some((selectedItem) => selectedItem.title === item.title)) selected.push(item);
    }
  }

  if (selected.length !== 5) {
    throw new Error(`Not enough ranking candidates: expected 5, got ${selected.length}`);
  }

  return selected.map((item) => item.title);
}

export function generateDeterministicRanking(
  sources: RankingSources,
  previous: Ranking | null
): Ranking {
  const maps: Record<Category, Map<string, Candidate>> = {
    tvSeries: new Map(),
    movies: new Map(),
  };

  addSource(maps, sources.doubanHot, "hot", (rank) => (rank <= 5 ? 20 : 15), previous);
  addSource(maps, sources.doubanWeekly, "weekly", (rank) => (rank <= 5 ? 15 : 10), previous);
  addSource(maps, sources.doubanKorean, "korean", (rank) => (rank <= 5 ? 15 : 10), previous);
  addSource(maps, sources.doubanGlobalWeekly, "global", (rank) => (rank <= 5 ? 10 : 5), previous);

  return {
    tvSeries: selectTopFive([...maps.tvSeries.values()]),
    movies: selectTopFive([...maps.movies.values()]),
  };
}
