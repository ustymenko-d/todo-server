import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let prismaService: PrismaService;

  beforeEach(() => {
    prismaService = new PrismaService();

    prismaService.$connect = jest.fn();
    prismaService.$disconnect = jest.fn();
  });

  describe('onModuleInit', () => {
    it('should call $connect', async () => {
      await prismaService.onModuleInit();
      expect(prismaService.$connect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should call $disconnect', async () => {
      await prismaService.onModuleDestroy();
      expect(prismaService.$disconnect).toHaveBeenCalled();
    });
  });
});
