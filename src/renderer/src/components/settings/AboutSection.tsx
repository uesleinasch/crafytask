import { useEffect, useState } from 'react'
import { Descriptions, theme } from 'antd'
import { SettingsCard } from './SettingsLayout'

const DOCS_URL = 'https://uesleinasch.github.io/crafytask/'

export function AboutSection(): React.JSX.Element {
  const { token } = theme.useToken()
  const [version, setVersion] = useState('')
  const runtime = window.electron.process.versions

  useEffect(() => {
    void window.api.appGetVersion().then(setVersion)
  }, [])

  const mono = { fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' as const }
  const rows: [string, string][] = [
    ['CrafyTask', version],
    ['Electron', runtime.electron ?? ''],
    ['Chromium', runtime.chrome ?? ''],
    ['Node', runtime.node ?? '']
  ]

  return (
    <SettingsCard title="Versões">
      <div style={{ padding: '12px 0' }}>
        <Descriptions
          column={1}
          size="small"
          items={[
            ...rows.map(([label, value]) => ({
              key: label,
              label,
              children: <span style={mono}>{value || '—'}</span>
            })),
            {
              key: 'docs',
              label: 'Documentação',
              children: (
                <a
                  href={DOCS_URL}
                  onClick={(e) => {
                    e.preventDefault()
                    void window.api.appOpenExternal(DOCS_URL)
                  }}
                >
                  uesleinasch.github.io/crafytask
                </a>
              )
            }
          ]}
        />
      </div>
    </SettingsCard>
  )
}
