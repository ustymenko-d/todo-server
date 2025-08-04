import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FoldersService } from './folders.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { FoldersGateway } from 'src/sockets/folders.gateway';
import { mockPrisma } from 'test/mocks/prisma.mock';
import {
  mockFolder,
  mockFoldersGateway,
  TFoldersGatewayMock,
} from 'test/mocks/folders.mock';
import { IGetFoldersPayload } from './folders.types';
import { socketId } from 'test/mocks/sockets.mock';

describe('FoldersService', () => {
  let service: FoldersService;
  let gatewayMock: TFoldersGatewayMock;

  const userId = 'user-id';
  const newFolderPayload = { name: 'New Folder', userId };
  const defaultFolder = mockFolder();
  const oldFolder = mockFolder({ name: 'Old name' });
  const updatedFolder = mockFolder({ name: 'New name' });
  const deletedFolder = mockFolder();

  const expectForbidden = async (count: number, isVerified: boolean) => {
    mockPrisma.user.findUnique.mockResolvedValue({ isVerified });
    mockPrisma.folder.count.mockResolvedValue(count);

    await expect(service.createFolder(newFolderPayload)).rejects.toThrow(
      ForbiddenException,
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    gatewayMock = mockFoldersGateway();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoldersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FoldersGateway, useValue: gatewayMock },
      ],
    }).compile();

    service = module.get(FoldersService);
  });

  describe('createFolder', () => {
    it('creates folder and emits event for allowed user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isVerified: true });
      mockPrisma.folder.count.mockResolvedValue(0);
      mockPrisma.folder.create.mockResolvedValue(defaultFolder);

      const result = await service.createFolder(newFolderPayload, socketId);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { isVerified: true },
      });
      expect(mockPrisma.folder.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockPrisma.folder.create).toHaveBeenCalledWith({
        data: newFolderPayload,
      });
      expect(gatewayMock.emitFolderCreated).toHaveBeenCalledWith(
        defaultFolder,
        socketId,
      );
      expect(result).toEqual(defaultFolder);
    });

    test.each`
      count | isVerified | desc
      ${3}  | ${false}   | ${'unverified has ≥3 folders'}
      ${25} | ${true}    | ${'verified has ≥25 folders'}
    `('throws ForbiddenException if $desc', async ({ count, isVerified }) => {
      await expectForbidden(count, isVerified);
    });
  });

  describe('getFolders', () => {
    it('returns paginated result', async () => {
      const folders = [defaultFolder];
      const total = 1;
      const req: IGetFoldersPayload = {
        page: 2,
        limit: 5,
        name: 'abc',
        userId,
      };

      mockPrisma.$transaction.mockResolvedValueOnce([folders, total]);
      const res = await service.getFolders(req);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith([
        mockPrisma.folder.findMany({
          where: {
            userId,
            name: { contains: req.name, mode: 'insensitive' },
          },
          skip: (req.page - 1) * req.limit,
          take: req.limit,
        }),
        mockPrisma.folder.count({
          where: {
            userId,
            name: { contains: req.name, mode: 'insensitive' },
          },
        }),
      ]);
      expect(res).toEqual({
        folders,
        page: req.page,
        limit: req.limit,
        total,
        pages: Math.ceil(total / req.limit),
      });
    });
  });

  describe('renameFolder', () => {
    it('renames existing folder and emits event', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(oldFolder);
      mockPrisma.folder.update.mockResolvedValue(updatedFolder);

      const res = await service.renameFolder(
        'folder-id',
        updatedFolder.name,
        socketId,
      );

      expect(mockPrisma.folder.findUnique).toHaveBeenCalledWith({
        where: { id: 'folder-id' },
        select: { name: true },
      });
      expect(mockPrisma.folder.update).toHaveBeenCalledWith({
        where: { id: 'folder-id' },
        data: { name: updatedFolder.name },
      });
      expect(gatewayMock.emitFolderRenamed).toHaveBeenCalledWith(
        updatedFolder,
        socketId,
      );
      expect(res).toEqual(updatedFolder);
    });

    it('throws NotFoundException when folder not found', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(null);
      await expect(service.renameFolder('folder-id', 'any')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteFolder', () => {
    it('deletes folder and emits event', async () => {
      mockPrisma.folder.delete.mockResolvedValue(deletedFolder);

      const res = await service.deleteFolder('folder-id', socketId);

      expect(mockPrisma.folder.delete).toHaveBeenCalledWith({
        where: { id: 'folder-id' },
      });
      expect(gatewayMock.emitFolderDeleted).toHaveBeenCalledWith(
        deletedFolder,
        socketId,
      );
      expect(res).toEqual(deletedFolder);
    });
  });
});
