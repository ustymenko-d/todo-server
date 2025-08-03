import { Test, TestingModule } from '@nestjs/testing';
import { FoldersGateway } from './folders.gateway';
import {
  createMockConfigService,
  createMockSocketServer,
} from 'test/mocks/sockets.mock';
import { Server } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { mockFolder } from 'test/mocks/folders.mock';

describe('FoldersGateway', () => {
  let gateway: FoldersGateway;
  let emitEntityEventSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoldersGateway,
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
      ],
    }).compile();

    gateway = module.get<FoldersGateway>(FoldersGateway);
    (gateway as any).server = createMockSocketServer() as Server;

    emitEntityEventSpy = jest.spyOn<any, any>(gateway, 'emitEntityEvent');
  });

  const folder = mockFolder();

  describe('emitFolderCreated', () => {
    it('should emit "folder:created" event', () => {
      gateway.emitFolderCreated(folder, 'socket-id');
      expect(emitEntityEventSpy).toHaveBeenCalledWith(
        'folder',
        'created',
        folder,
        'socket-id',
      );
    });
  });

  describe('emitFolderRenamed', () => {
    it('should emit "folder:renamed" event', () => {
      gateway.emitFolderRenamed(folder, 'socket-id');
      expect(emitEntityEventSpy).toHaveBeenCalledWith(
        'folder',
        'renamed',
        folder,
        'socket-id',
      );
    });
  });

  describe('emitFolderDeleted', () => {
    it('should emit "folder:deleted" event', () => {
      gateway.emitFolderDeleted(folder, 'socket-id');
      expect(emitEntityEventSpy).toHaveBeenCalledWith(
        'folder',
        'deleted',
        folder,
        'socket-id',
      );
    });
  });
});
