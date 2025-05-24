/**
 * Abstract Factory Pattern Implementation
 *
 * This file implements the Abstract Factory pattern for creating adapters.
 * The pattern allows runtime selection of concrete adapter implementation
 * without coupling the client code to specific implementation classes.
 */

import { Logger } from '@nestjs/common';

/**
 * Base adapter interface
 * All adapters should implement this interface
 */
export interface IAdapter {
  /**
   * Get adapter information
   */
  getAdapterInfo(): { name: string; type: string; version?: string };

  /**
   * Initialize the adapter with configuration
   */
  initialize(config?: any): Promise<void>;
}

/**
 * Base adapter class with common functionality
 */
export abstract class BaseAdapter implements IAdapter {
  private name: string;
  private type: string;
  private version?: string;
  private isInitialized = false;
  protected logger = new Logger(this.constructor.name);

  constructor(name: string, type: string, version?: string) {
    this.name = name;
    this.type = type;
    this.version = version;
  }

  /**
   * Get adapter information including name, type, and version
   */
  getAdapterInfo(): { name: string; type: string; version?: string } {
    return {
      name: this.name,
      type: this.type,
      version: this.version,
    };
  }

  /**
   * Initialize the adapter with the provided configuration
   * @param config Configuration object for the adapter
   */
  async initialize(config?: any): Promise<void> {
    if (this.isInitialized) {
      this.logger.log(`Adapter ${this.name} already initialized`);
      return;
    }

    this.logger.log(`Initializing adapter: ${this.name}`);
    this.isInitialized = true;
  }

  /**
   * Check if the adapter is initialized
   */
  isAdapterInitialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * Factory interface for creating adapters
 */
export interface ServiceAdapterFactory<T extends IAdapter> {
  /**
   * Create an adapter of the specified type
   * @param type Type of adapter to create
   * @param config Optional configuration for the adapter
   */
  createAdapter(type: string, config?: any): T;

  /**
   * Check if the factory can create an adapter of the specified type
   * @param type Type of adapter to check
   */
  canCreate(type: string): boolean;

  /**
   * Get all supported adapter types
   */
  getSupportedTypes(): string[];
}

/**
 * Abstract factory for creating adapters
 * This class manages multiple adapter factories and selects the appropriate one
 * based on the requested adapter type
 */
export class AbstractServiceFactory<T extends IAdapter> {
  private factories: ServiceAdapterFactory<T>[] = [];
  private logger = new Logger(AbstractServiceFactory.name);

  /**
   * Register an adapter factory
   * @param factory Factory to register
   */
  registerFactory(factory: ServiceAdapterFactory<T>): void {
    this.factories.push(factory);
  }

  /**
   * Create an adapter of the specified type
   * @param type Type of adapter to create
   * @param config Optional configuration for the adapter
   */
  createAdapter(type: string, config?: any): T {
    for (const factory of this.factories) {
      if (factory.canCreate(type)) {
        this.logger.log(`Creating adapter of type: ${type}`);
        return factory.createAdapter(type, config);
      }
    }

    throw new Error(`No factory registered for adapter type: ${type}`);
  }

  /**
   * Get all supported adapter types across all registered factories
   */
  getSupportedTypes(): string[] {
    const types: string[] = [];

    for (const factory of this.factories) {
      types.push(...factory.getSupportedTypes());
    }

    return [...new Set(types)]; // Remove duplicates
  }

  /**
   * Check if an adapter type is supported by any registered factory
   * @param type Adapter type to check
   */
  isTypeSupported(type: string): boolean {
    return this.factories.some((factory) => factory.canCreate(type));
  }
}
