import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { isExternalHref } from '../domain/common'
import type { BlockNode, InlineNode } from '../domain/markdown'
import { parseMarkdown } from '../domain/markdown'

const HEADING_CLASS: Record<1 | 2 | 3, string> = {
  1: 'text-foreground text-2xl font-semibold tracking-tight',
  2: 'text-foreground text-xl font-semibold tracking-tight',
  3: 'text-foreground text-lg font-semibold',
}

function renderInline(nodes: InlineNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return node.value
      case 'strong':
        return (
          <strong key={index} className="text-foreground font-semibold">
            {renderInline(node.children)}
          </strong>
        )
      case 'em':
        return <em key={index}>{renderInline(node.children)}</em>
      case 'link': {
        const external = isExternalHref(node.href)
        return (
          <a
            key={index}
            href={node.href}
            className="text-foreground underline underline-offset-4"
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {renderInline(node.children)}
          </a>
        )
      }
    }
  })
}

function renderBlock(block: BlockNode, index: number): ReactNode {
  switch (block.type) {
    case 'heading': {
      // Section titles are h1/h2, so body headings start one level down.
      const Tag = (['h2', 'h3', 'h4'] as const)[block.level - 1] ?? 'h4'
      return (
        <Tag key={index} className={HEADING_CLASS[block.level]}>
          {renderInline(block.children)}
        </Tag>
      )
    }
    case 'paragraph':
      return <p key={index}>{renderInline(block.children)}</p>
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag
          key={index}
          className={cn('space-y-2 pl-5', block.ordered ? 'list-decimal' : 'list-disc')}
        >
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </Tag>
      )
    }
  }
}

interface MarkdownBlocksProps {
  body: string
  className?: string
}

/**
 * Renders restricted Markdown as React elements. Nothing is ever injected as HTML;
 * raw tags in the source show up as literal text.
 */
export function MarkdownBlocks({ body, className }: MarkdownBlocksProps) {
  const blocks = parseMarkdown(body)
  if (blocks.length === 0) return null
  return <div className={className}>{blocks.map(renderBlock)}</div>
}
