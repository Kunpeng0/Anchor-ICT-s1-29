// refers to data point returned by event volume endpoint
export interface EventVolumePoint {
    period: string          // refers to either date string for daily, or week string for weekly
    event_count: number     // refers to how many events occurred in that period
}

// types of period
export type PeriodType = 'daily' | 'weekly'