import { SpendCategory } from '@prisma/client'

/** Total by design: a category without a label fails to compile. */
export const SPEND_CATEGORY_LABELS: Record<SpendCategory, string> = {
  [SpendCategory.food_drink]: 'Food & Drink',
  [SpendCategory.groceries]: 'Groceries',
  [SpendCategory.shopping]: 'Shopping',
  [SpendCategory.transport]: 'Transport',
  [SpendCategory.travel]: 'Travel',
  [SpendCategory.entertainment]: 'Entertainment',
  [SpendCategory.software]: 'Software',
  [SpendCategory.utilities]: 'Utilities',
  [SpendCategory.health]: 'Health',
  [SpendCategory.professional_services]: 'Professional Services',
  [SpendCategory.fees]: 'Fees',
  [SpendCategory.other]: 'Other',
}
