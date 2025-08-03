import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { mockDatabase } from 'test/mocks/database.mock';
import { mockFolder, mockFoldersGateway } from 'test/mocks/folders.mock';
import { IGetFoldersPayload } from './folders.types';

describe('FoldersService', () => {
  let service: FoldersService;

  beforeEach(async () => {
    service = new FoldersService(
      mockDatabase as any,
      mockFoldersGateway as any,
    );
    jest.clearAllMocks();
  });

  describe('createFolder', () => {
    it('should create folder and emit event', async () => {
      const folder = mockFolder();
      mockDatabase.user.findUnique.mockResolvedValue({ isVerified: true });
      mockDatabase.folder.count.mockResolvedValue(0);
      mockDatabase.folder.create.mockResolvedValue(folder);

      const result = await service.createFolder(
        { name: 'New Folder', userId: 'user-id' },
        'socket-id',
      );

      expect(mockDatabase.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        select: { isVerified: true },
      });
      expect(mockDatabase.folder.count).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
      });
      expect(mockDatabase.folder.create).toHaveBeenCalledWith({
        data: { name: 'New Folder', userId: 'user-id' },
      });
      expect(mockFoldersGateway.emitFolderCreated).toHaveBeenCalledWith(
        folder,
        'socket-id',
      );
      expect(result).toEqual(folder);
    });

    it('should throw ForbiddenException if unverified user has 3 or more folders', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({ isVerified: false });
      mockDatabase.folder.count.mockResolvedValue(3);

      await expect(
        service.createFolder({ name: 'New Folder', userId: 'user-id' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if verified user has 25 or more folders', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({ isVerified: true });
      mockDatabase.folder.count.mockResolvedValue(25);

      await expect(
        service.createFolder({ name: 'New Folder', userId: 'user-id' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getFolders', () => {
    it('should return paginated folders response', async () => {
      const folders = [mockFolder()];
      const total = 1;

      const req: IGetFoldersPayload = {
        page: 1,
        limit: 10,
        name: '',
        userId: 'user-id',
      };

      mockDatabase.$transaction.mockResolvedValueOnce([folders, total]);

      const result = await service.getFolders(req);

      expect(mockDatabase.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        folders,
        page: 1,
        limit: 10,
        total,
        pages: 1,
      });
    });
  });

  describe('renameFolder', () => {
    it('should rename folder and emit event', async () => {
      const oldFolder = mockFolder({ name: 'Old name' });
      const updatedFolder = mockFolder({ name: 'New name' });

      mockDatabase.folder.findUnique.mockResolvedValue(oldFolder);
      mockDatabase.folder.update.mockResolvedValue(updatedFolder);

      const result = await service.renameFolder(
        'folder-id',
        'New name',
        'socket-id',
      );

      expect(mockDatabase.folder.findUnique).toHaveBeenCalledWith({
        where: { id: 'folder-id' },
        select: { name: true },
      });

      expect(mockDatabase.folder.update).toHaveBeenCalledWith({
        where: { id: 'folder-id' },
        data: { name: 'New name' },
      });

      expect(mockFoldersGateway.emitFolderRenamed).toHaveBeenCalledWith(
        updatedFolder,
        'socket-id',
      );
      expect(result).toEqual(updatedFolder);
    });

    it('should throw NotFoundException if folder not found', async () => {
      mockDatabase.folder.findUnique.mockResolvedValue(null);

      await expect(
        service.renameFolder('folder-id', 'New name'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFolder', () => {
    it('should delete folder and emit event', async () => {
      const deletedFolder = mockFolder();

      mockDatabase.folder.delete.mockResolvedValue(deletedFolder);

      const result = await service.deleteFolder('folder-id', 'socket-id');

      expect(mockDatabase.folder.delete).toHaveBeenCalledWith({
        where: { id: 'folder-id' },
      });

      expect(mockFoldersGateway.emitFolderDeleted).toHaveBeenCalledWith(
        deletedFolder,
        'socket-id',
      );
      expect(result).toEqual(deletedFolder);
    });
  });
});
