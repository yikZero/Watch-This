export function cleanHtml(html: string): string {
  return html
    .replace(/<a[^>]*>|<\/a>/g, "") // 移除所有 a 标签
    .replace(/<img[^>]*>/g, "") // 移除所有 img 标签
    .replace(/<[^>]+>/g, "") // 移除所有其他 HTML 标签
    .replace(/\s+/g, " ") // 将多个空白字符替换为单个空格
    .trim(); // 移除首尾空白
}
