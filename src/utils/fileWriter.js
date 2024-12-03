// src/utils/fileWriter.js
const fs = require('fs');
const path = require('path');

async function writeToFile(filePath, data, append = false) {
    try {
        const dir = path.dirname(filePath);
        await fs.mkdirSync(dir, { recursive: true });

        if (append) {
            await fs.appendFileSync(filePath, data);
        } else {
            await fs.writeFileSync(filePath, data);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

module.exports = writeToFile;
