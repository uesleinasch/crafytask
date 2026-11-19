import { useState, useCallback, useMemo } from 'react'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/textarea'
import { useWeeklyReview } from '@renderer/hooks/useWeeklyReview'
import {
  ClipboardCheck,
  CirclePause,
  CheckCircle2,
  Circle,
  Inbox,
  FolderKanban,
  Hourglass,
  Calendar,
  Lightbulb,
  Clock,
  History,
  Sparkles,
  Cloud
} from 'lucide-react'
import { App, Button as AntButton, Flex, Spin } from 'antd'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { ReviewEntry } from '@renderer/components/review/ReviewEntry'
import { cn } from '@renderer/lib/utils'
import { HealthCard, HealthGrid } from '@renderer/components/health/HealthCard'
import { useNavigate } from 'react-router-dom'
import { HEALTH_TARGETS, REVIEW_HEALTH, healthItems } from '@renderer/components/health/healthItems'
import type { ReviewStepKey } from '@shared/types'
import { reviewStepsWith } from '@shared/reviewSteps'
import { parseSqlTime } from '@shared/healthLimits'

interface ChecklistItem {
  id: ReviewStepKey
  label: string
  description: string
  icon: React.ElementType
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'collect',
    label: 'Coletar itens soltos',
    description: 'Reúna papéis, recibos, notas e pensamentos que ficaram fora do sistema.',
    icon: Inbox
  },
  {
    id: 'inbox',
    label: 'Processar Inbox',
    description: 'Alcance Inbox Zero — classifique cada item: ação, projeto, referência ou lixo.',
    icon: ClipboardCheck
  },
  {
    id: 'mind',
    label: 'Esvaziar a cabeça',
    description: 'O que ainda está ocupando sua cabeça? Anote tudo o que aparecer.',
    icon: Cloud
  },
  {
    id: 'next',
    label: 'Revisar Próximas Ações',
    description: 'As próximas ações ainda são relevantes? Alguma pode ser concluída ou removida?',
    icon: Calendar
  },
  {
    id: 'past',
    label: 'Olhar a semana que passou',
    description: 'Reuniões, sessões e entregas dos últimos 7 dias geraram alguma ação?',
    icon: History
  },
  {
    id: 'upcoming',
    label: 'Revisar Calendário',
    description: 'O que vem nas próximas duas semanas? Precisa preparar algo?',
    icon: Clock
  },
  {
    id: 'waiting',
    label: 'Revisar Aguardando',
    description: 'Alguém respondeu? Precisa fazer follow-up em algo pendente?',
    icon: Hourglass
  },
  {
    id: 'projects',
    label: 'Revisar Projetos',
    description: 'Cada projeto ativo tem progresso? Existe próxima ação definida?',
    icon: FolderKanban
  },
  {
    id: 'someday',
    label: 'Revisar Someday/Maybe',
    description: 'Algum item está pronto para ser ativado? Algum pode ser descartado?',
    icon: Lightbulb
  },
  {
    id: 'creative',
    label: 'Pensamento Criativo',
    description: 'Que mais precisa de atenção? Novos projetos ou ideias?',
    icon: Sparkles
  }
]

export function WeeklyReviewPage(): React.JSX.Element {
  const navigate = useNavigate()
  const {
    currentReview,
    reviews,
    healthIndicators,
    loading,
    startReview,
    saveNotes,
    setStep,
    discardReview,
    completeReview
  } = useWeeklyReview()
  const { message } = App.useApp()
  const [resumedId, setResumedId] = useState<number | null>(null)

  const [notes, setNotes] = useState('')
  const reviewId = currentReview?.id
  const savedNotes = currentReview?.notes ?? ''

  const [notesReviewId, setNotesReviewId] = useState<number | undefined>(undefined)
  if (reviewId !== notesReviewId) {
    setNotesReviewId(reviewId)
    setNotes(savedNotes)
  }

  const openHealthTarget = useCallback(
    async (route: string): Promise<void> => {
      if (reviewId && notes !== savedNotes) await saveNotes(notes)
      void navigate(route)
    },
    [reviewId, notes, savedNotes, saveNotes, navigate]
  )

  const steps = useMemo(() => currentReview?.steps ?? {}, [currentReview?.steps])
  const completedCount = reviewStepsWith(steps, 'done').length
  const totalItems = currentReview?.step_total ?? CHECKLIST_ITEMS.length
  const pendingCount = totalItems - completedCount
  const allCompleted = pendingCount <= 0

  const handleStartReview = useCallback(async (): Promise<void> => {
    const review = await startReview()
    setResumedId(review.id)
    message.success('Revisão semanal iniciada')
  }, [startReview, message])

  const handlePause = useCallback(async (): Promise<void> => {
    if (notes !== savedNotes) await saveNotes(notes)
    setResumedId(null)
  }, [notes, savedNotes, saveNotes])

  const handleDiscardReview = useCallback(async (): Promise<void> => {
    await discardReview()
    message.success('Revisão descartada')
  }, [discardReview, message])

  const toggleChecklistItem = useCallback(
    async (itemId: ReviewStepKey): Promise<void> => {
      await setStep(itemId, steps[itemId] === 'done' ? null : 'done')
    },
    [steps, setStep]
  )

  const handleCompleteReview = useCallback(async (): Promise<void> => {
    await completeReview(notes || undefined)
    setNotes('')
    message.success('Revisão semanal concluída')
  }, [completeReview, notes, message])

  const formatDate = (dateStr: string): string => {
    return parseSqlTime(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Flex justify="center" align="center" className="h-full">
        <Spin />
      </Flex>
    )
  }

  if (!currentReview || resumedId !== currentReview.id) {
    return (
      <div className="h-full overflow-y-auto">
        <PageContainer>
          <ReviewEntry
            openReview={currentReview}
            reviews={reviews}
            health={healthIndicators}
            onStart={() => void handleStartReview()}
            onResume={() => currentReview && setResumedId(currentReview.id)}
            onDiscard={handleDiscardReview}
            onOpenHealth={(route) => void navigate(route)}
          />
        </PageContainer>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      <ScrollArea className="flex-1 h-0">
        <div className="max-w-3xl mx-auto p-6 space-y-6 pb-24">
          <>
            {/* Active Review */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Revisão em andamento</p>
                  <p className="text-xs text-emerald-600">
                    Iniciada em {formatDate(currentReview.started_at)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <AntButton
                    size="small"
                    icon={<CirclePause size={14} strokeWidth={1.75} aria-hidden />}
                    onClick={() => void handlePause()}
                  >
                    Pausar
                  </AntButton>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-800">
                      {completedCount}/{totalItems}
                    </p>
                    <p className="text-xs text-emerald-600">itens concluídos</p>
                  </div>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="mt-3 h-2 bg-emerald-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(completedCount / totalItems) * 100}%` }}
                />
              </div>
            </div>

            {/* Health Indicators */}
            {healthIndicators && (
              <HealthGrid>
                {healthItems(healthIndicators, REVIEW_HEALTH).map((item) => (
                  <HealthCard
                    key={item.key}
                    item={item}
                    openLabel={HEALTH_TARGETS[item.key].cta}
                    onOpen={() => void openHealthTarget(HEALTH_TARGETS[item.key].route)}
                  />
                ))}
              </HealthGrid>
            )}

            {/* Checklist */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                Checklist da Revisão
              </h3>
              {CHECKLIST_ITEMS.map((item) => {
                const checked = steps[item.id] === 'done'
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={cn(
                      'w-full flex items-start gap-4 bg-white border rounded-sm p-4 text-left transition-all',
                      checked
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="mt-0.5">
                      {checked ? (
                        <CheckCircle2 size={20} className="text-emerald-500" />
                      ) : (
                        <Circle size={20} className="text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon
                          size={14}
                          className={checked ? 'text-emerald-600' : 'text-slate-500'}
                        />
                        <p
                          className={cn(
                            'text-sm font-semibold',
                            checked ? 'text-emerald-800 line-through' : 'text-slate-900'
                          )}
                        >
                          {item.label}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Notes & Complete */}
            <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">Notas da Revisão</h4>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações, insights, próximos passos..."
                rows={3}
                className="border-slate-200 resize-none"
              />
              <Button
                onClick={handleCompleteReview}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {allCompleted
                  ? 'Concluir Revisão Semanal'
                  : `Concluir com ${pendingCount} ${pendingCount === 1 ? 'passo pulado' : 'passos pulados'}`}
              </Button>
            </div>
          </>
        </div>
      </ScrollArea>
    </div>
  )
}
