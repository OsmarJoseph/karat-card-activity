import { Module } from '@nestjs/common'
import { ActivityEventBus } from '@/activity/activity-event-bus'

/**
 * Its own module because ingestion publishes and the stream subscribes. Both import
 * this rather than each other, so the write and read sides stay unaware of one another.
 */
@Module({
  providers: [ActivityEventBus],
  exports: [ActivityEventBus],
})
export class ActivityEventsModule {}
