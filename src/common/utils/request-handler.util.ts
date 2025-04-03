import { Logger } from '@nestjs/common';

const logger = new Logger('RequestHandlerUtils');

export const handleRequest = async <T>(
  handler: () => Promise<T>,
  errorMessage: string,
  throwError: boolean = false,
): Promise<T> => {
  try {
    return await handler();
  } catch (error) {
    logger.error(errorMessage, error.stack || error);
    if (throwError) throw error;
    return error.response;
  }
};
