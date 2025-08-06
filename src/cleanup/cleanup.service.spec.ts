import { Test, TestingModule } from '@nestjs/testing';
import { CleanupService } from './cleanup.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { mockPrisma } from 'test/mocks/prisma.mock';

describe('CleanupService', () => {
  let service: CleanupService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });
    mockPrisma.user.deleteMany.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
  });

  it('should call deleteMany for refreshToken and user with correct conditions', async () => {
    const expectedRefreshTokenWhere = {
      OR: [{ expiresAt: { lt: expect.any(Date) } }, { revoked: true }],
    };

    const expectedUserWhere = {
      isVerified: false,
      createdAt: { lt: expect.any(Date) },
    };

    await service.dailyCleanup();

    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedRefreshTokenWhere }),
    );

    expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedUserWhere }),
    );
  });

  it('should log start and completion messages', async () => {
    const logSpy = jest.spyOn(service['logger'], 'log');

    await service.dailyCleanup();

    expect(logSpy).toHaveBeenCalledWith('Starting daily cleanup...');
    expect(logSpy).toHaveBeenCalledWith('Starting cleanup for refreshToken...');
    expect(logSpy).toHaveBeenCalledWith('Deleted 3 refreshToken records.');
    expect(logSpy).toHaveBeenCalledWith('Starting cleanup for user...');
    expect(logSpy).toHaveBeenCalledWith('Deleted 1 user records.');
    expect(logSpy).toHaveBeenCalledWith('Daily cleanup completed.');
  });

  it('should log if no records found during cleanup', async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValueOnce({ count: 0 });
    mockPrisma.user.deleteMany.mockResolvedValueOnce({ count: 0 });

    const logSpy = jest.spyOn(service['logger'], 'log');

    await service.dailyCleanup();

    expect(logSpy).toHaveBeenCalledWith(
      'No refreshToken records found for cleanup.',
    );
    expect(logSpy).toHaveBeenCalledWith('No user records found for cleanup.');
  });

  it('should throw error and log if cleanup fails', async () => {
    const error = new Error('Test cleanup error');

    mockPrisma.user.deleteMany.mockRejectedValueOnce(error);

    const errorSpy = jest.spyOn(service['logger'], 'error');

    await expect(service.dailyCleanup()).rejects.toThrow(error);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to clean up user: '),
      error.stack,
    );
  });
});
