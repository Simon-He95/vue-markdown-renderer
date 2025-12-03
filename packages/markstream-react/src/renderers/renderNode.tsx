import type { ReactNode } from 'react'
import React from 'react'
import clsx from 'clsx'
import type { ParsedNode } from 'stream-markdown-parser'
import type { RenderContext } from '../types'
import { getCustomNodeComponents } from '../customComponents'

const BLOCK_LEVEL_TYPES = new Set([
  'image',
  'table',
  'code_block',
  'html_block',
  'blockquote',
  'list',
  'list_item',
  'definition_list',
  'footnote',
  'footnote_reference',
  'footnote_anchor',
  'admonition',
  'thematic_break',
  'math_block',
])

function renderChildren(children: ParsedNode[] | undefined, ctx: RenderContext, prefix: string) {
  if (!Array.isArray(children) || children.length === 0)
    return null
  return children.map((child, idx) => renderNode(child, `${prefix}-${idx}`, ctx))
}

function renderInline(children: ParsedNode[] | undefined, ctx: RenderContext, prefix: string) {
  return (
    <>
      {renderChildren(children, ctx, `${prefix}-inline`)}
    </>
  )
}

function renderHtmlBlock(node: any, key: React.Key): ReactNode {
  return (
    <div
      key={key}
      className="html-block-node"
      dangerouslySetInnerHTML={{ __html: node.content ?? node.raw ?? '' }}
    />
  )
}

function renderCodeBlock(node: any, key: React.Key, ctx: RenderContext): ReactNode {
  if (ctx.renderCodeBlocksAsPre) {
    return (
      <pre key={key} className="code-block-node">
        <code className={clsx('language-' + (node.language || ''))}>
          {node.code}
        </code>
      </pre>
    )
  }
  const language = String(node.language || '').toLowerCase()
  if (language === 'mermaid') {
    return (
      <pre key={key} className="code-block-node mermaid-fallback">
        {node.code}
      </pre>
    )
  }

  return (
    <pre key={key} className="code-block-node">
      <code className={clsx('language-' + (node.language || ''))}>
        {node.code}
      </code>
    </pre>
  )
}

function renderTable(node: any, key: React.Key, ctx: RenderContext) {
  return (
    <div key={key} className="table-node overflow-x-auto">
      <table>
        <thead>
          <tr>
            {node.header?.cells?.map((cell: any, idx: number) => (
              <th key={`th-${idx}`} className={clsx({ [`align-${cell.align}`]: cell.align })}>
                {renderInline(cell.children, ctx, `${key}-th-${idx}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {node.rows?.map((row: any, rowIdx: number) => (
            <tr key={`row-${rowIdx}`}>
              {row.cells?.map((cell: any, cellIdx: number) => (
                <td key={`cell-${cellIdx}`} className={clsx({ [`align-${cell.align}`]: cell.align })}>
                  {renderInline(cell.children, ctx, `${key}-row-${rowIdx}-${cellIdx}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderList(node: any, key: React.Key, ctx: RenderContext) {
  const Tag = node.ordered ? 'ol' : 'ul'
  const extraProps = node.ordered && node.start ? { start: node.start } : {}
  return (
    <Tag key={key} {...extraProps}>
      {node.items?.map((item: any, idx: number) => (
        <li key={`${key}-li-${idx}`}>
          {renderChildren(item.children, ctx, `${key}-li-${idx}`)}
        </li>
      ))}
    </Tag>
  )
}

function renderLink(node: any, key: React.Key, ctx: RenderContext) {
  return (
    <a
      key={key}
      href={node.href}
      title={node.title ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="link-node underline decoration-dashed decoration-1 underline-offset-4"
    >
      {renderChildren(node.children, ctx, `${key}-link`)}
    </a>
  )
}

function renderImage(node: any, key: React.Key) {
  return (
    <figure key={key} className="image-node my-6 text-center">
      <img
        src={node.src}
        alt={node.alt ?? ''}
        title={node.title ?? undefined}
        className="inline-block max-w-full rounded-lg"
        loading="lazy"
      />
      {node.alt && (
        <figcaption className="text-sm text-gray-500 mt-2">{node.alt}</figcaption>
      )}
    </figure>
  )
}

function renderFootnote(node: any, key: React.Key, ctx: RenderContext) {
  return (
    <section key={key} className="footnote-node border-l pl-4 my-6 text-sm text-gray-600">
      {renderChildren(node.children, ctx, `${key}-footnote`)}
    </section>
  )
}

function renderAdmonition(node: any, key: React.Key, ctx: RenderContext) {
  return (
    <div key={key} className={clsx('admonition-node border rounded-md px-4 py-3 my-6', `admonition-${node.kind || 'note'}`)}>
      {node.title && <div className="font-semibold mb-2">{node.title}</div>}
      {renderChildren(node.children, ctx, `${key}-admonition`)}
    </div>
  )
}

function renderMath(node: any, key: React.Key, inline: boolean) {
  const content = node.raw ?? node.content ?? ''
  if (inline)
    return <span key={key} className="math-inline-node">{content}</span>
  return <div key={key} className="math-block-node my-4">{content}</div>
}

export function renderNode(node: ParsedNode, key: React.Key, ctx: RenderContext): ReactNode {
  const customComponents = getCustomNodeComponents(ctx.customId)
  const custom = (customComponents as Record<string, any>)[node.type]
  if (custom)
    return React.createElement(custom, { key, node, customId: ctx.customId, isDark: ctx.isDark })

  switch (node.type) {
    case 'text':
      return (
        <span
          key={key}
          className={clsx(
            'text-node whitespace-pre-wrap break-words',
            node.center && 'flex justify-center w-full',
          )}
        >
          {node.content}
        </span>
      )
    case 'paragraph': {
      const result: ReactNode[] = []
      const inlineBuffer: ParsedNode[] = []
      const flushInline = () => {
        if (!inlineBuffer.length)
          return
        const chunkIndex = result.length
        result.push(
          <p key={`${key}-inline-${chunkIndex}`} className="paragraph-node my-5 leading-relaxed">
            {renderChildren(inlineBuffer.slice(), ctx, `${key}-paragraph-${chunkIndex}`)}
          </p>,
        )
        inlineBuffer.length = 0
      }
      node.children?.forEach((child, childIndex) => {
        if (BLOCK_LEVEL_TYPES.has(child.type)) {
          flushInline()
          result.push(
            <React.Fragment key={`${key}-block-${childIndex}`}>
              {renderNode(child, `${key}-block-${childIndex}`, ctx)}
            </React.Fragment>,
          )
        }
        else {
          inlineBuffer.push(child)
        }
      })
      flushInline()
      if (!result.length) {
        return (
          <p key={key} className="paragraph-node my-5 leading-relaxed">
            {renderChildren(node.children, ctx, `${key}-paragraph`)}
          </p>
        )
      }
      return (
        <React.Fragment key={key}>
          {result}
        </React.Fragment>
      )
    }
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.level) || 1))
      const Tag = (`h${level}`) as keyof JSX.IntrinsicElements
      return (
        <Tag key={key} className={clsx('heading-node font-semibold', `heading-${level}`)}>
          {renderChildren(node.children, ctx, `${key}-heading`)}
        </Tag>
      )
    }
    case 'blockquote':
      return (
        <blockquote key={key} className="border-l-4 pl-4 my-4 italic text-gray-700">
          {renderChildren(node.children, ctx, `${key}-blockquote`)}
        </blockquote>
      )
    case 'list':
      return renderList(node, key, ctx)
    case 'table':
      return renderTable(node, key, ctx)
    case 'definition_list':
      return (
        <dl key={key} className="definition-list">
          {node.items?.map((item: any, idx: number) => (
            <div key={`${key}-def-${idx}`} className="mb-4">
              <dt className="font-semibold">{renderChildren(item.term, ctx, `${key}-term-${idx}`)}</dt>
              <dd className="ml-4">{renderChildren(item.definition, ctx, `${key}-defn-${idx}`)}</dd>
            </div>
          ))}
        </dl>
      )
    case 'footnote':
      return renderFootnote(node, key, ctx)
    case 'footnote_reference':
      return <sup key={key} className="footnote-ref">[{node.id}]</sup>
    case 'footnote_anchor':
      return <a key={key} id={`footnote-${node.id}`} className="footnote-anchor" />
    case 'admonition':
      return renderAdmonition(node, key, ctx)
    case 'hardbreak':
      return <br key={key} />
    case 'link':
      return renderLink(node, key, ctx)
    case 'image':
      return renderImage(node, key)
    case 'inline_code':
      return (
        <code key={key} className="inline-code px-1.5 py-0.5 rounded bg-gray-100 text-sm">
          {node.code}
        </code>
      )
    case 'code_block':
      return renderCodeBlock(node, key, ctx)
    case 'strong':
      return <strong key={key}>{renderChildren(node.children, ctx, `${key}-strong`)}</strong>
    case 'emphasis':
      return <em key={key}>{renderChildren(node.children, ctx, `${key}-em`)}</em>
    case 'strikethrough':
      return <s key={key}>{renderChildren(node.children, ctx, `${key}-strike`)}</s>
    case 'highlight':
      return <mark key={key}>{renderChildren(node.children, ctx, `${key}-highlight`)}</mark>
    case 'insert':
      return <ins key={key}>{renderChildren(node.children, ctx, `${key}-insert`)}</ins>
    case 'subscript':
      return <sub key={key}>{renderChildren(node.children, ctx, `${key}-sub`)}</sub>
    case 'superscript':
      return <sup key={key}>{renderChildren(node.children, ctx, `${key}-sup`)}</sup>
    case 'checkbox':
    case 'checkbox_input':
      return (
        <input
          key={key}
          type="checkbox"
          checked={Boolean((node as any).checked)}
          readOnly
          className="checkbox-node mr-2"
        />
      )
    case 'emoji':
      return <span key={key} className="emoji-node">{node.markup ?? node.name}</span>
    case 'thematic_break':
      return <hr key={key} className="my-8 border-t border-muted" />
    case 'math_inline':
      return renderMath(node, key, true)
    case 'math_block':
      return renderMath(node, key, false)
    case 'reference':
      return (
        <span key={key} className="reference-node text-sm text-gray-500">
          [{node.id}]
        </span>
      )
    case 'html_block':
      return renderHtmlBlock(node, key)
    case 'html_inline':
      return renderHtmlBlock(node, key)
    default:
      return (
        <div key={key} className="unknown-node text-sm text-gray-500 italic">
          Unsupported node type: {String((node as any).type)}
        </div>
      )
  }
}
