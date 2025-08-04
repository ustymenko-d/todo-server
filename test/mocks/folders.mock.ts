import { IFolder } from 'src/folders/folders.types';
import { createMockMethods } from 'test/utils/createMockMethods';

export const mockFoldersService = () =>
  createMockMethods([
    'createFolder',
    'getFolders',
    'renameFolder',
    'deleteFolder',
  ] as const);

export type TFoldersServiceMock = ReturnType<typeof mockFoldersService>;

export const mockFoldersGateway = () =>
  createMockMethods([
    'emitFolderCreated',
    'emitFolderRenamed',
    'emitFolderDeleted',
  ] as const);

export type TFoldersGatewayMock = ReturnType<typeof mockFoldersGateway>;

export const mockFolder = (overrides: Partial<IFolder> = {}): IFolder => ({
  id: 'folder-id',
  name: 'Folder name',
  userId: 'user-id',
  ...overrides,
});
