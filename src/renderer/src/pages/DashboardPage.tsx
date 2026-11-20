import { Flex } from 'antd'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { DashboardNow } from '@renderer/components/dashboard/DashboardNow'
import { DashboardPeriod } from '@renderer/components/dashboard/DashboardPeriod'

export function DashboardPage(): React.JSX.Element {
  return (
    <div className="h-full overflow-y-auto">
      <PageContainer>
        <Flex vertical gap={24}>
          <RegionBoundary region="Agora">
            <DashboardNow />
          </RegionBoundary>
          <RegionBoundary region="No período">
            <DashboardPeriod />
          </RegionBoundary>
        </Flex>
      </PageContainer>
    </div>
  )
}
