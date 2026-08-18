import { Global, Module } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

/**
 * Global because every read and write path needs the same pool, and a second
 * PrismaClient would mean a second pool against the same database.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
