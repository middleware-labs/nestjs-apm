import { Provider } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MiddlewareApmInterceptor } from "./middleware-apm.interceptor";
import { middlewareLogger } from "./middleware-apm.logger";

/**
 * Provider for the MiddlewareApmInterceptor
 */
export const MiddlewareApmInterceptorProvider: Provider = {
  provide: APP_INTERCEPTOR,
  useClass: MiddlewareApmInterceptor,
};

/**
 * Provider for the MiddlewareApmLogger
 */
export const MiddlewareApmLoggerProvider: Provider = {
  provide: "MIDDLEWARE_APM_LOGGER",
  useFactory: () => middlewareLogger("MiddlewareAPM"),
};

/**
 * All providers for the MiddlewareApm module
 */
export const MiddlewareApmProviders: Provider[] = [
  MiddlewareApmInterceptorProvider,
  MiddlewareApmLoggerProvider,
];
