# Watch-This 🎬

一个自动聚合多个渠道的影视剧榜单，生成每周热门影视剧排行的项目。

## 功能特点 ✨

- 自动抓取 Odyssey 和豆瓣的影视剧数据
- 使用 AI 智能分析生成综合排名
- 支持电视剧和电影分类排行
- 自动发送 Telegram 通知
- 每周自动更新榜单

## 技术栈 🛠

- TypeScript
- Node.js
- OpenRouter AI API (Claude 3.7 Sonnet)
- Telegram Bot API
- RSS Parser
- Axios

## 安装说明 📦

1. 克隆项目

```bash
git clone https://github.com/yikZero/Watch-This.git
cd Watch-This
```

2. 安装依赖

```bash
pnpm install
```

3. 配置环境变量
   创建 `.env` 文件并添加以下配置：

```env
OPENROUTER_API_KEY=your_openrouter_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

## 使用方法 🚀

运行项目：

```bash
pnpm tsx index.ts
```

## 项目结构 📁

```
Watch-This/
├── index.ts          # 主程序入口
├── odyssey.ts        # Odyssey 数据抓取
├── douban.ts         # 豆瓣数据抓取
├── notification.ts   # Telegram 通知
├── utils.ts          # 工具函数
└── package.json      # 项目配置
```

## 榜单生成规则 📊

1. 数据来源：

   - Odyssey 排行榜
   - 豆瓣热门榜单

2. 评分标准：

   - 豆瓣排名：前 5 名 = 15 分，6-10 名 = 10 分
   - 豆瓣评分 > 9.0：额外加 5 分
   - Odyssey 排名：前 5 名 = 10 分，6-10 名 = 5 分

3. 排名规则：
   - 作品需至少出现在两个数据源中
   - 分别生成电视剧和电影排行榜
   - 每个类别展示前 5 名作品

## 许可证 📄

MIT License

## 作者 👤

yikZero
