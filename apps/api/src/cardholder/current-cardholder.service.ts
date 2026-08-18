import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { AppConfigService } from '@/config/app-config.service'
import { PrismaService } from '@/prisma/prisma.service'

/**
 * The "no login, one cardholder from config" constraint lives here alone, so real
 * authentication replaces this service instead of touching every query.
 */
@Injectable()
export class CurrentCardholderService {
  private cachedId: string | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async resolveId(): Promise<string> {
    if (this.cachedId !== null) {
      return this.cachedId
    }

    const stripeId = this.config.cardholderStripeId
    const cardholder = await this.prisma.cardholder.findUnique({
      where: { stripeId },
      select: { id: true },
    })
    if (!cardholder) {
      throw new InternalServerErrorException(
        `Cardholder ${stripeId} is not in the database. Run npm run db:seed.`,
      )
    }

    // Only a hit is cached, so seeding fixes a miss without a restart.
    this.cachedId = cardholder.id
    return cardholder.id
  }
}
