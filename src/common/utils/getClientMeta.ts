import { Request } from 'express';

export type ClientMeta = {
  ipAddress: string;
  userAgent: string;
};

export function getClientMeta(req: Request): ClientMeta {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const xForwardedFor = req.headers['x-forwarded-for'];

  const ipAddress = Array.isArray(xForwardedFor)
    ? xForwardedFor[0].trim()
    : typeof xForwardedFor === 'string'
      ? xForwardedFor.split(',')[0].trim()
      : req.socket?.remoteAddress || 'Unknown';

  return { ipAddress, userAgent };
}
