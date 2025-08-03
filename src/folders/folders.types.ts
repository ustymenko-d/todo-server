import { IPagination, IResponseStatus } from 'src/common/common.types';

export interface ICreateFolderPayload {
  name: string;
  userId: string;
}

export interface IFolder extends ICreateFolderPayload {
  id: string;
}

export interface IGetFoldersPayload
  extends Omit<IPagination, 'pages' | 'total'>,
    ICreateFolderPayload {}

export interface IFolderResponse extends IResponseStatus {
  folder: IFolder;
}

export interface IGetFoldersResponse extends IPagination {
  folders: IFolder[];
}
