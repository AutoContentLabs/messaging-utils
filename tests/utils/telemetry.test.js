const telemetry = require('../../src/utils/Telemetry');  // Kodunuzu burada import edin

// Trace başlatma
const testSpan = telemetry.start('Test Span', 'Test Event', {
  headers: { traceId: 'abc123' },
  key: { recordId: 'xyz456' },
});

console.log('Span başlatıldı:', testSpan);
