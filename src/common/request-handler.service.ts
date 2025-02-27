import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RequestHandlerService {
  private readonly logger = new Logger(RequestHandlerService.name);

  async handleRequest<T>(
    handler: () => Promise<T>,
    errorMessage: string,
  ): Promise<T> {
    try {
      return await handler();
    } catch (error) {
      this.logger.error(errorMessage, error.stack);
      return error.response;
    }
  }
}
