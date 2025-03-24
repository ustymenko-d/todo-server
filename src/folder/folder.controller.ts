import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FolderOwnerGuard } from './folder-owner.guard';
import { FolderService } from './folder.service';
import { RequestHandlerService } from 'src/common/request-handler.service';
import { FolderIdDto, FolderNameDto } from './folder.dto';
import {
  IFolderResponse,
  IGetFolderRequest,
  IGetFolderResponse,
} from './folder.types';
import { IJwtUser } from 'src/common/common.types';

@Controller('folder')
export class FolderController {
  constructor(
    private readonly folderService: FolderService,
    private readonly requestHandlerService: RequestHandlerService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Req()
    req: { user: IJwtUser },
    @Body() body: FolderNameDto,
  ): Promise<IFolderResponse> {
    return this.requestHandlerService.handleRequest(async () => {
      const payload = {
        name: body.name,
        userId: req.user.userId,
      };
      return {
        success: true,
        message: 'Folder create successfully',
        folder: await this.folderService.createFolder(payload),
      };
    }, 'Eror while creating folder');
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async get(
    @Req()
    req: { user: IJwtUser },
    @Query() query: IGetFolderRequest,
  ): Promise<IGetFolderResponse> {
    return this.requestHandlerService.handleRequest(async () => {
      const { page, limit, name } = query;
      const payload = {
        name,
        page: +page,
        limit: +limit,
        userId: req.user.userId,
      };
      return await this.folderService.getFolders(payload);
    }, 'Eror while fetching folder');
  }

  @UseGuards(AuthGuard('jwt'), FolderOwnerGuard)
  @Patch(':folderId')
  async rename(
    @Param() { folderId }: FolderIdDto,
    @Body() { name }: FolderNameDto,
  ): Promise<IFolderResponse> {
    return this.requestHandlerService.handleRequest(async () => {
      return {
        success: true,
        message: 'Folder rename successfully',
        folder: await this.folderService.renameFolder(folderId, name),
      };
    }, 'Eror while renaminging folder');
  }

  @UseGuards(AuthGuard('jwt'), FolderOwnerGuard)
  @Delete(':folderId')
  async delete(@Param() { folderId }: FolderIdDto): Promise<IFolderResponse> {
    return this.requestHandlerService.handleRequest(async () => {
      return {
        success: true,
        message: 'Folder deleted successfully',
        folder: await this.folderService.deleteFolder(folderId),
      };
    }, 'Eror while deleting folder');
  }
}
