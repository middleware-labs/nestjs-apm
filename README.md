# Middleware NestJS APM

## Introduction

@middleware.io/nestjs-apm is the official Middleware APM client for NestJS applications that automatically instruments your application with OpenTelemetry, sending runtime metrics, traces/spans, and console logs to [Middleware.io](https://middleware.io/).

## Installation

```bash
npm install @middleware.io/nestjs-apm
```

## Usage

Import the MiddlewareApmModule in your app.module.ts:

```typescript
import { MiddlewareApmModule } from "@middleware.io/nestjs-apm";

@Module({
  imports: [
    MiddlewareApmModule.forRoot({
      projectName: "Your application name",
      serviceName: "Your service name",
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

## Features

- Automatic instrumentation of NestJS controllers and services
- Console log capture (info, warn, error)
- Automatic Pino log collection via OpenTelemetry
- Distributed tracing
- Performance metrics
- Error tracking
- Custom span attributes
- Advanced instrumentation decorators
- OpenTelemetry log integration
- Exception tracking with OTEL events

## Basic Usage

### Ignoring Routes

You can use the `@IgnoreApmTrace()` decorator to exclude specific routes from OpenTelemetry tracing and prevent them from being exported:

```typescript
import { IgnoreApmTrace } from "@middleware.io/nestjs-apm";

@Controller("users")
export class UsersController {
  // This endpoint will not create or export any OpenTelemetry traces
  @IgnoreApmTrace()
  @Get("health")
  healthCheck() {
    return "OK";
  }

  // This endpoint will still be traced normally
  @Get(":id")
  getUser(@Param("id") id: string) {
    return { id, name: "John Doe" };
  }
}
```

The `@IgnoreApmTrace()` decorator can be applied to individual methods or entire controllers:

```typescript
// Ignore tracing for the entire controller
@IgnoreApmTrace()
@Controller("internal")
export class InternalController {
  @Get("status")
  getStatus() {
    return "Internal status";
  }

  @Get("metrics")
  getMetrics() {
    return "Internal metrics";
  }
}
```

#### Alternative: Manual Route Registration

You can also manually register routes to be ignored using the `registerIgnoredRoutes` function:

```typescript
import { registerIgnoredRoutes } from "@middleware.io/nestjs-apm";

// In your application initialization
registerIgnoredRoutes([
  '/health',
  '/metrics', 
  '/status',
  '/users/:id/health', // Routes with parameters
  '/internal/*'        // Wildcard patterns
]);
```

This approach is useful when you want to:
- Configure ignored routes in one central location
- Ignore routes that don't use decorators
- Set up ignored routes during application bootstrap

#### ⚠️ Performance Recommendation

**For production applications, we recommend using `registerIgnoredRoutes()` instead of `@IgnoreApmTrace()` for better performance.**

**Why `registerIgnoredRoutes()` is more efficient:**
- **Prevents span creation entirely** at the HTTP instrumentation level
- **Lower CPU overhead** - no reflection or span manipulation needed
- **Better for high-traffic routes** like health checks and metrics endpoints
- **Earlier filtering** - operates before NestJS request processing

**When to use `@IgnoreApmTrace()`:**
- For fine-grained, method-level control
- When ignored routes are not high-traffic
- For development or low-traffic scenarios

```typescript
// ✅ Recommended for production (better performance)
registerIgnoredRoutes(['/health', '/metrics', '/status']);

// ⚠️ Use sparingly for high-traffic routes
@IgnoreApmTrace()
@Get('health')
healthCheck() { ... }
```

## Advanced Instrumentation

### Custom Attributes

Add custom attributes to spans:

```typescript
import { WithAttributes } from "@middleware.io/nestjs-apm";

@Controller("orders")
export class OrdersController {
  @WithAttributes({ "business.type": "order", "business.tier": "premium" })
  @Post()
  createOrder() {
    // Your code here
  }
}
```

### Custom Spans

Create custom spans with specific names and attributes:

```typescript
import { CreateSpan } from "@middleware.io/nestjs-apm";

@Injectable()
export class UserService {
  @CreateSpan("user.registration", { "user.type": "new" })
  async registerUser(userData: any) {
    // Your code here
  }
}
```

### Parameter Recording

Automatically record method parameters as span attributes:

```typescript
import { RecordParams } from "@middleware.io/nestjs-apm";

@Controller("users")
export class UsersController {
  @RecordParams(["userId", "action"])
  @Post(":userId/action")
  performAction(userId: string, action: string) {
    // Parameters will be recorded as span attributes
  }
}
```

### Logging Integration

The module automatically records all NestJS logger output to OpenTelemetry. Just use the standard NestJS logger:

```typescript
import { Logger, Injectable } from "@nestjs/common";

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async createUser(userData: any) {
    try {
      this.logger.log("Creating new user", { userId: userData.id });
      // ... user creation logic
    } catch (error) {
      this.logger.error("Failed to create user", error);
      throw error;
    }
  }
}
```

### Pino Logging Integration

The module automatically instruments Pino loggers using OpenTelemetry instrumentation. When you install and use Pino in your NestJS application, logs will be automatically collected and sent to Middleware.io with proper trace correlation.

**Automatic Collection**: When you use Pino in your NestJS application, logs will automatically be collected:

```typescript
// First install Pino in your application
// npm install pino

import pino from 'pino';

const logger = pino();

@Injectable()
export class UserService {
  async createUser(userData: any) {
    logger.info({ userId: userData.id }, 'Creating new user');
    
    try {
      // ... user creation logic
      logger.info({ userId: userData.id }, 'User created successfully');
    } catch (error) {
      logger.error({ userId: userData.id, error }, 'Failed to create user');
      throw error;
    }
  }
}
```

**Advanced Pino Usage**: The instrumentation supports all Pino features including structured logging:

```typescript
// First install Pino in your application
// npm install pino

import pino from 'pino';

const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

@Controller('orders')
export class OrdersController {
  @Post()
  async createOrder(@Body() orderData: any) {
    const startTime = Date.now();
    
    logger.info({ 
      orderId: orderData.id, 
      userId: orderData.userId,
      amount: orderData.amount 
    }, 'Processing order');
    
    try {
      // Process order logic here
      const processingTime = Date.now() - startTime;
      
      logger.info({ 
        orderId: orderData.id, 
        processingTime,
        status: 'completed' 
      }, 'Order processed successfully');
      
      return { success: true };
    } catch (error) {
      logger.error({ 
        orderId: orderData.id, 
        error: error.message,
        stack: error.stack 
      }, 'Order processing failed');
      
      throw error;
    }
  }
}
```

**Important**: You need to install Pino in your application for the instrumentation to work:

```bash
npm install pino
```

**Trace Correlation**: Pino logs will automatically include trace and span IDs when they occur within traced requests, enabling you to correlate logs with specific request traces.

**Configuration**: Pino instrumentation is enabled by default. To disable it:

```typescript
MiddlewareApmModule.forRoot({
  // ... other config
  enablePinoInstrumentation: false
})
```

Or via environment variable:
```bash
export MW_PINO_INSTRUMENTATION=false
```

You can combine multiple decorators for comprehensive instrumentation:

```typescript
@Controller("payments")
export class PaymentsController {
  @CreateSpan("payment.process")
  @WithAttributes({ "payment.type": "credit-card" })
  @RecordParams(["amount", "currency"])
  async processPayment(amount: number, currency: string) {
    // Your code here
  }
}
```

## Configuration

The MiddlewareApmModule accepts various configuration options to customize the APM behavior:

```typescript
@Module({
  imports: [
    MiddlewareApmModule.forRoot({
      projectName: "Your application name",
      serviceName: "Your service name",
      
      // Optional configuration options
      enableFsInstrumentation: false,  // Enable filesystem instrumentation (disabled by default for performance)
      enablePinoInstrumentation: true, // Enable automatic Pino log collection (enabled by default)
      consoleLog: false,               // Capture console.log outputs
      consoleError: true,              // Capture console.error outputs
      enableSelfInstrumentation: false, // Enable self-instrumentation
      consoleExporter: false,          // Export to console instead of OTLP
      disabledInstrumentations: "",    // Comma-separated list of instrumentations to disable
      customResourceAttributes: {},    // Custom resource attributes
      // ... other options
    }),
  ],
})
export class AppModule {}
```

### Environment Variables

You can also configure the module using environment variables:

| Environment Variable | Config Option | Description | Default |
|---------------------|---------------|-------------|---------|
| `MW_FS_INSTRUMENTATION` | `enableFsInstrumentation` | Enable filesystem instrumentation | `false` |
| `MW_SELF_INSTRUMENTATION` | `enableSelfInstrumentation` | Enable self-instrumentation | `false` |
| `MW_CONSOLE_EXPORTER` | `consoleExporter` | Export to console instead of OTLP | `false` |
| `MW_APM_TRACES_ENABLED` | `pauseTraces` | Enable/disable trace collection | `true` |
| `MW_APM_METRICS_ENABLED` | `pauseMetrics` | Enable/disable metrics collection | `true` |
| `MW_API_KEY` | `accessToken` | Middleware API key | - |
| `MW_SERVICE_NAME` | `serviceName` | Service name | - |
| `MW_PROJECT_NAME` | `projectName` | Project name | - |
| `MW_TARGET` | `target` | OTLP endpoint URL | `http://localhost:9319` |
| `MW_PINO_INSTRUMENTATION` | `enablePinoInstrumentation` | Enable automatic Pino log collection | `true` |

### Filesystem Instrumentation

⚠️ **Performance Warning**: Filesystem instrumentation is disabled by default as it can have a severe impact on application performance, especially in I/O-intensive applications.

To enable filesystem instrumentation:

**Via configuration object:**
```typescript
MiddlewareApmModule.forRoot({
  // ... other config
  enableFsInstrumentation: true
})
```

**Via environment variable:**
```bash
export MW_FS_INSTRUMENTATION=true
```

Only enable this if you specifically need to trace filesystem operations and are aware of the potential performance implications.
