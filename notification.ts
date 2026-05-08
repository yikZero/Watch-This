import axios from "axios";
import { SlackBlock, SlackPostMessageRequest, SlackPostMessageResponse } from "./types.ts";

interface SendSlackNotificationOptions {
  text: string;
  blocks?: SlackBlock[];
  channel?: string;
  unfurlLinks?: boolean;
}

export async function sendSlackNotification({
  text,
  blocks,
  channel,
  unfurlLinks = false,
}: SendSlackNotificationOptions) {
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  if (!SLACK_BOT_TOKEN) {
    console.error("SLACK_BOT_TOKEN not found in environment variables");
    return;
  }

  const SLACK_CHANNEL = channel || process.env.SLACK_CHANNEL;
  if (!SLACK_CHANNEL) {
    console.error("SLACK_CHANNEL not found");
    return;
  }

  try {
    const requestData: SlackPostMessageRequest = {
      channel: SLACK_CHANNEL,
      text,
      unfurl_links: unfurlLinks,
      unfurl_media: unfurlLinks,
    };

    if (blocks && blocks.length > 0) {
      requestData.blocks = blocks;
    }

    const response = await axios.post<SlackPostMessageResponse>(
      "https://slack.com/api/chat.postMessage",
      requestData,
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );

    if (response.data.ok) {
      console.log("✅ Slack notification sent successfully");
    } else {
      console.error("❌ Slack API returned error:", response.data.error);
    }
  } catch (error) {
    console.error("❌ Failed to send Slack notification:", error);
  }
}
