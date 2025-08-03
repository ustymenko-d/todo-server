import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    dbService = new DatabaseService();

    dbService.$connect = jest.fn();
    dbService.$disconnect = jest.fn();
  });

  describe('onModuleInit', () => {
    it('should call $connect', async () => {
      await dbService.onModuleInit();
      expect(dbService.$connect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should call $disconnect', async () => {
      await dbService.onModuleDestroy();
      expect(dbService.$disconnect).toHaveBeenCalled();
    });
  });
});
