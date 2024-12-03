// src\helpers\parser.js
const cheerio = require("cheerio");
const xml2js = require("xml2js");

/**
 * Parses fetched data into a structured format.
 * @param {string} data - The data to parse.
 * @returns {Object} Parsed data and its format.
 */
async function parseData(data) {
  if (typeof data !== "string") {
    throw new Error("Data to parse must be a string");
  }

  try {
    const jsonData = JSON.parse(data); // Try parsing as JSON
    return { parsedData: jsonData, format: "json" };
  } catch (jsonError) {
    if (data.startsWith("<html") || data.includes("<body")) {
      const $ = cheerio.load(data);
      return {
        parsedData: {
          title: $("title").text(),
          headings: $("h1")
            .map((_, el) => $(el).text())
            .get(),
          paragraphs: $("p")
            .map((_, el) => $(el).text())
            .get(),
        },
        format: "html",
      };
    }

    if (data.startsWith("<")) {
      try {
        const parsedXml = await xml2js.parseStringPromise(data);
        return { parsedData: parsedXml, format: "xml" };
      } catch (xmlError) {
        throw new Error(`Failed to parse XML: ${xmlError.message}`);
      }
    }

    // Fallback for plain text
    return { parsedData: { text: data }, format: "text" };
  }
}

module.exports = { parseData };
