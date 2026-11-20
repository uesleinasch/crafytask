export interface StepDefinition {
  id: string
  autoDone?: boolean
}

export interface ResolvedStep {
  id: string
  done: boolean
  current: boolean
  manual: boolean
}

export function resolveSteps(steps: StepDefinition[], doneIds: string[]): ResolvedStep[] {
  const lastAutoDone = steps.findLastIndex((step) => step.autoDone === true)
  const resolved = steps.map((step, index) => {
    const implied = step.autoDone === undefined && index < lastAutoDone
    return {
      id: step.id,
      manual: step.autoDone === undefined && !implied,
      done: implied || (step.autoDone ?? doneIds.includes(step.id)),
      current: false
    }
  })
  const current = resolved.find((step) => !step.done)
  if (current) current.current = true
  return resolved
}

export function toggleStepDone(doneIds: string[], id: string): string[] {
  return doneIds.includes(id) ? doneIds.filter((done) => done !== id) : [...doneIds, id]
}
