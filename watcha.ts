interface TvRankingResponse {
  metadata: {
    charts: Array<{
      id: string;
      name: string;
      content_type: string;
    }>;
    current_chart_id: string;
  };
  result: {
    prev_uri: string | null;
    next_uri: string | null;
    list_uri: string;
    result: Array<{
      chart_rank: number;
      content: {
        code: string;
        content_type: string;
        title: string;
        year: number;
        poster: {
          hd?: string;
          xlarge?: string;
          large?: string;
          medium?: string;
          small?: string;
        } | null;
        badges: any[];
        on_watchaplay: boolean | null;
        ratings_avg: number;
        current_context: any;
        nations: Array<{
          name: string;
        }>;
        channel_name: string;
        ranking: {
          chart_id: string;
          chart_name: string;
          rank: number;
        };
      };
    }>;
  };
}

const WATCHA_BASE_URL = "https://pedia.watcha.com";
const WATCHA_API_URL = `${WATCHA_BASE_URL}/api`;

const generateDeviceId = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "web-";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const extractCookies = (response: Response): string => {
  const cookies: string[] = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      const cookie = value.split(";")[0];
      cookies.push(cookie);
    }
  });
  return cookies.join("; ");
};

// 获取会话信息
const getSessionInfo = async () => {
  const deviceId = generateDeviceId();
  const initialHeaders = {
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "ko-KR,ko;q=0.9",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "sec-ch-ua":
      '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
  };

  try {
    // 首先访问主页面获取初始 cookie
    const pageResponse = await fetch(`${WATCHA_BASE_URL}/ko-SG/?domain=tv`, {
      headers: initialHeaders,
    });

    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch page: ${pageResponse.status}`);
    }

    const cookies = extractCookies(pageResponse);

    return {
      deviceId,
      cookies,
    };
  } catch (error) {
    console.error("Error getting session info:", error);
    throw error;
  }
};

// 构建请求头
const buildHeaders = (deviceId: string, cookies: string) => {
  return {
    accept: "application/vnd.frograms+json;version=2.1.0",
    "accept-language": "ko-KR,ko;q=0.9",
    "cache-control": "no-cache",
    pragma: "no-cache",
    "sec-ch-ua":
      '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "x-frograms-app-code": "Galaxy",
    "x-frograms-client": "Galaxy-Web-App",
    "x-frograms-client-language": "ko",
    "x-frograms-client-region": "SG",
    "x-frograms-client-version": "2.1.0",
    "x-frograms-device-identifier": deviceId,
    "x-frograms-galaxy-language": "ko",
    "x-frograms-galaxy-region": "SG",
    "x-frograms-version": "2.1.0",
    cookie: cookies,
    referer: `${WATCHA_BASE_URL}/ko-SG/?domain=tv`,
  };
};

const formatContent = (items: TvRankingResponse["result"]["result"]) => {
  return items
    .map((item) => {
      const { content } = item;
      const nation = content.nations[0]?.name || "Unknown";
      const rating = content.ratings_avg.toFixed(1);

      return `${item.chart_rank}. ${content.title} (${content.year})
- Rating: ${rating}/10
- Channel: ${content.channel_name}
- Country: ${nation}`;
    })
    .join("\n\n");
};

export const getTvRankings = async (): Promise<string> => {
  try {
    const { deviceId, cookies } = await getSessionInfo();
    const headers = buildHeaders(deviceId, cookies);

    const response = await fetch(
      `${WATCHA_API_URL}/home/tv/rankings?chart_id=aa&size=10`,
      {
        headers,
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: TvRankingResponse = await response.json();
    return `📺 Watcha TV Rankings\n\n${formatContent(data.result.result)}`;
  } catch (error) {
    console.error("Error fetching Watcha TV rankings:", error);
    return "Failed to fetch TV rankings from Watcha.";
  }
};
