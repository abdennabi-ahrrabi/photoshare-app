import { ServiceBusClient, ServiceBusMessage, ServiceBusReceivedMessage, ProcessErrorArgs } from '@azure/service-bus';

let serviceBusClient: ServiceBusClient | null = null;

const IMAGE_PROCESSING_QUEUE = 'image-processing';

function getServiceBusClient(): ServiceBusClient | null {
  if (serviceBusClient) return serviceBusClient;

  const connectionString = process.env.SERVICEBUS_CONNECTION_STRING;
  if (!connectionString) {
    console.warn('SERVICEBUS_CONNECTION_STRING not configured - message queue disabled');
    return null;
  }

  try {
    serviceBusClient = new ServiceBusClient(connectionString);
    console.log('Service Bus client initialized');
    return serviceBusClient;
  } catch (error) {
    console.error('Failed to create Service Bus client:', error);
    return null;
  }
}

export interface ImageProcessingMessage {
  photoId: string;
  imageUrl: string;
  uploadedAt: string;
}

export async function sendMessage(queueName: string, message: unknown): Promise<boolean> {
  try {
    const client = getServiceBusClient();
    if (!client) return false;

    const sender = client.createSender(queueName);

    const serviceBusMessage: ServiceBusMessage = {
      body: message,
      contentType: 'application/json',
    };

    await sender.sendMessages(serviceBusMessage);
    await sender.close();

    console.log(`Message sent to queue ${queueName}`);
    return true;
  } catch (error) {
    console.error('Failed to send message to Service Bus:', error);
    return false;
  }
}

export async function sendImageProcessingMessage(photoId: string, imageUrl: string): Promise<boolean> {
  const message: ImageProcessingMessage = {
    photoId,
    imageUrl,
    uploadedAt: new Date().toISOString(),
  };

  return sendMessage(IMAGE_PROCESSING_QUEUE, message);
}

export async function processMessages(
  queueName: string,
  handler: (message: ImageProcessingMessage) => Promise<void>
): Promise<void> {
  const client = getServiceBusClient();
  if (!client) {
    console.warn('Cannot process messages - Service Bus not configured');
    return;
  }

  const receiver = client.createReceiver(queueName);

  const messageHandler = async (message: ServiceBusReceivedMessage): Promise<void> => {
    try {
      console.log(`Processing message from ${queueName}:`, message.body);
      await handler(message.body as ImageProcessingMessage);
      await receiver.completeMessage(message);
    } catch (error) {
      console.error('Error processing message:', error);
      await receiver.abandonMessage(message);
    }
  };

  const errorHandler = async (args: ProcessErrorArgs): Promise<void> => {
    console.error('Service Bus error:', args.error);
  };

  receiver.subscribe({
    processMessage: messageHandler,
    processError: errorHandler,
  });

  console.log(`Started processing messages from queue ${queueName}`);
}

export async function closeServiceBus(): Promise<void> {
  if (serviceBusClient) {
    await serviceBusClient.close();
    serviceBusClient = null;
    console.log('Service Bus connection closed');
  }
}
