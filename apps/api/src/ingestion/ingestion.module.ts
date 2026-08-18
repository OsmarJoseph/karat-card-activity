import { Module } from '@nestjs/common'
import { ActivityRepository } from '@/ingestion/activity.repository'
import { IngestionService } from '@/ingestion/ingestion.service'
import { ProcessorModule } from '@/processor/processor.module'

@Module({
  imports: [ProcessorModule],
  providers: [ActivityRepository, IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
