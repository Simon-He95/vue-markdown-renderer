import type { ReactNode } from 'react'
import React from 'react'
import clsx from 'clsx'
import type { ParsedNode } from 'stream-markdown-parser'
import type { RenderContext } from '../types'
import { getCustomNodeComponents } from '../customComponents'
import { MathInlineNode } from '../components/Math/MathInlineNode'
import { MathBlockNode } from '../components/Math/MathBlockNode'
import { CodeBlockNode as MonacoCodeBlockNode } from '../components/CodeBlockNode/CodeBlockNode'
import { PreCodeNode } from '../components/CodeBlockNode/PreCodeNode'
import { MermaidBlockNode } from '../components/MermaidBlockNode/MermaidBlockNode'
import { ImageNode } from '../components/ImageNode/ImageNode'

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
  'thinking',
])

function tokenAttrsToProps(attrs?: [string, string | null][]) {
  if (!Array.isArray(attrs) || attrs.length === 0)
    return undefined
  return attrs.reduce<Record<string, string | true>>((acc, [name, value]) => {
    if (!name)
      return acc
    const attrName = name === 'for'
      ? 'htmlFor'
      : name === 'class'
        ? 'className'
        : name
    acc[attrName] = value ?? true
    return acc
  }, {})
}

function renderChildren(children: ParsedNode[] | undefined, ctx: RenderContext, prefix: string) {
  if (!Array.isArray(children) || children.length === 0)
    return null

  const result: ReactNode[] = []
  for (let idx = 0; idx < children.length; idx++) {
    const child = children[idx] as ParsedNode & { attrs?: [string, string | null][] }
    if (!child)
      continue
    if (child.type === 'label_open') {
      const labelChildren: ParsedNode[] = []
      idx++
      while (idx < children.length) {
        const segment = children[idx]
        if (segment?.type === 'label_close')
          break
        if (segment)
          labelChildren.push(segment)
        idx++
      }
      const key = `${prefix}-label-${idx}`
      result.push(
        <label key={key} {...tokenAttrsToProps(child.attrs)}>
          {renderChildren(labelChildren, ctx, `${key}-child`)}
        </label>,
      )
      continue
    }
    if (child.type === 'label_close')
      continue
    result.push(renderNode(child, `${prefix}-${idx}`, ctx))
  }
  return result
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
  const language = String(node.language || '').toLowerCase()
  if (language === 'mermaid') {
    const customMermaid = getCustomNodeComponents(ctx.customId).mermaid
    if (customMermaid)
      return React.createElement(customMermaid as any, { key, node, isDark: ctx.isDark })
    if (!ctx.renderCodeBlocksAsPre) {
      return (
        <MermaidBlockNode
          key={key}
          node={node as any}
          isDark={ctx.isDark}
        />
      )
    }
  }

  if (ctx.renderCodeBlocksAsPre || language === 'mermaid') {
    return <PreCodeNode key={key} node={node} />
  }

  return (
    <MonacoCodeBlockNode
      key={key}
      node={node}
      stream={ctx.codeBlockStream}
      darkTheme={ctx.codeBlockThemes?.darkTheme}
      lightTheme={ctx.codeBlockThemes?.lightTheme}
      monacoOptions={ctx.codeBlockThemes?.monacoOptions}
      themes={ctx.codeBlockThemes?.themes}
      minWidth={ctx.codeBlockThemes?.minWidth}
      maxWidth={ctx.codeBlockThemes?.maxWidth}
      isDark={ctx.isDark}
      onCopy={ctx.events.onCopy}
      {...(ctx.codeBlockProps || {})}
    />
  )
}


function renderTable(node: any, key: React.Key, ctx: RenderContext) {
  const headerCells = Array.isArray(node?.header?.cells) ? node.header.cells : []
  const columnCount = headerCells.length || Math.max(1, node?.rows?.[0]?.cells?.length || 0) || 1
  const baseWidth = Math.floor(100 / columnCount)
  const colWidths = Array.from({ length: columnCount }, (_, idx) => {
    if (idx === columnCount - 1)
      return `${100 - baseWidth * (columnCount - 1)}%`
    return `${baseWidth}%`
  })
  const isLoading = Boolean(node?.loading)
  const bodyRows = Array.isArray(node?.rows) ? node.rows : []

  const getAlignClass = (align?: string) => {
    if (align === 'right')
      return 'table-node__cell--right'
    if (align === 'center')
      return 'table-node__cell--center'
    return 'table-node__cell--left'
  }

  return (
    <div key={key} className="table-node-wrapper">
      <table
        className={clsx(
          'table-node w-full my-8 text-sm table-fixed',
          isLoading && 'table-node--loading',
        )}
        aria-busy={isLoading}
      >
        <colgroup>
          {colWidths.map((width, idx) => (
            <col key={`col-${idx}`} style={{ width }} />
          ))}
        </colgroup>
        <thead className="table-node__head">
          <tr>
            {headerCells.map((cell: any, idx: number) => (
              <th
                key={`header-${idx}`}
                className={clsx('table-node__cell table-node__cell--header', getAlignClass(cell.align))}
                dir="auto"
              >
                {renderInline(cell.children, ctx, `${key}-th-${idx}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row: any, rowIdx: number) => (
            <tr
              key={`row-${rowIdx}`}
              className={clsx(
                'table-node__row',
                rowIdx < bodyRows.length - 1 && 'table-node__row--bordered',
              )}
            >
              {row.cells?.map((cell: any, cellIdx: number) => (
                <td
                  key={`cell-${rowIdx}-${cellIdx}`}
                  className={clsx('table-node__cell', getAlignClass(cell.align))}
                  dir="auto"
                >
                  {renderInline(cell.children, ctx, `${key}-row-${rowIdx}-${cellIdx}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {isLoading && (
        <div className="table-node__loading" role="status" aria-live="polite">
          <span className="table-node__spinner" aria-hidden="true" />
          <span className="sr-only">Loading</span>
        </div>
      )}
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
    case 'text_special':
      return (
        <span
          key={key}
          className="text-node whitespace-pre-wrap break-words"
        >
          {(node as any).content ?? ''}
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
      return (
        <ImageNode
          key={key}
          node={node as any}
        />
      )
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
      return <MathInlineNode key={key} node={node as any} />
    case 'math_block':
      return <MathBlockNode key={key} node={node as any} />
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
    case 'label_open':
    case 'label_close':
      return null
    default:
      return (
        <div key={key} className="unknown-node text-sm text-gray-500 italic">
          Unsupported node type: {String((node as any).type)}
        </div>
      )
  }
}
