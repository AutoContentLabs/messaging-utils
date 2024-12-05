const { BasicTracerProvider, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const { context, SpanKind } = require('@opentelemetry/api');

class Telemetry {
  constructor(serviceName = 'default-service', exporterConfig = {}) {
    if (Telemetry.instance) {
      return Telemetry.instance;
    }

    this.serviceName = serviceName;
    this.exporters = [];

    if (exporterConfig.zipkin) {
      this.exporters.push(new ZipkinExporter({
        url: exporterConfig.zipkin.url,
      }));
    }
    if (exporterConfig.jaeger) {
      this.exporters.push(new JaegerExporter({
        endpoint: exporterConfig.jaeger.endpoint,
      }));
    }
    if (exporterConfig.otlp) {
      this.exporters.push(new OTLPTraceExporter({
        url: exporterConfig.otlp.url,
      }));
    }

    if (this.exporters.length === 0) {
      console.warn('No exporters defined, traces will be logged locally only.');
    }

    this.tracerProvider = new BasicTracerProvider({
      resource: new Resource({
        'service.name': this.serviceName,
      }),
    });

    this.exporters.forEach(exporter => {
      this.tracerProvider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    });

    this.tracerProvider.register();

    // The name of the tracer or instrumentation library
    let tracerName = this.serviceName
    this.tracer = this.tracerProvider.getTracer(tracerName);

    Telemetry.instance = this;
  }

  startSpan(name, options, context) {
    return this.tracer.startSpan(name, options, context);
  }

  start(spanName, eventName, pair) {
    if (!pair.headers.traceId || !pair.key.recordId) {
      throw new Error('Invalid traceId or spanId');
    }

    const spanContext = {
      traceId: pair.headers.traceId,
      spanId: pair.key.recordId,
      traceFlags: 1,
      parentId: undefined,
    };

    const options = {
      kind: SpanKind.INTERNAL,
      attributes: {
        'messageSystem': process.env.MESSAGE_SYSTEM,
        'groupId': process.env.GROUP_ID,
        'clientId': process.env.CLIENT_ID,
        'eventName': eventName,
        ...this.convertModelToTags(pair),
      }
    };

    const currentContext = context.active() || context.setSpan(context.active(), spanContext);
    const span = this.startSpan(spanName, options, currentContext);

    return span;
  }

  convertModelToTags(pair) {
    const tags = {};

    function flatten(obj, prefix = '') {
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          flatten(value, newKey);
        }
      } else {
        tags[prefix] = obj;
      }
    }

    flatten(pair);

    return tags;
  }
}

module.exports = Telemetry;
