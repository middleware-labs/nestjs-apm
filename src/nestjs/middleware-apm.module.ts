import {
  DynamicModule,
  Global,
  Module,
  OnApplicationShutdown,
  Logger,
} from "@nestjs/common";
import { Config } from "../config";
import { track, sdkShutdown } from "../init";
import { log } from "../logger";
import { errorRecord } from "../init";

@Global()
@Module({})
export class MiddlewareApmModule implements OnApplicationShutdown {
  static forRoot(config: Partial<Config> = {}): DynamicModule {
    // Initialize the APM with the provided config
    track(config);

    // Patch NestJS Logger
    this.patchNestJSLogger();

    return {
      module: MiddlewareApmModule,
      global: true,
    };
  }

  private static patchNestJSLogger() {
    const originalLoggerLog = Logger.prototype.log;
    const originalLoggerError = Logger.prototype.error;
    const originalLoggerWarn = Logger.prototype.warn;
    const originalLoggerDebug = Logger.prototype.debug;
    const originalLoggerVerbose = Logger.prototype.verbose;

    Logger.prototype.log = function (message: any, ...optionalParams: any[]) {
      const context = extractContext(optionalParams);
      log("INFO", message, { context });
      return originalLoggerLog.apply(this, [message, ...optionalParams]);
    };

    Logger.prototype.error = function (message: any, ...optionalParams: any[]) {
      const context = extractContext(optionalParams);

      // Handle error objects
      if (message instanceof Error) {
        errorRecord(message);
        log("ERROR", message.message, {
          context,
          stack: message.stack,
          ...extractErrorMetadata(message),
        });
      } else if (typeof message === "object") {
        const error = new Error(message.message || JSON.stringify(message));
        errorRecord(error);
        log("ERROR", error.message, {
          context,
          ...message,
        });
      } else {
        log("ERROR", message, { context });
      }

      return originalLoggerError.apply(this, [message, ...optionalParams]);
    };

    Logger.prototype.warn = function (message: any, ...optionalParams: any[]) {
      const context = extractContext(optionalParams);
      log("WARN", message, { context });
      return originalLoggerWarn.apply(this, [message, ...optionalParams]);
    };

    Logger.prototype.debug = function (message: any, ...optionalParams: any[]) {
      const context = extractContext(optionalParams);
      log("DEBUG", message, { context });
      return originalLoggerDebug.apply(this, [message, ...optionalParams]);
    };

    Logger.prototype.verbose = function (
      message: any,
      ...optionalParams: any[]
    ) {
      const context = extractContext(optionalParams);
      log("DEBUG", message, { context });
      return originalLoggerVerbose.apply(this, [message, ...optionalParams]);
    };
  }

  async onApplicationShutdown(signal?: string) {
    // Ensure clean shutdown of OpenTelemetry SDK
    await sdkShutdown();
  }
}

function extractContext(optionalParams: any[]): string | undefined {
  if (optionalParams.length === 0) return undefined;

  // Context is typically the last parameter and can be either a string or an object with a name property
  const lastParam = optionalParams[optionalParams.length - 1];

  if (typeof lastParam === "string") {
    return lastParam;
  }

  if (typeof lastParam === "object" && lastParam !== null) {
    // If it's a class instance, try to get the name
    if (lastParam.constructor && lastParam.constructor.name) {
      return lastParam.constructor.name;
    }
    // If it has a name property
    if (lastParam.name) {
      return lastParam.name;
    }
  }

  return undefined;
}

function extractErrorMetadata(error: Error): Record<string, any> {
  const metadata: Record<string, any> = {};

  // Extract custom properties from error object
  Object.getOwnPropertyNames(error).forEach((prop) => {
    if (prop !== "name" && prop !== "message" && prop !== "stack") {
      metadata[prop] = (error as any)[prop];
    }
  });

  return metadata;
}
