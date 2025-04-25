import { GetResponseDto, PaginationDto } from 'src/common/common.dto';
import { FolderNameDto } from './folders.dto';
import { IResponseStatus } from 'src/common/common.types';

export interface ICreateFolderPayload {
  name: string;
  userId: string;
}

export type IGetFolderRequest = PaginationDto & FolderNameDto;
export type IGetFolderPayload = IGetFolderRequest & ICreateFolderPayload;

export interface IFolder extends ICreateFolderPayload {
  id: string;
}

export interface IFolderResponse extends IResponseStatus {
  folder: IFolder;
}

export interface IGetFolderResponse extends GetResponseDto {
  folders: IFolder[];
}
