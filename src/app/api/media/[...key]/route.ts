import { readFile, stat } from 'node:fs/promises';

import { NextResponse } from 'next/server';

import { resolveMediaStorageConfig, resolveLocalMediaAbsolutePath } from '@server/storage';

type Params = Promise<{ key: string[] }>;

const CONTENT_TYPES: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

export async function GET(_request: Request, context: { params: Params }) {
  const config = resolveMediaStorageConfig();

  if (config.driver !== 'local') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const { key: parts } = await context.params;
  const key = parts.map((part) => decodeURIComponent(part)).join('/');

  if (!key || key.includes('..')) {
    return NextResponse.json({ message: 'Invalid key' }, { status: 400 });
  }

  const absolute = resolveLocalMediaAbsolutePath(config.localRoot, key);

  if (!absolute) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const info = await stat(absolute);

    if (!info.isFile()) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const buffer = await readFile(absolute);
    const ext = key.split('.').pop()?.toLowerCase() ?? 'webp';
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
}
