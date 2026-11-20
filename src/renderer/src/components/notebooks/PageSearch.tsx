import { useEffect, useState } from 'react'
import { AutoComplete, Flex, Input, Typography, theme } from 'antd'
import { Search } from 'lucide-react'
import type { PageSearchResult } from '@shared/types'
import { UNTITLED_PAGE } from './notebookUi'

const DEBOUNCE_MS = 250

interface PageSearchProps {
  onOpen: (pageId: number) => void
}

export function PageSearch({ onOpen }: PageSearchProps): React.JSX.Element {
  const { token } = theme.useToken()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PageSearchResult[]>([])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      window.api
        .searchPages(q)
        .then((items) => {
          if (!cancelled) setResults(items)
        })
        .catch((e) => console.error('Falha na busca de páginas:', e))
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const options = results.map((result) => ({
    value: String(result.id),
    label: (
      <Flex vertical gap={2} style={{ minWidth: 0, padding: '2px 0' }}>
        <Flex align="center" gap={6} style={{ minWidth: 0 }}>
          <span className="ct-nb-dot" style={{ background: result.notebook_color }} aria-hidden />
          <span
            className="ct-ellipsis"
            style={{
              fontWeight: 500,
              fontStyle: result.title ? 'normal' : 'italic',
              color: result.title ? undefined : token.colorTextTertiary
            }}
          >
            {result.title || UNTITLED_PAGE}
          </span>
        </Flex>
        <Typography.Text type="secondary" className="ct-ellipsis" style={{ fontSize: 12 }}>
          {result.notebook_name} › {result.section_name}
        </Typography.Text>
        {result.snippet && (
          <Typography.Text
            className="ct-ellipsis"
            style={{ fontSize: 12, color: token.colorTextSecondary }}
          >
            {result.snippet}
          </Typography.Text>
        )}
      </Flex>
    )
  }))

  return (
    <AutoComplete
      value={query}
      onChange={setQuery}
      options={options}
      onSelect={(value: string) => {
        setQuery('')
        onOpen(Number(value))
      }}
      notFoundContent={query.trim() ? 'Nenhuma página encontrada.' : null}
      popupMatchSelectWidth={360}
      style={{ width: '100%' }}
    >
      <Input
        allowClear
        prefix={<Search size={16} strokeWidth={1.75} aria-hidden color={token.colorTextTertiary} />}
        placeholder="Buscar nas páginas"
        aria-label="Buscar nas páginas"
      />
    </AutoComplete>
  )
}
