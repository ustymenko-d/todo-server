import { IFolder } from 'src/folders/folders.types';

export const mockFoldersService = () => ({
  createFolder: jest.fn(),
  getFolders: jest.fn(),
  renameFolder: jest.fn(),
  deleteFolder: jest.fn(),
});

export const mockFolder = (overrides: Partial<IFolder> = {}): IFolder => ({
  id: 'folder-id',
  name: 'Folder name',
  userId: 'user-id',
  ...overrides,
});

export const mockFoldersGateway = {
  emitFolderCreated: jest.fn(),
  emitFolderRenamed: jest.fn(),
  emitFolderDeleted: jest.fn(),
};
