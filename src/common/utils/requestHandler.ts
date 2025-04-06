import { Logger } from '@nestjs/common';

export const handleRequest = async <T>(
  handler: () => Promise<T>,
  errorMessage: string,
  logger: Logger = new Logger('RequestHandler'),
): Promise<T> => {
  try {
    return await handler();
  } catch (error) {
    logger.error(errorMessage, error.stack || error);
    throw error;
  }
};
