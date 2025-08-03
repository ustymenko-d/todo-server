import { Test, TestingModule } from '@nestjs/testing';
import { CleanupService } from './cleanup.service';
import { DatabaseService } from 'src/database/database.service';
import { mockDatabase } from 'test/mocks/database.mock';

describe('CleanupService', () => {
  let service: CleanupService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDatabase.refreshToken.deleteMany.mockResolvedValue({ count: 3 });
    mockDatabase.user.deleteMany.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        {
          provide: DatabaseService,
          useValue: mockDatabase,
        },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
  });

  it('should call deleteMany for refreshToken and user with correct conditions', async () => {
    await service.dailyCleaning();

    expect(mockDatabase.refreshToken.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.any(Object),
      }),
    );

    expect(mockDatabase.user.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.any(Object),
      }),
    );
  });

  it('should log start and completion messages', async () => {
    const logSpy = jest.spyOn(service['logger'], 'log');

    await service.dailyCleaning();

    expect(logSpy).toHaveBeenCalledWith('Starting daily cleaning...');
    expect(logSpy).toHaveBeenCalledWith('Daily cleaning is completed.');
  });

  it('should throw error and log if cleanup fails', async () => {
    const error = new Error('Test error');
    mockDatabase.user.deleteMany.mockRejectedValueOnce(error);

    const errorSpy = jest.spyOn(service['logger'], 'error');

    await expect(service.dailyCleaning()).rejects.toThrow(error);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to clean up user: '),
      error.stack,
    );
  });
});
