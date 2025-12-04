interface PreCodeNodeProps {
  node: {
    language?: string
    code?: string
  }
}

export function PreCodeNode({ node }: PreCodeNodeProps) {
  return (
    <pre className="code-block-node">
      <code className={`language-${node.language || ''}`}>
        {node.code}
      </code>
    </pre>
  )
}
