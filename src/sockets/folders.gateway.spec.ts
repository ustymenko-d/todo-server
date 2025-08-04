import { Test, TestingModule } from '@nestjs/testing';
import { FoldersGateway } from './folders.gateway';
import {
  createMockConfigService,
  createMockSocketServer,
} from 'test/mocks/sockets.mock';
import { ConfigService } from '@nestjs/config';
import { mockFolder } from 'test/mocks/folders.mock';

describe('FoldersGateway', () => {
  let gateway: FoldersGateway;
  let emitEntityEventSpy: jest.SpyInstance;
  const folder = mockFolder();

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
    (gateway as any).server = createMockSocketServer();

    emitEntityEventSpy = jest.spyOn(gateway as any, 'emitEntityEvent');
  });

  const testCases: Array<{
    method: keyof FoldersGateway;
    action: string;
  }> = [
    { method: 'emitFolderCreated', action: 'created' },
    { method: 'emitFolderRenamed', action: 'renamed' },
    { method: 'emitFolderDeleted', action: 'deleted' },
  ];

  testCases.forEach(({ method, action }) => {
    it(`should emit "folder:${action}" via ${method}`, () => {
      (gateway[method] as any)(folder, 'socket-id');

      expect(emitEntityEventSpy).toHaveBeenCalledWith(
        'folder',
        action,
        folder,
        'socket-id',
      );
    });
  });
});
