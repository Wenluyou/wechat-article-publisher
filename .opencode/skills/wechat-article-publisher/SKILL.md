---
name: wechat-article-publisher
description: 微信公众号文章自动发布系统 - AI生成/RSS改写文章并发布到公众号
metadata:
  stack: "Express, TypeScript, OpenAI, node-cron, EJS"
  port: "3000"
---

## 项目概述

基于 Express + TypeScript 的微信公众号文章自动发布系统。

## 快速命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (localhost:3000) |
| `npm run build` | TypeScript 编译 |
| `npm run start` | 运行编译后的代码 |

## 配置 (.env)

```
# AI 写作 (Agnes AI, 兼容 OpenAI API)
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://apihub.agnes-ai.com/v1
DEEPSEEK_MODEL=agnes-2.0-flash

# AI 配图 (Agnes Image API)
AGNES_IMAGE_API_KEY=sk-xxx
AGNES_IMAGE_BASE_URL=https://apihub.agnes-ai.com
AGNES_IMAGE_MODEL=agnes-image-2.1-flash

# 微信公众号
WECHAT_APPID=your_appid
WECHAT_APPSECRET=your_appsecret

PORT=3000
```

## 项目结构

```
src/
  index.ts          - Express 入口, 路由注册
  config.ts         - 配置加载 (.env + config/*.json)
  types.ts          - 类型定义
  generator/
    ai.ts           - AI 调用 OpenAI SDK 生成/改写文章
    image.ts        - 调用 Agnes Image API 生成配图
    rss.ts          - RSS 源抓取
  publisher/
    index.ts        - 发布流程: 格式化->建草稿->发布->轮询状态
    wechat-client.ts - 微信公众平台 API 封装 (token/draft/publish)
    formatter.ts    - Markdown 转微信公众号 HTML
  scheduler/
    index.ts        - node-cron 定时调度: 按队列/主题/RSS/兜底
  storage/
    index.ts        - 文件存储 (articles/{drafts,published,failed}/*.md)
  routes/
    dashboard.ts    - GET / 仪表盘
    articles.ts     - GET/POST /articles 文章 CRUD/生成/发布
    settings.ts     - GET/POST /settings RSS源/定时配置
  utils/
    logger.ts
```

## 核心工作流

### AI 生成文章
1. 用户输入主题或大纲
2. `generator/ai.ts` 调用 Agnes AI (OpenAI 兼容) 生成 Markdown 文章
3. 保存到 `articles/drafts/` 目录

### 发布流程
1. `publisher/formatter.ts` Markdown -> 微信 HTML
2. `publisher/wechat-client.ts` 调用微信 API: 创建草稿 -> 提交发布 -> 轮询结果
3. 更新文章状态到 `published` 或 `failed`

### 定时任务
1. 每天按 cron 执行: 先发布队列文章 -> 按主题生成 -> RSS 改写 -> 兜底话题
2. 配置保存在 `config/schedule.json`

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 仪表盘 |
| GET | /articles | 文章列表 |
| GET | /articles/:id | 查看文章详情 |
| POST | /articles/generate | AI 生成 (body: topic/outline) |
| POST | /articles/manual | 手动创建 (body: title/content) |
| POST | /articles/:id/publish | 发布到公众号 |
| POST | /articles/:id/delete | 删除文章 |
| POST | /articles/image/generate | 生成配图 |
| GET/POST | /settings | 设置页面 |

## 注意事项

- AI 生成约需 30-60 秒，浏览器会等待
- 图片 API 和聊天 API 是独立的两个 Key (可以共用)
- 定时任务默认禁用，需在 Settings 页面启用
