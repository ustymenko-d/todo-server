import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FolderOwner } from './folders.guard';
import { FoldersService } from './folders.service';
import { FolderIdDto, FolderNameDto } from './folders.dto';
import {
  IFolderResponse,
  IGetFolderRequest,
  IGetFolderResponse,
} from './folders.types';
import { IJwtUser } from 'src/common/common.types';
import { handleRequest } from 'src/common/utils/requestHandler';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Req()
    req: { user: IJwtUser },
    @Body() body: FolderNameDto,
  ): Promise<IFolderResponse> {
    return handleRequest(
      async () => {
        const payload = {
          name: body.name,
          userId: req.user.userId,
        };
        return {
          success: true,
          message: 'Folder create successfully',
          folder: await this.foldersService.createFolder(payload),
        };
      },
      'Eror while creating folder',
      this.logger,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async get(
    @Req()
    req: { user: IJwtUser },
    @Query() query: IGetFolderRequest,
  ): Promise<IGetFolderResponse> {
    return handleRequest(
      async () => {
        const { page, limit, name } = query;
        const payload = {
          name,
          page: +page,
          limit: +limit,
          userId: req.user.userId,
        };
        return await this.foldersService.getFolders(payload);
      },
      'Eror while fetching folder',
      this.logger,
    );
  }

  @UseGuards(AuthGuard('jwt'), FolderOwner)
  @Patch(':folderId')
  async rename(
    @Param() { folderId }: FolderIdDto,
    @Body() { name }: FolderNameDto,
  ): Promise<IFolderResponse> {
    return handleRequest(
      async () => {
        return {
          success: true,
          message: 'Folder rename successfully',
          folder: await this.foldersService.renameFolder(folderId, name),
        };
      },
      'Eror while renaminging folder',
      this.logger,
    );
  }

  @UseGuards(AuthGuard('jwt'), FolderOwner)
  @Delete(':folderId')
  async delete(@Param() { folderId }: FolderIdDto): Promise<IFolderResponse> {
    return handleRequest(
      async () => {
        return {
          success: true,
          message: 'Folder deleted successfully',
          folder: await this.foldersService.deleteFolder(folderId),
        };
      },
      'Eror while deleting folder',
      this.logger,
    );
  }

  private readonly logger = new Logger(FoldersController.name);
}
