/**
 * Dependency Injection Container for PolarNet DDD Architecture
 * Manages the registration and resolution of all dependencies
 */
class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
  }

  /**
   * Register a service with transient lifetime (new instance each time)
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   * @param {Array} dependencies - Array of dependency names
   */
  register(name, factory, dependencies = []) {
    this.services.set(name, {
      factory,
      dependencies,
      lifetime: 'transient'
    });
  }

  /**
   * Register a service with singleton lifetime (single instance)
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   * @param {Array} dependencies - Array of dependency names
   */
  registerSingleton(name, factory, dependencies = []) {
    this.services.set(name, {
      factory,
      dependencies,
      lifetime: 'singleton'
    });
  }

  /**
   * Register an instance as singleton
   * @param {string} name - Service name
   * @param {any} instance - Service instance
   */
  registerInstance(name, instance) {
    this.singletons.set(name, instance);
  }

  /**
   * Register a factory function
   * @param {string} name - Factory name
   * @param {Function} factory - Factory function
   */
  registerFactory(name, factory) {
    this.factories.set(name, factory);
  }

  /**
   * Resolve a service by name
   * @param {string} name - Service name
   * @returns {any} Service instance
   */
  resolve(name) {
    // Check if it's already a singleton instance
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Check if it's a registered service
    if (this.services.has(name)) {
      const service = this.services.get(name);
      
      // Resolve dependencies
      const dependencies = service.dependencies.map(dep => this.resolve(dep));
      
      // Create instance
      const instance = service.factory(...dependencies);
      
      // Store singleton if needed
      if (service.lifetime === 'singleton') {
        this.singletons.set(name, instance);
      }
      
      return instance;
    }

    // Check if it's a factory
    if (this.factories.has(name)) {
      return this.factories.get(name);
    }

    throw new Error(`Service '${name}' not found in container`);
  }

  /**
   * Alias for resolve() method for better API compatibility
   * @param {string} name - Service name
   * @returns {any} Service instance
   */
  get(name) {
    return this.resolve(name);
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  isRegistered(name) {
    return this.services.has(name) || this.singletons.has(name) || this.factories.has(name);
  }

  /**
   * Clear all registrations
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
  }

  /**
   * Get all registered service names
   * @returns {Array} Array of service names
   */
  getRegisteredServices() {
    return [
      ...this.services.keys(),
      ...this.singletons.keys(),
      ...this.factories.keys()
    ];
  }
}

module.exports = DIContainer;
