# Watch-This 🎬

一个自动聚合多个渠道的影视剧榜单，生成每周热门影视剧排行的项目。

## 功能特点 ✨

- 自动抓取 Odyssey 和豆瓣（实时热门、华语口碑、全球口碑、热门韩剧）的影视剧数据
- 使用 AI 智能分析生成综合排名（面向中文受众，覆盖韩剧 / 小甜剧）
- 支持电视剧和电影分类排行
- 自动发送 Telegram 通知
- 每周自动更新榜单

## 技术栈 🛠

- TypeScript
- Bun
- Vercel AI SDK 6 + OpenRouter (Claude Sonnet 4.6)
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
bun install
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
bun start
```

## 项目结构 📁

```
Watch-This/
├── index.ts          # 主程序入口
├── odyssey.ts        # Odyssey 数据抓取
├── douban.ts         # 豆瓣数据抓取
├── rssFetcher.ts     # RSS 获取工具
├── rsshub.ts         # RSSHub 配置
├── notification.ts   # Telegram 通知
├── utils.ts          # 工具函数
├── types.ts          # TypeScript 类型定义
├── constants.ts      # 常量配置
├── tsconfig.json     # TypeScript 配置
└── package.json      # 项目配置
```

## 榜单生成规则 📊

1. 数据来源：

   - Odyssey 排行榜（可选）
   - 豆瓣实时热门电影 / 电视剧
   - 豆瓣华语口碑剧集榜（可选）
   - 豆瓣全球口碑剧集榜（可选，覆盖韩 / 日 / 美剧）
   - 豆瓣热门韩剧榜（可选）

2. 评分标准：

   - 豆瓣实时热门：前 5 = 20 分，6-10 = 15 分
   - 豆瓣评分 > 9.0：额外加 5 分
   - 豆瓣华语口碑 / 热门韩剧：前 5 = 15 分，6-10 = 10 分
   - 豆瓣全球口碑：前 5 = 10 分，6-10 = 5 分
   - Odyssey 排名（参考）：前 5 = 5 分，6-10 = 3 分
   - Prompt 显式偏好韩剧 / 小甜剧 / 华语剧，弱化欧美超英和 HBO prestige TV

3. 排名规则：
   - 倾向于出现在多个数据源中的作品
   - 分别生成电视剧和电影排行榜
   - 每个类别展示前 5 名作品

## 许可证 📄

MIT License

## 作者 👤

yikZero
