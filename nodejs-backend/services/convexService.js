/**
 * Convex Service
 * 
 * Service wrapper for interacting with Convex from Express backend.
 * This allows the Express backend to use Convex as its database layer.
 * 
 * Uses HTTP API to call Convex functions.
 */

const axios = require('axios');

class ConvexService {
  constructor() {
    // Initialize Convex URL
    // CONVEX_URL is set by Convex CLI or can be provided via environment variable
    // Format: https://your-deployment.convex.cloud
    this.convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
    
    if (!this.convexUrl) {
      console.warn('⚠️  CONVEX_URL not set. Convex service will not be available.');
      this.convexUrl = null;
      return;
    }

    // Remove trailing slash if present
    this.convexUrl = this.convexUrl.replace(/\/$/, '');
    
    // Get access token if available (for authenticated requests)
    this.accessToken = process.env.CONVEX_ACCESS_TOKEN || null;
    
    console.log('✅ Convex service initialized:', this.convexUrl);
  }

  /**
   * Make HTTP request to Convex
   * @private
   */
  async _request(method, path, args = {}) {
    if (!this.convexUrl) {
      throw new Error('Convex client not initialized. Set CONVEX_URL environment variable.');
    }

    const url = `${this.convexUrl}/api/${method}`;
    const payload = {
      path: path,
      args: args,
      format: "json"
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    // Add authentication if available
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await axios.post(url, payload, { headers });
      return response.data;
    } catch (error) {
      console.error('Convex API error:', error.response?.data || error.message);
      throw new Error(`Convex ${method} failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Execute a Convex query
   * @param {string} path - Query path (e.g., "queries:users:getById")
   * @param {object} args - Query arguments
   * @returns {Promise<any>} Query result
   */
  async query(path, args = {}) {
    // Ensure path starts with "queries:"
    const fullPath = path.startsWith('queries:') ? path : `queries:${path}`;
    return await this._request('query', fullPath, args);
  }

  /**
   * Execute a Convex mutation
   * @param {string} path - Mutation path (e.g., "mutations:users:create")
   * @param {object} args - Mutation arguments
   * @returns {Promise<any>} Mutation result
   */
  async mutation(path, args = {}) {
    // Ensure path starts with "mutations:"
    const fullPath = path.startsWith('mutations:') ? path : `mutations:${path}`;
    return await this._request('mutation', fullPath, args);
  }

  /**
   * Execute a Convex action
   * @param {string} path - Action path (e.g., "users:sendEmail")
   * @param {object} args - Action arguments
   * @returns {Promise<any>} Action result
   */
  async action(path, args = {}) {
    return await this._request('action', path, args);
  }

  /**
   * Check if Convex service is available
   */
  isAvailable() {
    return this.convexUrl !== null;
  }
}

// Export singleton instance
module.exports = new ConvexService();

