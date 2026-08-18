import { Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import { AppConfigService } from '@/config/app-config.service'
import { validateEnv } from '@/config/env.schema'

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Relative to cwd, which the workspace scripts fix at apps/api. This is the
      // same repo-root .env that db:seed passes to Node's --env-file, so every
      // entrypoint reads one file. A missing file is not an error: a deployment
      // injects the environment directly.
      envFilePath: '../../.env',
      validate: validateEnv,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
