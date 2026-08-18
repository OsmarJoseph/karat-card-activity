import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { requireEnv } from '@/config/env'

/**
 * Prisma 7 talks to Postgres through a driver adapter rather than its own
 * engine, so the pool lives here and its lifetime is tied to the Nest module.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    super({
      // Read straight from the environment for now. The config module in the
      // next phase owns validated settings and will inject this instead.
      adapter: new PrismaPg({ connectionString: requireEnv('DATABASE_URL') }),
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
