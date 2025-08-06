import {
  mockCookiesService,
  TCookiesServiceMock,
} from 'test/mocks/cookies.mock';
import { CookiesController } from './cookies.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { CookiesService } from './cookies.service';
import { Response } from 'express';

describe('CookiesController', () => {
  let controller: CookiesController;
  let service: TCookiesServiceMock;

  const mockRes = {} as Response;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CookiesController],
      providers: [{ provide: CookiesService, useFactory: mockCookiesService }],
    }).compile();

    controller = module.get(CookiesController);
    service = module.get(CookiesService);
  });

  describe('clearAuthCookies', () => {
    it('should clear cookies and return success response', async () => {
      const result = await controller.clearAuthCookies(mockRes);

      expect(service.clearAuthCookies).toHaveBeenCalledWith(mockRes);
      expect(result).toEqual({
        success: true,
        message: 'Cookies cleared successfully.',
      });
    });
  });
});
