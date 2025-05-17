import { OwnerGuardFactory } from 'src/common/owner.guard.factory';

export const FolderOwner = OwnerGuardFactory(
  'folder',
  (req) => req.params.folderId,
);
