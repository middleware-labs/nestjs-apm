import { Injectable } from "@nestjs/common";

/**
 * Registry to track routes that should be ignored for APM tracing.
 * This allows the HTTP instrumentation to check for ignored routes
 * before creating spans.
 */
@Injectable()
export class ApmRouteRegistry {
  private static ignoredRoutes = new Set<string>();
  private static ignoredPatterns = new Set<RegExp>();

  /**
   * Add a route to be ignored by APM tracing
   * @param route The route pattern to ignore (e.g., "/health", "/users/:id")
   */
  static addIgnoredRoute(route: string): void {
    this.ignoredRoutes.add(route);
    
    // Convert route pattern to regex for dynamic routes
    const regexPattern = route
      .replace(/:[^/]+/g, '[^/]+') // Replace :param with [^/]+
      .replace(/\*/g, '.*') // Replace * with .*
      .replace(/\//g, '\\/'); // Escape forward slashes
    
    this.ignoredPatterns.add(new RegExp(`^${regexPattern}$`));
  }

  /**
   * Add multiple routes to be ignored
   * @param routes Array of route patterns to ignore
   */
  static addIgnoredRoutes(routes: string[]): void {
    routes.forEach(route => this.addIgnoredRoute(route));
  }

  /**
   * Check if a route should be ignored for APM tracing
   * @param url The incoming request URL
   * @param method The HTTP method (optional)
   */
  static shouldIgnoreRoute(url: string, method?: string): boolean {
    // Remove query parameters for matching
    const path = url.split('?')[0];
    
    // Check exact matches first
    if (this.ignoredRoutes.has(path)) {
      return true;
    }
    
    // Check pattern matches
    for (const pattern of this.ignoredPatterns) {
      if (pattern.test(path)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Clear all ignored routes (mainly for testing)
   */
  static clearIgnoredRoutes(): void {
    this.ignoredRoutes.clear();
    this.ignoredPatterns.clear();
  }

  /**
   * Get all ignored routes (for debugging)
   */
  static getIgnoredRoutes(): string[] {
    return Array.from(this.ignoredRoutes);
  }
}

/**
 * Utility function to manually register routes to be ignored by APM tracing.
 * This can be used as an alternative to the @IgnoreApmTrace() decorator.
 * 
 * @param routes Single route or array of routes to ignore
 * 
 * @example
 * // Ignore a single route
 * registerIgnoredRoutes('/health');
 * 
 * // Ignore multiple routes
 * registerIgnoredRoutes(['/health', '/metrics', '/status']);
 * 
 * // Ignore routes with parameters
 * registerIgnoredRoutes(['/users/:id/health', '/internal/*']);
 */
export function registerIgnoredRoutes(routes: string | string[]): void {
  if (Array.isArray(routes)) {
    ApmRouteRegistry.addIgnoredRoutes(routes);
  } else {
    ApmRouteRegistry.addIgnoredRoute(routes);
  }
} 