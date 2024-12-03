const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { Resource } = require('@opentelemetry/resources');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { trace, context, SpanKind } = require('@opentelemetry/api');

class Telemetry {
  constructor() {
    // 
    const serviceName = `${process.env.GROUP_ID}-${process.env.MESSAGE_SYSTEM}`;

    // Zipkin Exporter
    this.zipkinExporter = new ZipkinExporter({
      url: `http://${process.env.ZIPKIN_HOST_ADDRESS}:${process.env.ZIPKIN_HOST_PORT}/api/v2/spans`,
    });

    // Jaeger Exporter
    this.jeagerExporter = new JaegerExporter({
      endpoint: `http://${process.env.JAEGER_HOST_ADDRESS}:${process.env.JAEGER_HTTP_PORT}/api/traces`,
    });

    // Tracer Provider
    this.provider = new NodeTracerProvider({
      resource: new Resource({
        'service.name': serviceName,
      }),
    });

    // Add Zipkin ve Jaeger span processors
    this.provider.addSpanProcessor(new SimpleSpanProcessor(this.zipkinExporter));
    this.provider.addSpanProcessor(new SimpleSpanProcessor(this.jeagerExporter));

    // Register the provider
    this.provider.register();

    // Get the tracer
    this.tracer = trace.getTracer(serviceName);
  }

  getTracer() {
    return this.tracer;
  }

  startSpan(name, options, context) {
    return this.tracer.startSpan(name, options, context);
  }

  start(spanName, eventName, pair) {
    const spanContext = {
      traceId: pair.headers.traceId,  // Custom traceId (16 bytes)
      spanId: pair.key.recordId,      // Custom spanId (8 bytes)
      traceFlags: 1,                  // Trace flags (default 'sampled')
      parentId: undefined,            // No parent span for root span
    };

    const options = {
      kind: SpanKind.INTERNAL,
      attributes: {
        'messageSystem': process.env.MESSAGE_SYSTEM,
        'groupId': process.env.GROUP_ID,
        'clientId': process.env.CLIENT_ID,
        'eventName': eventName,
        ...this.convertModelToTags(pair)
      }
    };

    const currentContext = context.active() || context.setSpan(context.active(), spanContext);

    // Start span with the custom context containing your traceId and spanId
    const span = this.startSpan(spanName, options, currentContext);

    // Explicitly set traceId and spanId as attributes
    span.setAttribute('traceId', spanContext.traceId);
    span.setAttribute('spanId', spanContext.spanId);

    return span;
  }

  convertModelToTags(pair) {
    const tags = {};

    function flatten(obj, prefix = '') {
      // If obj is an object and not null, we iterate over its keys
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          // Create a new prefix for nested keys
          const newKey = prefix ? `${prefix}.${key}` : key;
          // Recursively handle nested objects
          flatten(value, newKey);
        }
      } else {
        // If it's not an object, it's a leaf value. Add it to the tags
        tags[prefix] = obj;
      }
    }

    // Start the flattening process with the top-level object
    flatten(pair);

    return tags;
  }
}

module.exports = new Telemetry();
