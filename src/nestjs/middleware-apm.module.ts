import {
  DynamicModule,
  Global,
  Module,
  OnApplicationShutdown,
  Provider,
} from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { Config } from "../config";
import { track, sdkShutdown } from "../init";
import { Reflector } from "@nestjs/core";
import { middlewareLogger } from "./middleware-apm.logger";
import { MiddlewareApmInterceptor } from "./middleware-apm.interceptor";

@Global()
@Module({})
export class MiddlewareApmModule implements OnApplicationShutdown {
  static forRoot(config: Partial<Config> = {}): DynamicModule {
    track(config);

    const providers: Provider[] = [
      Reflector,
      {
        provide: "MIDDLEWARE_APM_LOGGER",
        useFactory: () => middlewareLogger("MiddlewareAPM"),
      },
      {
        provide: APP_INTERCEPTOR,
        useClass: MiddlewareApmInterceptor,
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
