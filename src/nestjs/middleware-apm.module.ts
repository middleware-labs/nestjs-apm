import {
  DynamicModule,
  Global,
  Module,
  OnApplicationShutdown,
  Provider,
} from "@nestjs/common";
import { Config } from "../config";
import { track, sdkShutdown } from "../init";
import { APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { MiddlewareApmInterceptor } from "./middleware-apm.interceptor";
import { middlewareLogger } from "./middleware-apm.logger";

@Global()
@Module({})
export class MiddlewareApmModule implements OnApplicationShutdown {
  static forRoot(config: Partial<Config> = {}): DynamicModule {
    track(config);

    const providers: Provider[] = [
      {
        provide: APP_INTERCEPTOR,
        useClass: MiddlewareApmInterceptor,
      },
      Reflector,
      {
        provide: "MIDDLEWARE_APM_LOGGER",
        useFactory: () => middlewareLogger("MiddlewareAPM"),
      },
    ];

    return {
      module: MiddlewareApmModule,
      global: true,
      providers,
      exports: ["MIDDLEWARE_APM_LOGGER"],
    };
  }

  async onApplicationShutdown(signal?: string) {
    await sdkShutdown();
  }
}
