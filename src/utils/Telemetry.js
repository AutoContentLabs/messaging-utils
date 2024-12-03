const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { Resource } = require('@opentelemetry/resources');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-grpc'); // OTLP Exporter (gRPC)
const { trace, context, SpanKind } = require('@opentelemetry/api');
const { NodeSDK } = require('@opentelemetry/sdk-node');  // OpenTelemetry SDK for Node.js

class Telemetry {
  constructor() {
    const serviceName = `${process.env.GROUP_ID}-${process.env.MESSAGE_SYSTEM}`;

    // Zipkin Exporter
    this.zipkinExporter = new ZipkinExporter({
      url: `http://${process.env.ZIPKIN_HOST_ADDRESS}:${process.env.ZIPKIN_HOST_PORT}/api/v2/spans`,
    });

    // Jaeger Exporter
    this.jeagerExporter = new JaegerExporter({
      endpoint: `http://${process.env.JAEGER_HOST_ADDRESS}:${process.env.JAEGER_HTTP_PORT}/api/traces`,
    });

    // OTLP (gRPC) Exporter
    this.otlpExporter = new OTLPTraceExporter({
      url: `http://${process.env.OTLP_HOST_ADDRESS}:${process.env.OTLP_HOST_PORT}`,  // OTLP gRPC URL
    });

    // Tracer Provider oluşturuluyor
    this.provider = new NodeTracerProvider({
      resource: new Resource({
        'service.name': serviceName,
      }),
    });

    // Exporter'ları ekliyoruz
    this.provider.addSpanProcessor(new SimpleSpanProcessor(this.zipkinExporter));
    this.provider.addSpanProcessor(new SimpleSpanProcessor(this.jeagerExporter));
    this.provider.addSpanProcessor(new SimpleSpanProcessor(this.otlpExporter));  // OTLP Exporter ekledik

    // Tracer provider'ı kaydediyoruz
    this.provider.register();

    // OpenTelemetry SDK üzerinden Tracer elde ediyoruz
    this.tracer = trace.getTracer(serviceName);
  }

  // Tracer'ı döndürme
  getTracer() {
    return this.tracer;
  }

  // Span başlatma
  startSpan(name, options, context) {
    return this.tracer.startSpan(name, options, context);
  }

  // Custom TraceId ve SpanId ile Span başlatma
  start(spanName, eventName, pair) {
    const spanContext = {
      traceId: pair.headers.traceId,  // Custom traceId (16 byte)
      spanId: pair.key.recordId,      // Custom spanId (8 byte)
      traceFlags: 1,                  // Trace flags (örneğin 'sampled' seçeneği)
      parentId: undefined,            // Root span olduğu için parentId yok
    };

    const options = {
      kind: SpanKind.INTERNAL,
      attributes: {
        'messageSystem': process.env.MESSAGE_SYSTEM,
        'groupId': process.env.GROUP_ID,
        'clientId': process.env.CLIENT_ID,
        'eventName': eventName,
        ...this.convertModelToTags(pair),  // Tag verilerini dönüştürme
      }
    };

    const currentContext = context.active() || context.setSpan(context.active(), spanContext);

    // Custom context ile span başlatma
    const span = this.startSpan(spanName, options, currentContext);

    // TraceId ve SpanId'yi span attribute olarak ekleme
    span.setAttribute('traceId', spanContext.traceId);
    span.setAttribute('spanId', spanContext.spanId);

    return span;
  }

  // Model verisini düzleştirip tag'lere dönüştürme
  convertModelToTags(pair) {
    const tags = {};

    function flatten(obj, prefix = '') {
      // Eğer obj bir nesne ise, onun anahtarlarını dolaş
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          // Yeni bir prefix oluştur
          const newKey = prefix ? `${prefix}.${key}` : key;
          // Recursively handle nested objects
          flatten(value, newKey);
        }
      } else {
        // Eğer bir nesne değilse, bu bir değer. Tag'lere ekle
        tags[prefix] = obj;
      }
    }

    // Düzleştirme işlemini başlat
    flatten(pair);

    return tags;
  }
}

module.exports = new Telemetry();
