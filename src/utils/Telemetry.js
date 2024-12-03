const { NodeSDK } = require('@opentelemetry/sdk-node');  // OpenTelemetry SDK for Node.js
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-grpc'); // OTLP Exporter (gRPC)
const { Resource } = require('@opentelemetry/resources');

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
      url: `http://${process.env.OTLP_HOST_ADDRESS}:${process.env.OTLP_HOST_PORT}`,  // OTLP gRPC URL
    });

    // NodeSDK ile telemetriyi başlatıyoruz
    this.sdk = new NodeSDK({
      traceExporter: this.otlpExporter,  // Varsayılan OTLP Exporter kullanıyoruz
      resource: new Resource({
        'service.name': serviceName,
      }),
    });

    // Diğer exporter'ları ekliyoruz
    this.sdk.addSpanProcessor(new SimpleSpanProcessor(this.zipkinExporter));
    this.sdk.addSpanProcessor(new SimpleSpanProcessor(this.jeagerExporter));

    // SDK'yı başlatıyoruz
    this.sdk.start();
  }

  // Tracer'ı döndürme
  getTracer() {
    return this.sdk.tracer;
  }

  // Span başlatma
  startSpan(name, options, context) {
    return this.sdk.tracer.startSpan(name, options, context);
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
