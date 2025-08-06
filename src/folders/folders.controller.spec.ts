import { Test, TestingModule } from '@nestjs/testing';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  mockFolder,
  mockFoldersService,
  TFoldersServiceMock,
} from 'test/mocks/folders.mock';
import { FolderName, FolderId } from './folders.dto';
import { mockPrisma } from 'test/mocks/prisma.mock';
import { IFolder } from './folders.types';
import { socketId } from 'test/mocks/sockets.mock';
import { expectThrows } from 'test/utils/expectThrows';
import { expectSuccess } from 'test/utils/expectSuccess';
import { jwtUserMock } from 'test/mocks/auth.mock';

describe('FoldersController', () => {
  let controller: FoldersController;
  let service: TFoldersServiceMock;

  const folderId: FolderId = { folderId: 'folder-id' };
  const folderName: FolderName = { name: 'Folder name' };
  const getRequest = { page: 1, limit: 10, name: '' };
  const folder = mockFolder();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoldersController],
      providers: [
        { provide: FoldersService, useFactory: mockFoldersService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get(FoldersController);
    service = module.get(FoldersService);
  });

  describe('create()', () => {
    it('should return created folder', async () => {
      service.createFolder.mockResolvedValueOnce(folder);

      const result = await controller.create(
        { user: jwtUserMock },
        folderName,
        socketId,
      );

      expect(service.createFolder).toHaveBeenCalledWith(
        { ...folderName, userId: jwtUserMock.userId },
        socketId,
      );
      expect(result).toEqual(
        expectSuccess<IFolder>(
          'Folder created successfully.',
          folder,
          'folder',
        ),
      );
    });

    it('should throw when service fails', async () => {
      service.createFolder.mockRejectedValueOnce(new Error('Error'));
      await expectThrows(() =>
        controller.create({ user: jwtUserMock }, folderName, socketId),
      );
    });
  });

  describe('get()', () => {
    it('should return folders list', async () => {
      const foldersResponse = { data: [mockFolder()], total: 1 };
      service.getFolders.mockResolvedValueOnce(foldersResponse);

      const result = await controller.get({ user: jwtUserMock }, getRequest);

      expect(service.getFolders).toHaveBeenCalledWith({
        name: getRequest.name,
        page: getRequest.page,
        limit: getRequest.limit,
        userId: jwtUserMock.userId,
      });
      expect(result).toEqual(foldersResponse);
    });

    it('should throw when service fails', async () => {
      service.getFolders.mockRejectedValueOnce(new Error('Error'));
      await expectThrows(() =>
        controller.get({ user: jwtUserMock }, getRequest),
      );
    });
  });

  describe('rename()', () => {
    const renamedFolder = { ...folder, name: 'Renamed folder' };

    it('should return renamed folder', async () => {
      service.renameFolder.mockResolvedValueOnce(folder);

      const result = await controller.rename(folderId, renamedFolder, socketId);

      expect(service.renameFolder).toHaveBeenCalledWith(
        folderId.folderId,
        renamedFolder.name,
        socketId,
      );
      expect(result).toEqual(
        expectSuccess<IFolder>(
          'Folder renamed successfully.',
          folder,
          'folder',
        ),
      );
    });

    it('should throw when service fails', async () => {
      service.renameFolder.mockRejectedValueOnce(new Error('Error'));

      await expectThrows(() =>
        controller.rename(folderId, renamedFolder, socketId),
      );
    });
  });

  describe('delete()', () => {
    it('should return deleted folder', async () => {
      service.deleteFolder.mockResolvedValueOnce(folder);

      const result = await controller.delete(folderId, socketId);

      expect(service.deleteFolder).toHaveBeenCalledWith(
        folderId.folderId,
        socketId,
      );
      expect(result).toEqual(
        expectSuccess<IFolder>(
          'Folder deleted successfully.',
          folder,
          'folder',
        ),
      );
    });

    it('should throw when service fails', async () => {
      service.deleteFolder.mockRejectedValueOnce(new Error('Error'));
      await expectThrows(() => controller.delete(folderId, socketId));
    });
  });
});
