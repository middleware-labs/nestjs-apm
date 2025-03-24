import { Provider } from "@nestjs/common";
import { middlewareLogger } from "./middleware-apm.logger";

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
export const MiddlewareApmProviders: Provider[] = [MiddlewareApmLoggerProvider];
