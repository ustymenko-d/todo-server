import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RequestHandlerService {
  private readonly logger = new Logger(RequestHandlerService.name);

  async handleRequest<T>(
    handler: () => Promise<T>,
    errorMessage: string,
    throwError: boolean = false,
  ): Promise<T> {
    try {
      return await handler();
    } catch (error) {
      this.logger.error(errorMessage, error.stack || error);
      if (throwError) throw error;
      return error.response;
    }
  }
}
