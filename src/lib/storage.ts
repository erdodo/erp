import path from "path";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";

// ─── Provider Interface ────────────────────────────────────────────────────────

export interface StorageProvider {
  /** Upload a buffer and return the remote path stored */
  upload(buffer: Buffer, remotePath: string, mimeType?: string): Promise<string>;
  /** Download a file by remote path */
  download(remotePath: string): Promise<Buffer>;
  /** Delete a file */
  delete(remotePath: string): Promise<void>;
  /** Get public URL for a remote path */
  getUrl(remotePath: string): string;
}

// ─── Local Provider ────────────────────────────────────────────────────────────

class LocalStorageProvider implements StorageProvider {
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.baseDir = process.env.STORAGE_LOCAL_PATH ?? "./uploads";
    this.baseUrl = process.env.STORAGE_BASE_URL   ?? "/api/files";
  }

  async upload(buffer: Buffer, remotePath: string, _mimeType?: string): Promise<string> {
    const fullPath = path.join(this.baseDir, remotePath);
    const dir      = path.dirname(fullPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return remotePath;
  }

  async download(remotePath: string): Promise<Buffer> {
    return fs.readFile(path.join(this.baseDir, remotePath));
  }

  async delete(remotePath: string): Promise<void> {
    await fs.unlink(path.join(this.baseDir, remotePath)).catch(() => {});
  }

  getUrl(remotePath: string): string {
    return `${this.baseUrl}/${remotePath}`;
  }
}

// ─── S3 Stub ──────────────────────────────────────────────────────────────────
// Ready to implement — requires: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_BUCKET
class S3StorageProvider implements StorageProvider {
  async upload(_buffer: Buffer, _remotePath: string): Promise<string> {
    throw new Error("S3 provider not yet implemented. Install @aws-sdk/client-s3.");
  }
  async download(_remotePath: string): Promise<Buffer> {
    throw new Error("S3 provider not yet implemented.");
  }
  async delete(_remotePath: string): Promise<void> {
    throw new Error("S3 provider not yet implemented.");
  }
  getUrl(remotePath: string): string {
    const bucket = process.env.AWS_BUCKET ?? "";
    const region = process.env.AWS_REGION ?? "us-east-1";
    return `https://${bucket}.s3.${region}.amazonaws.com/${remotePath}`;
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────────

let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (_provider) return _provider;

  const type = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();

  if (type === "local") {
    _provider = new LocalStorageProvider();
  } else if (type === "s3") {
    _provider = new S3StorageProvider();
  } else {
    throw new Error(`Unsupported STORAGE_PROVIDER: "${type}". Supported: local, s3`);
  }

  return _provider;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export async function uploadFile(opts: {
  buffer:   Buffer;
  tenantId: string;
  filename: string;
  mimeType?: string;
}): Promise<string> {
  const sanitized = opts.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uid       = randomUUID().slice(0, 8);
  const remotePath = `${opts.tenantId}/${uid}_${sanitized}`;

  return getStorageProvider().upload(opts.buffer, remotePath, opts.mimeType);
}

export function getFileUrl(remotePath: string): string {
  return getStorageProvider().getUrl(remotePath);
}

export async function downloadFile(remotePath: string): Promise<Buffer> {
  return getStorageProvider().download(remotePath);
}

export async function deleteFile(remotePath: string): Promise<void> {
  return getStorageProvider().delete(remotePath);
}
