// src/utils/helper.js
const crypto = require('crypto');

function generateId(size) {
    return crypto.randomBytes(size).toString('hex');
}

function generateHeaders(schemaType, correlationId, traceId, providedHeaders = {}) {

    const headers = {
        ...providedHeaders,
        correlationId: providedHeaders.correlationId || correlationId || generateId(16),
        traceId: providedHeaders.traceId || traceId || generateId(16),
        type: providedHeaders.type || `${schemaType}` // type, schemaType'e eşit olmalı, değiştirilmemeli
    };


    if (!headers.type) {
        throw new Error('Message type is missing in headers.');
    }

    return headers;
}

function generateKey() {
    return {
        recordId: generateId(8)
    };
}

/**
 * Returns the current timestamp in ISO format.
 * @returns {string} Current timestamp.
 */
function getCurrentTimestamp() {
    return new Date().toISOString();
}

module.exports = { generateKey, generateHeaders, getCurrentTimestamp, generateId };
