import axios from "axios";

interface SendTelegramNotificationOptions {
  text: string;
  chatId?: string;
  messageThreadId?: string | number;
  parseMode?: "HTML" | "MarkdownV2" | "Markdown";
  disableLinkPreview?: boolean;
}

interface TelegramSendMessageRequest {
  chat_id: string;
  text: string;
  message_thread_id?: number;
  parse_mode?: "HTML" | "MarkdownV2" | "Markdown";
  link_preview_options?: {
    is_disabled: boolean;
  };
}

interface TelegramSendMessageResponse {
  ok: boolean;
  description?: string;
}

function parseMessageThreadId(value: string | number | undefined): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  const threadId = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(threadId) || threadId <= 0) {
    throw new Error("TELEGRAM_MESSAGE_THREAD_ID must be a positive integer");
  }

  return threadId;
}

export async function sendTelegramNotification({
  text,
  chatId,
  messageThreadId,
  parseMode,
  disableLinkPreview = true,
}: SendTelegramNotificationOptions) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN not found in environment variables");
  }

  const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;
  if (!targetChatId) {
    throw new Error("TELEGRAM_CHAT_ID not found in environment variables");
  }

  const targetMessageThreadId = parseMessageThreadId(
    messageThreadId ?? process.env.TELEGRAM_MESSAGE_THREAD_ID
  );

  const requestData: TelegramSendMessageRequest = {
    chat_id: targetChatId,
    text,
  };

  if (targetMessageThreadId !== undefined) {
    requestData.message_thread_id = targetMessageThreadId;
  }

  if (parseMode) {
    requestData.parse_mode = parseMode;
  }

  if (disableLinkPreview) {
    requestData.link_preview_options = { is_disabled: true };
  }

  try {
    const response = await axios.post<TelegramSendMessageResponse>(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      requestData
    );

    if (!response.data.ok) {
      throw new Error(
        `Telegram API returned error: ${response.data.description ?? "unknown error"}`
      );
    }
  } catch (error) {
    if (axios.isAxiosError<TelegramSendMessageResponse>(error)) {
      const status = error.response?.status;
      const description = error.response?.data?.description ?? error.message;
      throw new Error(
        `Telegram notification failed${status ? ` (${status})` : ""}: ${description}`
      );
    }
    throw error;
  }

  console.log("✅ Telegram notification sent successfully");
}
