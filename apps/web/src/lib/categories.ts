import { SpendBreakdownItemCategory } from '@/api/generated'

/**
 * A colour per spend category, as a total record so a category added to the schema fails
 * to compile rather than reaching the chart with no colour. Charts need raw values rather
 * than utility classes, so these read the same tokens through CSS variables.
 */
export const CATEGORY_COLORS: Record<SpendBreakdownItemCategory, string> = {
  [SpendBreakdownItemCategory.food_drink]: 'var(--color-cat-1)',
  [SpendBreakdownItemCategory.groceries]: 'var(--color-cat-2)',
  [SpendBreakdownItemCategory.shopping]: 'var(--color-cat-3)',
  [SpendBreakdownItemCategory.transport]: 'var(--color-cat-4)',
  [SpendBreakdownItemCategory.travel]: 'var(--color-cat-5)',
  [SpendBreakdownItemCategory.entertainment]: 'var(--color-cat-6)',
  [SpendBreakdownItemCategory.software]: 'var(--color-cat-7)',
  [SpendBreakdownItemCategory.utilities]: 'var(--color-cat-8)',
  [SpendBreakdownItemCategory.health]: 'var(--color-cat-9)',
  [SpendBreakdownItemCategory.professional_services]: 'var(--color-cat-10)',
  [SpendBreakdownItemCategory.fees]: 'var(--color-cat-11)',
  [SpendBreakdownItemCategory.other]: 'var(--color-cat-12)',
}
