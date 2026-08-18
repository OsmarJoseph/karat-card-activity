import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { AppConfigService } from '@/config/app-config.service'

/**
 * Prisma 7 talks to Postgres through a driver adapter rather than its own engine,
 * so the pool lives here and its lifetime is tied to the Nest module.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor(config: AppConfigService) {
    super({
      adapter: new PrismaPg({ connectionString: config.databaseUrl }),
    })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
    this.logger.log('Connected to Postgres')
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
