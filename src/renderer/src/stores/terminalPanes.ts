export interface PaneLayout {
  groups: string[][]
  activeId: string | null
}

export const EMPTY_LAYOUT: PaneLayout = { groups: [], activeId: null }

export function groupOf(layout: PaneLayout, id: string | null): string[] | null {
  if (!id) return null
  return layout.groups.find((group) => group.includes(id)) ?? null
}

export function reconcileLayout(ids: string[], layout: PaneLayout): PaneLayout {
  const known = new Set(layout.groups.flat())
  const groups = layout.groups
    .map((group) => group.filter((id) => ids.includes(id)))
    .filter((group) => group.length > 0)
  for (const id of ids) if (!known.has(id)) groups.push([id])
  const activeId =
    layout.activeId && ids.includes(layout.activeId) ? layout.activeId : (groups[0]?.[0] ?? null)
  return { groups, activeId }
}

export function addSession(layout: PaneLayout, id: string): PaneLayout {
  return { groups: [...layout.groups, [id]], activeId: id }
}

export function splitActive(layout: PaneLayout, id: string): PaneLayout {
  const target = groupOf(layout, layout.activeId)
  if (!target || !layout.activeId) return addSession(layout, id)
  const anchor = layout.activeId
  return {
    groups: layout.groups.map((group) => {
      if (group !== target) return group
      const next = [...group]
      next.splice(group.indexOf(anchor) + 1, 0, id)
      return next
    }),
    activeId: id
  }
}

export function activate(layout: PaneLayout, id: string): PaneLayout {
  return groupOf(layout, id) ? { ...layout, activeId: id } : layout
}

export function removeSession(layout: PaneLayout, id: string): PaneLayout {
  const groupIndex = layout.groups.findIndex((group) => group.includes(id))
  if (groupIndex === -1) return layout
  const group = layout.groups[groupIndex]
  const rest = group.filter((other) => other !== id)
  const groups = rest.length
    ? layout.groups.map((g, i) => (i === groupIndex ? rest : g))
    : layout.groups.filter((_, i) => i !== groupIndex)
  if (layout.activeId !== id) return { groups, activeId: layout.activeId }
  if (rest.length) return { groups, activeId: rest[Math.max(group.indexOf(id) - 1, 0)] }
  const neighbor = groups[Math.min(groupIndex, groups.length - 1)]
  return { groups, activeId: neighbor?.[0] ?? null }
}

export function replaceSession(layout: PaneLayout, oldId: string, newId: string): PaneLayout {
  return {
    groups: layout.groups.map((group) => group.map((id) => (id === oldId ? newId : id))),
    activeId: layout.activeId === oldId ? newId : layout.activeId
  }
}

export function detachSession(layout: PaneLayout, id: string): PaneLayout {
  const groupIndex = layout.groups.findIndex((group) => group.includes(id))
  if (groupIndex === -1 || layout.groups[groupIndex].length < 2) return layout
  const groups = layout.groups.flatMap((group, i) =>
    i === groupIndex ? [group.filter((other) => other !== id), [id]] : [group]
  )
  return { groups, activeId: id }
}
