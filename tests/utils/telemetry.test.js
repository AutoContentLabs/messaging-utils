const Telemetry = require("../../src/utils/Telemetry");

const exporterConfig = {
  zipkin: {
    url: `http://${process.env.ZIPKIN_HOST_ADDRESS}:${process.env.ZIPKIN_HOST_PORT}/api/v2/spans`,
  },
  jaeger: {
    endpoint: `http://${process.env.JAEGER_HOST_ADDRESS}:${process.env.JAEGER_HTTP_PORT}/api/traces`,
  },
  otlp: {
    url: `http://${process.env.OTLP_HOST_ADDRESS}:${process.env.OTLP_HOST_PORT}`,
  },
};

const serviceName = `${process.env.GROUP_ID}-${process.env.MESSAGE_SYSTEM}`;

const telemetry = new Telemetry();

// Trace
const testSpan = telemetry.start("Test Span", "Test Event", {
  headers: { traceId: "abc123" },
  key: { recordId: "xyz456" },
});

console.log("Span start:", testSpan);
