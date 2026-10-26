export type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
};

export type PutObjectResult = {
  key: string;
  /** URL pública (ou de serviço) para leitura. */
  url: string;
};

export interface ObjectStorageProvider {
  readonly driver: 'local' | 'r2';
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  deleteObject(key: string): Promise<void>;
  deleteObjects(keys: string[]): Promise<void>;
  getPublicUrl(key: string): string;
}
