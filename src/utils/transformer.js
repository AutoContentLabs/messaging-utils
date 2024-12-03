/**
 * Data Transformer
 * src/utils/transformer.js
 */

const MESSAGE_FORMATS = {
    JSON: 'json',
    BUFFER: 'buffer',
    AVRO: 'avro',
    PROTOBUF: 'protobuf'
};

/**
 * Detects the format of the given data.
 * @param {Buffer|string|Object} payload - The data to analyze.
 * @returns {string|null} Detected format ('json' or 'buffer') or null if unsupported.
 */
function detectFormat(payload) {
    if (Buffer.isBuffer(payload)) {
        try {
            JSON.parse(payload.toString());
            return MESSAGE_FORMATS.BUFFER;
        } catch {
            return null; // Not a valid JSON buffer
        }
    }
    if (typeof payload === "string") {
        try {
            JSON.parse(payload);
            return MESSAGE_FORMATS.JSON;
        } catch {
            return null; // Not a valid JSON string
        }
    }
    if (typeof payload === "object" && payload !== null) {
        return MESSAGE_FORMATS.JSON;
    }
    return null; // Unsupported format
}

/**
 * Serializes data into the specified format.
 * @param {Object} data - The data to be serialized.
 * @param {string} format - The desired output format ('json' or 'buffer').
 * @returns {Buffer|string|null} Serialized data.
 */
function serialize(data, format = MESSAGE_FORMATS.JSON) {
    try {
        if (format === MESSAGE_FORMATS.BUFFER) {
            return Buffer.from(JSON.stringify(data));
        }
        if (format === MESSAGE_FORMATS.JSON) {
            return JSON.stringify(data);
        }
        throw new Error(`Unsupported serialization format: ${format}`);
    } catch (error) {
        throw new Error(`[Transformer] [serialize] Error serializing data: ${error.message}`);
    }
}

/**
 * Deserializes data based on its detected format.
 * @param {Buffer|string} payload - The data to be deserialized.
 * @returns {Object|string|null} Deserialized data.
 */
function deserialize(payload) {
    const format = detectFormat(payload);
    if (!format) {
        throw new Error(`[Transformer] [deserialize] Unsupported format for payload: ${payload}`);
    }
    try {
        if (format === MESSAGE_FORMATS.BUFFER) {
            return JSON.parse(payload.toString());
        }
        if (format === MESSAGE_FORMATS.JSON) {
            return JSON.parse(payload);
        }
    } catch (error) {
        throw new Error(`[Transformer] [deserialize] Error deserializing payload: ${error.message}`);
    }
}

module.exports = {
    serialize,
    deserialize,
    detectFormat,
    MESSAGE_FORMATS,
};
