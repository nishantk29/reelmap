/**
 * Entry for the single-file build (dist-embedded/worker.js). Static assets are
 * inlined by scripts/build-embedded.mjs as base64 with a content-type map and
 * served through a fake ASSETS binding, so the Worker can be uploaded as one
 * module without the assets upload flow.
 */
// @ts-expect-error: generated at build time
import { ASSETS as FILES } from 'reelmap:embedded-assets';
import type { Env } from './api';
import { handle } from './app';

type Entry = { type: string; body: string };
const files = FILES as Record<string, Entry>;
const decoded = new Map<string, Uint8Array<ArrayBuffer>>();

function bytes(path: string, e: Entry): Uint8Array<ArrayBuffer> {
  let b = decoded.get(path);
  if (!b) {
    const bin = atob(e.body);
    b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    decoded.set(path, b);
  }
  return b;
}

const embeddedAssets = {
  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const req = new Request(input as RequestInfo, init);
    let path = decodeURIComponent(new URL(req.url).pathname);
    if (path.endsWith('/')) path += 'index.html';
    const e = files[path];
    if (!e) return new Response('Not found', { status: 404 });
    const body = req.method === 'HEAD' ? null : bytes(path, e);
    return new Response(body, { headers: { 'Content-Type': e.type } });
  },
} as unknown as Fetcher;

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handle(request, { ...env, ASSETS: embeddedAssets }, ctx);
  },
} satisfies ExportedHandler<Env>;
