import { Kafka, logLevel } from 'kafkajs';

const brokers = (process.env.KAFKA_BROKERS || '')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

const isKafkaEnabled = brokers.length > 0;
const topic = process.env.KAFKA_GARAGE_REQUEST_TOPIC || 'roadresq.garage-request.created';
const consumerGroupId = process.env.KAFKA_GARAGE_REQUEST_GROUP_ID || 'roadresq-garage-notifications';

const kafka = isKafkaEnabled
  ? new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'roadresq-api',
      brokers,
      connectionTimeout: 3000,
      requestTimeout: 5000,
      retry: { retries: 2 },
      logLevel: process.env.KAFKA_LOG_LEVEL === 'debug' ? logLevel.DEBUG : logLevel.NOTHING,
    })
  : null;

let producer;
let producerConnection;
let consumer;
let consumerStarted = false;

const getProducer = async () => {
  if (!producer) {
    producer = kafka.producer();
  }

  if (!producerConnection) {
    producerConnection = producer.connect().catch((error) => {
      producer = undefined;
      producerConnection = undefined;
      throw error;
    });
  }

  await producerConnection;
  return producer;
};

export const publishGarageRequestCreated = async (request) => {
  if (!isKafkaEnabled) {
    return false;
  }

  try {
    const activeProducer = await getProducer();
    await activeProducer.send({
      topic,
      messages: [
        {
          key: request.mechanicId,
          value: JSON.stringify({
            type: 'garage-request.created',
            version: 1,
            occurredAt: new Date().toISOString(),
            data: request,
          }),
        },
      ],
    });
    return true;
  } catch (error) {
    console.error('Kafka publish failed for garage request:', error.message);
    return false;
  }
};

export const startGarageRequestConsumer = async (onRequest) => {
  if (!isKafkaEnabled || consumerStarted) {
    return false;
  }

  try {
    consumer = kafka.consumer({ groupId: consumerGroupId });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) {
          return;
        }

        try {
          const event = JSON.parse(message.value.toString());
          if (event.type === 'garage-request.created' && event.data?.mechanicId) {
            onRequest(event.data);
          }
        } catch (error) {
          console.error('Kafka consumer received an invalid garage request event:', error.message);
        }
      },
    });
    consumerStarted = true;
    console.log(`Kafka consumer subscribed to ${topic}`);
    return true;
  } catch (error) {
    consumer = undefined;
    console.error('Kafka consumer could not start:', error.message);
    return false;
  }
};

export const disconnectKafka = async () => {
  await Promise.allSettled([
    consumer?.disconnect(),
    producer?.disconnect(),
  ]);
  consumer = undefined;
  producer = undefined;
  producerConnection = undefined;
  consumerStarted = false;
};

export { isKafkaEnabled };
