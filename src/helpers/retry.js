/**
 * Retries the provided action with exponential backoff.
 *
 * @param {Function} fn - The async function to retry.
 * @param {number} [maxRetries=3] - Maximum number of retries.
 * @param {number} [initialDelay=500] - Initial delay in milliseconds.
 * @returns {Promise<void>}
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 500) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            if (attempt >= maxRetries) throw error;

            const delayTime = initialDelay * Math.pow(2, attempt - 1); // Delay doubles each retry
            console.warn(`[Retry] Attempt ${attempt} failed. Retrying in ${delayTime}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delayTime));
        }
    }
}

module.exports = { retryWithBackoff }