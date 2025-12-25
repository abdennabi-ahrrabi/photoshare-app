import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import crypto from 'crypto';
import path from 'path';

// Azure Blob Storage configuration
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const accountName = process.env.AZURE_STORAGE_ACCOUNT || 'photoshare9703';

// Container names
const CONTAINERS = {
  originals: 'originals',
  thumbnails: 'thumbnails',
  processed: 'processed',
};

// Initialize BlobServiceClient
let blobServiceClient: BlobServiceClient;

try {
  blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
} catch (error) {
  console.error('Failed to initialize Azure Blob Storage:', error);
}

// Get container client
function getContainerClient(containerName: string): ContainerClient {
  return blobServiceClient.getContainerClient(containerName);
}

// Generate unique blob name
function generateBlobName(originalName: string): string {
  const ext = path.extname(originalName);
  return `${crypto.randomUUID()}${ext}`;
}

// Get blob URL
function getBlobUrl(containerName: string, blobName: string): string {
  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`;
}

// Upload buffer to Azure Blob Storage
export async function uploadToBlob(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  container: 'originals' | 'thumbnails' | 'processed' = 'originals'
): Promise<{ blobName: string; url: string }> {
  const containerClient = getContainerClient(CONTAINERS[container]);
  const blobName = generateBlobName(originalName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: mimeType,
    },
  });

  return {
    blobName,
    url: getBlobUrl(CONTAINERS[container], blobName),
  };
}

// Upload from file path (for migration/compatibility)
export async function uploadFileToBlob(
  filePath: string,
  originalName: string,
  mimeType: string,
  container: 'originals' | 'thumbnails' | 'processed' = 'originals'
): Promise<{ blobName: string; url: string }> {
  const containerClient = getContainerClient(CONTAINERS[container]);
  const blobName = generateBlobName(originalName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadFile(filePath, {
    blobHTTPHeaders: {
      blobContentType: mimeType,
    },
  });

  return {
    blobName,
    url: getBlobUrl(CONTAINERS[container], blobName),
  };
}

// Delete blob from Azure Storage
export async function deleteFromBlob(
  blobName: string,
  container: 'originals' | 'thumbnails' | 'processed' = 'originals'
): Promise<void> {
  try {
    const containerClient = getContainerClient(CONTAINERS[container]);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
  } catch (error) {
    console.error('Error deleting blob:', error);
  }
}

// Check if blob exists
export async function blobExists(
  blobName: string,
  container: 'originals' | 'thumbnails' | 'processed' = 'originals'
): Promise<boolean> {
  const containerClient = getContainerClient(CONTAINERS[container]);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  return await blockBlobClient.exists();
}

export { CONTAINERS, getBlobUrl };