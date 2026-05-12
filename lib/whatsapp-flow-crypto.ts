import 'server-only';
import {
  createPrivateKey,
  privateDecrypt,
  createDecipheriv,
  createCipheriv,
  constants as cryptoConstants,
  type KeyObject,
} from 'node:crypto';

/**
 * WhatsApp Flow Data Exchange — request decryption + response encryption.
 *
 * Spec: https://developers.facebook.com/docs/whatsapp/flows/reference/implementingyourflowendpoint
 *
 *   - The merchant's private RSA key (PKCS#1 OAEP, SHA-256) decrypts the
 *     symmetric AES-128 key sent by WhatsApp.
 *   - That AES key + IV decrypt the JSON payload (AES-128-GCM, 16-byte tag).
 *   - For the response, we re-use the same AES key with the IV XOR-flipped
 *     (each byte ^ 0xff).
 *
 * We must NEVER log the private key or the AES key.
 */

export interface FlowEncryptedRequest {
  encrypted_flow_data: string;
  encrypted_aes_key: string;
  initial_vector: string;
}

export interface FlowDecryptedRequest {
  decryptedBody: Record<string, unknown>;
  aesKeyBuffer: Buffer;
  initialVectorBuffer: Buffer;
}

let cachedKey: KeyObject | null = null;
function loadPrivateKey(): KeyObject {
  if (cachedKey) return cachedKey;
  const raw = process.env.WHATSAPP_FLOW_PRIVATE_KEY;
  if (!raw) throw new Error('WHATSAPP_FLOW_PRIVATE_KEY is not configured');
  const pem = raw.includes('BEGIN') ? raw.replace(/\\n/g, '\n') : raw;
  cachedKey = createPrivateKey({
    key: pem,
    passphrase: process.env.WHATSAPP_FLOW_PRIVATE_KEY_PASSPHRASE || undefined,
  });
  return cachedKey;
}

export function decryptWhatsAppFlowRequest(
  body: FlowEncryptedRequest,
): FlowDecryptedRequest {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;
  if (!encrypted_aes_key || !encrypted_flow_data || !initial_vector) {
    throw new Error('missing encrypted fields');
  }

  const privateKey = loadPrivateKey();

  // 1. unwrap AES key via RSA-OAEP SHA-256
  const aesKeyBuffer = privateDecrypt(
    {
      key: privateKey,
      padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(encrypted_aes_key, 'base64'),
  );

  // 2. split flow data into ciphertext + 16-byte GCM auth tag
  const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
  const TAG_LEN = 16;
  if (flowDataBuffer.length <= TAG_LEN) {
    throw new Error('encrypted_flow_data too short');
  }
  const encrypted = flowDataBuffer.subarray(0, flowDataBuffer.length - TAG_LEN);
  const tag = flowDataBuffer.subarray(flowDataBuffer.length - TAG_LEN);

  const initialVectorBuffer = Buffer.from(initial_vector, 'base64');

  // 3. decrypt with AES-128-GCM (key length determines AES-128 vs AES-256)
  const decipher = createDecipheriv('aes-128-gcm', aesKeyBuffer, initialVectorBuffer);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  let decryptedBody: Record<string, unknown>;
  try {
    decryptedBody = JSON.parse(plaintext.toString('utf8'));
  } catch {
    throw new Error('decrypted payload is not valid JSON');
  }

  return { decryptedBody, aesKeyBuffer, initialVectorBuffer };
}

/**
 * Encrypt a JSON response with the original AES key and the flipped IV.
 * Returns a base64 string suitable for the HTTP body (text/plain).
 */
export function encryptWhatsAppFlowResponse(
  responseJson: Record<string, unknown>,
  aesKey: Buffer,
  initialVector: Buffer,
): string {
  // Flip every byte of the IV: spec says XOR with 0xff
  const flippedIv = Buffer.alloc(initialVector.length);
  for (let i = 0; i < initialVector.length; i++) {
    flippedIv[i] = initialVector[i] ^ 0xff;
  }

  const cipher = createCipheriv('aes-128-gcm', aesKey, flippedIv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(responseJson), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([encrypted, authTag]).toString('base64');
}
