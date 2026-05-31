/**
 * Microservice Resilience Utilities
 * Implements Circuit Breaker and Exponential Backoff Retries to prevent cascading failures.
 */

class CircuitBreaker {
  constructor(failureThreshold = 3, cooldownPeriodMs = 10000) {
    this.state = 'CLOSED'; // 'CLOSED', 'OPEN', 'HALF_OPEN'
    this.failureThreshold = failureThreshold;
    this.cooldownPeriodMs = cooldownPeriodMs;
    this.failureCount = 0;
    this.nextAttemptTime = null;
  }

  async fire(action) {
    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttemptTime) {
        // Cooldown passed, test the waters
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('CircuitBreaker is OPEN: Service is temporarily unreachable to prevent cascading failure.');
      }
    }

    try {
      const result = await action();
      return this.onSuccess(result);
    } catch (error) {
      return this.onFailure(error);
    }
  }

  onSuccess(result) {
    // If it succeeds while half-open, fully restore connection
    this.failureCount = 0;
    this.state = 'CLOSED';
    return result;
  }

  onFailure(error) {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.cooldownPeriodMs;
      console.warn(`[CircuitBreaker] Threshold reached. Tripping breaker to OPEN for ${this.cooldownPeriodMs}ms.`);
    }
    throw error;
  }
}

/**
 * Fetch wrapper that automatically retries with exponential backoff on transient errors (5xx)
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelayMs = 500) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);

      // Only retry on 5xx Server Errors or 429 Too Many Requests
      if (response.status >= 500 || response.status === 429) {
        const data = await response.json().catch(() => ({}));
        throw new Error(`Transient Error: HTTP ${response.status} - ${data.error || 'Server Fault'}`);
      }
      
      return response;
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        throw error;
      }
      
      // Calculate delay: baseDelay * 2^attempt (e.g., 500ms -> 1000ms -> 2000ms)
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[Retry] Attempt ${attempt} failed. Retrying in ${delay}ms... Error: ${error.message}`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

module.exports = {
  CircuitBreaker,
  fetchWithRetry
};
