const { BasicTracerProvider, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const { context, SpanKind, trace } = require('@opentelemetry/api');

class Telemetry {
  constructor() {
    const serviceName = `${process.env.GROUP_ID}-${process.env.MESSAGE_SYSTEM}`;

    // Exporter'ları hazırlıyoruz
    this.zipkinExporter = new ZipkinExporter({
      url: `http://${process.env.ZIPKIN_HOST_ADDRESS}:${process.env.ZIPKIN_HOST_PORT}/api/v2/spans`,
    });

    this.jeagerExporter = new JaegerExporter({
      endpoint: `http://${process.env.JAEGER_HOST_ADDRESS}:${process.env.JAEGER_HTTP_PORT}/api/traces`,
    });

    this.otlpExporter = new OTLPTraceExporter({
      url: `http://${process.env.OTLP_HOST_ADDRESS}:${process.env.OTLP_HOST_PORT}`,
    });

    // TracerProvider oluşturuyoruz
    this.tracerProvider = new BasicTracerProvider({
      resource: new Resource({
        'service.name': serviceName,
      }),
    });

    // Exporter'ları span processor olarak ekliyoruz
    this.tracerProvider.addSpanProcessor(new SimpleSpanProcessor(this.zipkinExporter)); // Zipkin Exporter
    this.tracerProvider.addSpanProcessor(new SimpleSpanProcessor(this.jeagerExporter)); // Jaeger Exporter
    this.tracerProvider.addSpanProcessor(new SimpleSpanProcessor(this.otlpExporter));  // OTLP Exporter

    // Tracer provider'ı kaydediyoruz
    this.tracerProvider.register();

    // Tracer'ı alıyoruz
    this.tracer = this.tracerProvider.getTracer('default');
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

    span.setAttribute('traceId', spanContext.traceId);
    span.setAttribute('spanId', spanContext.spanId);

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

module.exports = new Telemetry();
