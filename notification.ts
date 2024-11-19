import axios from "axios";

// 定义按钮接口
interface TelegramButton {
  text: string;
  url: string;
}

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
  buttons?: TelegramButton[],
  chatId?: string | number
) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not found in environment variables");
    return;
  }

  try {
    const TELEGRAM_CHAT_ID = chatId || process.env.TELEGRAM_CHAT_ID;
    if (!TELEGRAM_CHAT_ID) {
      console.error("TELEGRAM_CHAT_ID not found");
      return;
    }

    const requestData: any = {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "Markdown",
    };

    if (buttons && buttons.length > 0) {
      requestData.reply_markup = {
        inline_keyboard: [
          buttons.map((button) => ({
            text: button.text,
            url: button.url,
          })),
        ],
      };
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      requestData
    );

    if (response.status === 200) {
      console.log("Telegram notification sent successfully");
    }
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
  }
}
