import { NextResponse } from 'next/server';
import {
  decryptWhatsAppFlowRequest,
  encryptWhatsAppFlowResponse,
} from '@/lib/whatsapp-flow-crypto';
import { handleFlow, type FlowRequestBody } from '@/lib/flow-handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new NextResponse('invalid json', { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return new NextResponse('invalid body', { status: 400 });
  }

  let decrypted;
  try {
    decrypted = decryptWhatsAppFlowRequest(body);
  } catch (err) {
    // 421 tells WhatsApp our key is wrong / mismatched — they will retry / surface
    console.warn('flow decrypt failed:', (err as Error).message);
    return new NextResponse('decryption failed', { status: 421 });
  }

  const flowBody = decrypted.decryptedBody as unknown as FlowRequestBody;
  const response = await handleFlow(flowBody);

  const encrypted = encryptWhatsAppFlowResponse(
    response as unknown as Record<string, unknown>,
    decrypted.aesKeyBuffer,
    decrypted.initialVectorBuffer,
  );

  return new NextResponse(encrypted, {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  });
}

// WhatsApp health-checks the endpoint with GET — answer 200 OK
export async function GET() {
  return NextResponse.json({ ok: true });
}
