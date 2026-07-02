import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, url } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    // Skip health check logs to reduce noise
    if (url !== '/api/health') {
      console.log(`${color}[${method}]${reset} ${url} ${status} ${duration}ms`);
    }
  });

  next();
}
