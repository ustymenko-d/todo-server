import { IFolder } from 'src/folders/folders.types';

export const mockFolder = (overrides: Partial<IFolder> = {}): IFolder => ({
  id: 'folder-is',
  name: 'Folder name',
  userId: 'user-id',
  ...overrides,
});
