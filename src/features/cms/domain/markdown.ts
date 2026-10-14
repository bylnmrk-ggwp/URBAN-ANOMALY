/**
 * Restricted Markdown parser. Produces a small AST that the renderer turns into React
 * elements, so stored content is never injected as HTML. Supported: `#`/`##`/`###`
 * headings, paragraphs, `-` lists, `1.` lists, **bold**, *italic*, [links](https://…).
 * Raw HTML is treated as literal text.
 */

export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'strong'; children: InlineNode[] }
  | { type: 'em'; children: InlineNode[] }
  | { type: 'link'; href: string; children: InlineNode[] }

export type BlockNode =
  | { type: 'heading'; level: 1 | 2 | 3; children: InlineNode[] }
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'list'; ordered: boolean; items: InlineNode[][] }

const SAFE_LINK = /^(https:\/\/[^\s)]+|\/(?!\/)[^\s)]*|mailto:[^\s)]+|tel:[^\s)]+|#[a-z0-9-]+)$/i

export function parseInline(src: string): InlineNode[] {
  const nodes: InlineNode[] = []
  let text = ''
  let i = 0
  const flush = () => {
    if (text) nodes.push({ type: 'text', value: text })
    text = ''
  }
  while (i < src.length) {
    if (src.startsWith('**', i)) {
      const end = src.indexOf('**', i + 2)
      if (end > i + 2) {
        flush()
        nodes.push({ type: 'strong', children: parseInline(src.slice(i + 2, end)) })
        i = end + 2
        continue
      }
    }
    if (src[i] === '*') {
      const end = src.indexOf('*', i + 1)
      if (end > i + 1) {
        flush()
        nodes.push({ type: 'em', children: parseInline(src.slice(i + 1, end)) })
        i = end + 1
        continue
      }
    }
    if (src[i] === '[') {
      const close = src.indexOf('](', i)
      const end = close === -1 ? -1 : src.indexOf(')', close + 2)
      if (close > i && end > close) {
        const href = src.slice(close + 2, end).trim()
        const label = src.slice(i + 1, close)
        if (SAFE_LINK.test(href)) {
          flush()
          nodes.push({ type: 'link', href, children: parseInline(label) })
          i = end + 1
          continue
        }
      }
    }
    text += src[i]
    i += 1
  }
  flush()
  return nodes
}

export function parseMarkdown(src: string): BlockNode[] {
  const blocks: BlockNode[] = []
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', children: parseInline(paragraph.join(' ')) })
      paragraph = []
    }
  }
  const flushList = () => {
    if (list) {
      blocks.push({ type: 'list', ordered: list.ordered, items: list.items.map(parseInline) })
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      const level = heading[1]!.length as 1 | 2 | 3
      blocks.push({ type: 'heading', level, children: parseInline(heading[2] ?? '') })
      continue
    }
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (bullet || numbered) {
      flushParagraph()
      const ordered = Boolean(numbered)
      const item = (bullet ?? numbered)![1] ?? ''
      if (list && list.ordered !== ordered) flushList()
      if (!list) list = { ordered, items: [] }
      list.items.push(item)
      continue
    }
    flushList()
    paragraph.push(line.trim())
  }
  flushParagraph()
  flushList()
  return blocks
}

export function plainText(nodes: InlineNode[]): string {
  return nodes.map((n) => (n.type === 'text' ? n.value : plainText(n.children))).join('')
}
