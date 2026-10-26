import { z } from 'zod';

import { DASHBOARD_PERIOD_PRESETS } from '@app-types/dashboard';

export const dashboardQuerySchema = z.object({
  storeId: z.string().min(1),
  preset: z
    .enum([
      DASHBOARD_PERIOD_PRESETS.LAST_7_DAYS,
      DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS,
      DASHBOARD_PERIOD_PRESETS.LAST_90_DAYS,
      DASHBOARD_PERIOD_PRESETS.THIS_MONTH,
      DASHBOARD_PERIOD_PRESETS.CUSTOM,
    ])
    .default(DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS),
  from: z.string().optional(),
  to: z.string().optional(),
  sellerUserId: z.string().min(1).optional(),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
