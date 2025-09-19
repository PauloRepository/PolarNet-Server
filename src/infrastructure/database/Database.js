const { Pool } = require('pg');

/**
 * Database connection wrapper for PostgreSQL
 * Provides connection pooling and transaction management
 */
class Database {
  constructor(config) {
    this.config = config;
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection pool
   */
  async connect() {
    try {
      this.pool = new Pool(this.config);
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      console.log(`✅ Database connected successfully to ${this.config.host}:${this.config.port}/${this.config.database}`);
      
      // Handle pool events
      this.pool.on('error', (err) => {
        console.error('❌ Unexpected error on idle client', err);
        this.isConnected = false;
      });

      this.pool.on('connect', () => {
        console.log('🔗 New client connected to database');
      });

      this.pool.on('remove', () => {
        console.log('📤 Client removed from pool');
      });

    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Execute a query
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Query executed in ${duration}ms: ${text.substring(0, 100)}...`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`❌ Query error after ${duration}ms:`, {
        query: text.substring(0, 200),
        params: params,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   * @returns {Promise<Object>} Database client
   */
  async getClient() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    
    return await this.pool.connect();
  }

  /**
   * Execute queries within a transaction
   * @param {Function} callback - Function that receives a client and performs queries
   * @returns {Promise<any>} Result of the callback
   */
  async transaction(callback) {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if database is connected
   * @returns {boolean} Connection status
   */
  isReady() {
    return this.isConnected && this.pool;
  }

  /**
   * Get connection pool statistics
   * @returns {Object} Pool statistics
   */
  getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * Close all connections
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('🔌 Database connection pool closed');
    }
  }

  /**
   * Health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const start = Date.now();
      const result = await this.query('SELECT NOW() as current_time, version() as version');
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        currentTime: result.rows[0].current_time,
        version: result.rows[0].version,
        poolStats: this.getPoolStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        poolStats: this.getPoolStats()
      };
    }
  }
}

module.exports = Database;
