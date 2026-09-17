export const CROPS = [
  { id: 'carrots', name: 'Carrots', hours: 8, durationMs: 8 * 3_600_000 },
  { id: 'wheat', name: 'Wheat', hours: 8, durationMs: 8 * 3_600_000 },
  { id: 'grape', name: 'Grape', hours: 4, durationMs: 4 * 3_600_000 },
  { id: 'corn', name: 'Corn', hours: 4, durationMs: 4 * 3_600_000 },
  { id: 'sugar_cane', name: 'Sugar cane', hours: 4, durationMs: 4 * 3_600_000 },
  { id: 'apple', name: 'Apple', hours: 4, durationMs: 4 * 3_600_000 },
  { id: 'pineapple', name: 'Pineapple', hours: 4, durationMs: 4 * 3_600_000 },
  { id: 'melon', name: 'Melon', hours: 2, durationMs: 2 * 3_600_000 },
  { id: 'kiwi', name: 'Kiwi', hours: 2, durationMs: 2 * 3_600_000 },
  { id: 'strawberry', name: 'Strawberry', hours: 2, durationMs: 2 * 3_600_000 },
  { id: 'blueberry', name: 'Blueberry', hours: 2, durationMs: 2 * 3_600_000 },
] as const
export type CropId = typeof CROPS[number]['id']
export function getCrop(id: unknown) { return CROPS.find((crop) => crop.id === id) }
export type AlarmInput =
  | { activity: 'champion_stake' | 'grand_master_cup'; label: string; scheduledAt: number }
  | { activity: 'farming'; cropId: CropId; label?: string }
