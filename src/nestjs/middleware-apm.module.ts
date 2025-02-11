import { DynamicModule, Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { Config } from '../config';
import { track, sdkShutdown } from '../init';

@Global()
@Module({})
export class MiddlewareApmModule implements OnApplicationShutdown {
  static forRoot(config: Partial<Config> = {}): DynamicModule {
    // Initialize the APM with the provided config
    track(config);

    return {
      module: MiddlewareApmModule,
      global: true,
    };
  }

  async onApplicationShutdown(signal?: string) {
    // Ensure clean shutdown of OpenTelemetry SDK
    await sdkShutdown();
  }
}
