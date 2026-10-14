import { describe, expect, it } from 'vitest'

import { parseInline, parseMarkdown, plainText } from './markdown'

describe('parseMarkdown', () => {
  it('parses headings at levels 1-3 and leaves deeper hashes as text', () => {
    const blocks = parseMarkdown('# One\n## Two\n### Three\n#### Four')
    expect(blocks).toEqual([
      { type: 'heading', level: 1, children: [{ type: 'text', value: 'One' }] },
      { type: 'heading', level: 2, children: [{ type: 'text', value: 'Two' }] },
      { type: 'heading', level: 3, children: [{ type: 'text', value: 'Three' }] },
      { type: 'paragraph', children: [{ type: 'text', value: '#### Four' }] },
    ])
  })

  it('joins consecutive lines into one paragraph and splits on blank lines', () => {
    const blocks = parseMarkdown('First line\nsecond line\n\nNext paragraph\r\n')
    expect(blocks).toHaveLength(2)
    const first = blocks[0]
    expect(first?.type).toBe('paragraph')
    expect(plainText(first?.type === 'paragraph' ? first.children : [])).toBe(
      'First line second line',
    )
  })

  it('parses bullet and numbered lists separately', () => {
    const blocks = parseMarkdown('- a\n- b\n1. one\n2) two')
    expect(blocks).toEqual([
      {
        type: 'list',
        ordered: false,
        items: [[{ type: 'text', value: 'a' }], [{ type: 'text', value: 'b' }]],
      },
      {
        type: 'list',
        ordered: true,
        items: [[{ type: 'text', value: 'one' }], [{ type: 'text', value: 'two' }]],
      },
    ])
  })

  it('parses bold and italic', () => {
    expect(parseInline('**bold** and *em* and plain')).toEqual([
      { type: 'strong', children: [{ type: 'text', value: 'bold' }] },
      { type: 'text', value: ' and ' },
      { type: 'em', children: [{ type: 'text', value: 'em' }] },
      { type: 'text', value: ' and plain' },
    ])
  })

  it('leaves unterminated emphasis markers as text', () => {
    expect(parseInline('a ** b')).toEqual([{ type: 'text', value: 'a ** b' }])
  })

  it('accepts https, relative, mailto, tel and hash links', () => {
    for (const href of ['https://x.io/a', '/shop', 'mailto:a@b.co', 'tel:+123', '#shipping']) {
      expect(parseInline(`[go](${href})`)).toEqual([
        { type: 'link', href, children: [{ type: 'text', value: 'go' }] },
      ])
    }
  })

  it('keeps unsafe links as literal text', () => {
    for (const href of ['javascript:alert(1)', 'http://plain.example', 'data:text/html,x']) {
      const nodes = parseInline(`[go](${href})`)
      expect(nodes.every((n) => n.type === 'text')).toBe(true)
      expect(plainText(nodes)).toBe(`[go](${href})`)
    }
  })

  it('treats raw HTML as literal text', () => {
    const blocks = parseMarkdown('<script>alert(1)</script> <b>hi</b>')
    expect(blocks).toEqual([
      {
        type: 'paragraph',
        children: [{ type: 'text', value: '<script>alert(1)</script> <b>hi</b>' }],
      },
    ])
  })
})

describe('protocol-relative links', () => {
  it('treats //host links as plain text', () => {
    const [block] = parseMarkdown('[x](//evil.com)')
    expect(block?.type).toBe('paragraph')
    expect(
      block && block.type === 'paragraph' && block.children.every((n) => n.type === 'text'),
    ).toBe(true)
  })
})
