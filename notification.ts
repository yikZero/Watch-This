import axios from "axios";

export async function sendBarkNotification(title: string, content: string) {
  const BARK_KEY = process.env.BARK_KEY;
  if (!BARK_KEY) {
    console.error("BARK_KEY not found in environment variables");
    return;
  }

  try {
    const response = await axios.post(`https://api.day.app/${BARK_KEY}`, {
      title: title,
      body: content,
      group: "排行榜更新",
    });

    if (response.status === 200) {
      console.log("Bark notification sent successfully");
    }
  } catch (error) {
    console.error("Failed to send Bark notification:", error);
  }
}

export async function sendTelegramNotification(
  message: string,
  chatId?: string | number
) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not found in environment variables");
    return;
  }

  try {
    // 如果没有提供特定的 chatId,则从环境变量中获取默认值
    const TELEGRAM_CHAT_ID = chatId || process.env.TELEGRAM_CHAT_ID;
    if (!TELEGRAM_CHAT_ID) {
      console.error("TELEGRAM_CHAT_ID not found");
      return;
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }
    );

    if (response.status === 200) {
      console.log("Telegram notification sent successfully");
    }
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
  }
}
