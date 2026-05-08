// RSS Feed Types
export type RssFeed = object;

export interface RssFeedItem {
  title: string;
  description: string;
  pubDate: string;
}

// Date Range Type
export interface DateRange {
  start: string;
  end: string;
}

// Douban API Types
export interface DoubanSearchResult {
  items: Array<{
    target: {
      id: string;
      title: string;
    };
  }>;
}

export interface DoubanMovieDetail {
  id: string;
  title: string;
  rating: {
    value: number;
  };
}

export interface EnrichedRankingItem {
  name: string;
  rating?: number;
}

// Slack Types
export interface SlackButton {
  text: string;
  url: string;
}

export interface SlackHeaderBlock {
  type: "header";
  text: { type: "plain_text"; text: string; emoji?: boolean };
}

export interface SlackDividerBlock {
  type: "divider";
}

export interface SlackSectionBlock {
  type: "section";
  text: { type: "mrkdwn"; text: string };
}

export interface SlackContextBlock {
  type: "context";
  elements: Array<{ type: "mrkdwn"; text: string }>;
}

export interface SlackActionsBlock {
  type: "actions";
  elements: Array<{
    type: "button";
    text: { type: "plain_text"; text: string; emoji?: boolean };
    url: string;
    action_id?: string;
  }>;
}

export interface RichTextStyle {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
}

export interface RichTextElementText {
  type: "text";
  text: string;
  style?: RichTextStyle;
}

export interface RichTextElementEmoji {
  type: "emoji";
  name: string;
}

export interface RichTextElementLink {
  type: "link";
  url: string;
  text?: string;
  style?: RichTextStyle;
}

export type RichTextInlineElement =
  | RichTextElementText
  | RichTextElementEmoji
  | RichTextElementLink;

export interface RichTextSection {
  type: "rich_text_section";
  elements: RichTextInlineElement[];
}

export interface RichTextList {
  type: "rich_text_list";
  style: "ordered" | "bullet";
  indent?: number;
  elements: RichTextSection[];
}

export interface SlackRichTextBlock {
  type: "rich_text";
  elements: Array<RichTextSection | RichTextList>;
}

export type SlackBlock =
  | SlackHeaderBlock
  | SlackDividerBlock
  | SlackSectionBlock
  | SlackContextBlock
  | SlackActionsBlock
  | SlackRichTextBlock;

export interface SlackPostMessageRequest {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  unfurl_links?: boolean;
  unfurl_media?: boolean;
}

export interface SlackPostMessageResponse {
  ok: boolean;
  error?: string;
  ts?: string;
  channel?: string;
}
