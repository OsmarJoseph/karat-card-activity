import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@/config/config.module'
import { PrismaService } from '@/prisma/prisma.service'

/**
 * Global because every read and write path needs the same pool, and a second
 * PrismaClient would mean a second pool against the same database.
 */
@Global()
@Module({
  // Imported explicitly rather than relying on a global, so the dependency on
  // configuration is visible in the module graph.
  imports: [ConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
