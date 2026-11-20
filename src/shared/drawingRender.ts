export const DRAWING_SKELETON_TYPES = [
  'rectangle',
  'ellipse',
  'diamond',
  'text',
  'arrow',
  'line',
  'frame'
] as const

export const DRAWING_SKELETON_LIMIT = 500

export interface DrawingRenderPayload {
  skeleton: Record<string, unknown>[]
  base: string | null
}

export type DrawingRenderResult =
  | { ok: true; drawing: string; preview: Uint8Array | null; elements: number }
  | { ok: false; error: string }
