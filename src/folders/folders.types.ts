import { Pagination } from 'src/common/common.dto';
import { IResponseStatus } from 'src/common/common.types';

export interface ICreateFolderPayload {
  name: string;
  userId: string;
}

export interface IFolder extends ICreateFolderPayload {
  id: string;
}

export type TGetFoldersPayload = Pagination & ICreateFolderPayload;

export interface IFolderResponse extends IResponseStatus {
  folder: IFolder;
}

export interface IGetFoldersResponse extends Pagination {
  pages: number;
  total: number;
  folders: IFolder[];
}
