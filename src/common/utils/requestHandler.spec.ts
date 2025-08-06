import { Logger } from '@nestjs/common';
import { handleRequest } from './requestHandler';

describe('handleRequest Utility', () => {
  const successValue = { data: 'ok' };
  const errorMessage = 'Request failed';

  let handlerMock: jest.Mock<Promise<typeof successValue>>;
  let logger: Logger;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    handlerMock = jest.fn();
    logger = new Logger('TestLogger');
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  it('returns the handler result when handler resolves', async () => {
    handlerMock.mockResolvedValue(successValue);

    const result = await handleRequest(
      () => handlerMock(),
      errorMessage,
      logger,
    );

    expect(handlerMock).toHaveBeenCalled();
    expect(result).toBe(successValue);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs error and rethrows when handler rejects', async () => {
    const testError = new Error('Test error');
    handlerMock.mockRejectedValue(testError);

    await expect(
      handleRequest(() => handlerMock(), errorMessage, logger),
    ).rejects.toThrow(testError);
    expect(handlerMock).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      errorMessage,
      testError.stack || testError,
    );
  });
});
