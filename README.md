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
- Distributed tracing
- Performance metrics
- Error tracking
- Custom span attributes
- Advanced instrumentation decorators
- OpenTelemetry log integration
- Exception tracking with OTEL events

## Basic Usage

### Ignoring Routes

You can use the `@IgnoreApmTrace()` decorator to exclude specific routes from tracing:

```typescript
import { IgnoreApmTrace } from "@middleware.io/nestjs-apm";

@Controller("users")
export class UsersController {
  @IgnoreApmTrace()
  @Get("health")
  healthCheck() {
    return "OK";
  }
}
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
