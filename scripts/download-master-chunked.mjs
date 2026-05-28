import { createWriteStream, mkdirSync } from 'node:fs';
import { getObjectStream, headObject } from '@/lib/r2';
import { parseRange } from '@/lib/stream';

const args = Object.fromEntries(process.argv.slice(2).map((value) => {
  const [key, raw = ''] = value.replace(/^--/, '').split('=');
  return [key, raw];
}));

const videoId = args.videoId;
const masterKey = args.key;
const outputPath = args.output || `./storage/masters/${videoId}.mp4`;
const chunkSizeMB = Number(args.chunkSize) || 10; // Default 10MB chunks

if (!videoId || !masterKey) {
  console.error('Usage: node scripts/download-master-chunked.mjs --videoId=<id> --key=<master-key> [--output=/path/to/file.mp4] [--chunkSize=<size-in-MB>]');
  process.exit(1);
}

// Ensure output directory exists
const outputDir = require('node:path').dirname(outputPath);
if (!require('node:fs').existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

async function downloadMasterInChunks() {
  try {
    // Get file metadata
    const headResponse = await headObject(masterKey);
    const fileSize = headResponse.ContentLength || 0;
    
    if (fileSize === 0) {
      throw new Error('File size is 0 or could not be determined');
    }
    
    console.log(`Starting download of master file (${Math.round(fileSize / (1024 * 1024))} MB) for video ${videoId}`);
    console.log(`Master key: ${masterKey}`);
    console.log(`Output path: ${outputPath}`);
    console.log(`Chunk size: ${chunkSizeMB} MB`);
    
    const outputStream = createWriteStream(outputPath);
    let downloaded = 0;
    let chunkNumber = 0;
    
    // Download in chunks
    while (downloaded < fileSize) {
      const chunkStart = downloaded;
      const chunkEnd = Math.min(downloaded + (chunkSizeMB * 1024 * 1024) - 1, fileSize - 1);
      const rangeHeader = `bytes=${chunkStart}-${chunkEnd}`;
      
      console.log(`Downloading chunk ${chunkNumber + 1}: ${rangeHeader} (${Math.round(((chunkEnd - chunkStart + 1) / (1024 * 1024)) * 100) / 100} MB)`);
      
      try {
        const response = await getObjectStream(masterKey, rangeHeader);
        
        if (!response.Body) {
          throw new Error('Missing response body');
        }
        
        // Convert stream to buffer and write to file
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        outputStream.write(buffer);
        downloaded += buffer.length;
        chunkNumber++;
        
        const progress = Math.round((downloaded / fileSize) * 100 * 100) / 100;
        process.stdout.write(`\rProgress: ${progress}% (${Math.round(downloaded / (1024 * 1024))} MB / ${Math.round(fileSize / (1024 * 1024))} MB)`);
      } catch (chunkError) {
        console.error(`\nError downloading chunk ${chunkNumber + 1}:`, chunkError);
        throw chunkError;
      }
    }
    
    outputStream.end();
    
    // Wait for stream to finish
    await new Promise((resolve, reject) => {
      outputStream.on('finish', resolve);
      outputStream.on('error', reject);
    });
    
    console.log(`\nDownload completed successfully!`);
    console.log(`File saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Failed to download master file:', error);
    process.exit(1);
  }
}

downloadMasterInChunks();
