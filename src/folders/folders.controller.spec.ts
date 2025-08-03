import { Test, TestingModule } from '@nestjs/testing';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { DatabaseService } from 'src/database/database.service';
import { mockFolder, mockFoldersService } from 'test/mocks/folders.mock';
import { mockJwtUser } from 'test/mocks/user.mock';
import { FolderName, FolderId } from './folders.dto';

describe('FoldersController', () => {
  let controller: FoldersController;
  let service: ReturnType<typeof mockFoldersService>;

  const socketId = 'socket-id';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoldersController],
      providers: [
        { provide: FoldersService, useFactory: mockFoldersService },
        {
          provide: DatabaseService,
          useValue: { folder: { findUnique: jest.fn() } },
        },
      ],
    }).compile();

    controller = module.get(FoldersController);
    service = module.get(FoldersService);
  });

  describe('create()', () => {
    const body: FolderName = { name: 'Folder name' };

    it('should return created folder', async () => {
      const folder = mockFolder();
      service.createFolder.mockResolvedValueOnce(folder);

      const result = await controller.create(
        { user: mockJwtUser },
        body,
        socketId,
      );

      expect(service.createFolder).toHaveBeenCalledWith(
        { ...body, userId: mockJwtUser.userId },
        socketId,
      );
      expect(result).toEqual({
        success: true,
        message: 'Folder created successfully.',
        folder,
      });
    });

    it('should throw when service fails', async () => {
      service.createFolder.mockRejectedValueOnce(new Error('Error'));

      await expect(
        controller.create({ user: mockJwtUser }, body, socketId),
      ).rejects.toThrow('Error');
    });
  });

  describe('get()', () => {
    const query = { page: 1, limit: 10, name: 'Test folder' };

    it('should return folders list', async () => {
      const foldersResponse = { data: [mockFolder()], total: 1 };
      service.getFolders.mockResolvedValueOnce(foldersResponse);

      const result = await controller.get({ user: mockJwtUser }, query);

      expect(service.getFolders).toHaveBeenCalledWith({
        name: query.name,
        page: query.page,
        limit: query.limit,
        userId: mockJwtUser.userId,
      });
      expect(result).toEqual(foldersResponse);
    });

    it('should throw when service fails', async () => {
      service.getFolders.mockRejectedValueOnce(new Error('Error'));

      await expect(
        controller.get({ user: mockJwtUser }, query),
      ).rejects.toThrow('Error');
    });
  });

  describe('rename()', () => {
    const folderId: FolderId = { folderId: 'folder-id' };
    const body: FolderName = { name: 'Renamed folder' };

    it('should return renamed folder', async () => {
      const folder = mockFolder();
      service.renameFolder.mockResolvedValueOnce(folder);

      const result = await controller.rename(folderId, body, socketId);

      expect(service.renameFolder).toHaveBeenCalledWith(
        folderId.folderId,
        body.name,
        socketId,
      );
      expect(result).toEqual({
        success: true,
        message: 'Folder renamed successfully.',
        folder,
      });
    });

    it('should throw when service fails', async () => {
      service.renameFolder.mockRejectedValueOnce(new Error('Error'));

      await expect(controller.rename(folderId, body, socketId)).rejects.toThrow(
        'Error',
      );
    });
  });

  describe('delete()', () => {
    const folderId: FolderId = { folderId: 'folder-id' };

    it('should return deleted folder', async () => {
      const folder = mockFolder();
      service.deleteFolder.mockResolvedValueOnce(folder);

      const result = await controller.delete(folderId, socketId);

      expect(service.deleteFolder).toHaveBeenCalledWith(
        folderId.folderId,
        socketId,
      );
      expect(result).toEqual({
        success: true,
        message: 'Folder deleted successfully.',
        folder,
      });
    });

    it('should throw when service fails', async () => {
      service.deleteFolder.mockRejectedValueOnce(new Error('Error'));

      await expect(controller.delete(folderId, socketId)).rejects.toThrow(
        'Error',
      );
    });
  });
});
