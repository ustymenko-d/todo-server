import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FolderOwner } from './folders.guard';
import { FoldersService } from './folders.service';
import { handleRequest } from 'src/common/utils/requestHandler';
import { IJwtUser } from 'src/common/common.types';
import { Pagination } from 'src/common/common.dto';
import { FolderId, FolderName } from './folders.dto';
import { IFolderResponse, IGetFoldersResponse } from './folders.types';
import { RecaptchaGuard } from 'src/common/recaptcha.guard';
import { StripRecaptchaInterceptor } from 'src/common/strip-recaptcha.interceptor';

@Controller('folders')
export class FoldersController {
  private readonly logger = new Logger(FoldersController.name);

  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @UseGuards(RecaptchaGuard, AuthGuard('jwt'))
  @UseInterceptors(StripRecaptchaInterceptor)
  async create(
    @Req() req: { user: IJwtUser },
    @Body() { name }: FolderName,
    @Headers('x-socket-id') socketId?: string,
  ): Promise<IFolderResponse> {
    return handleRequest(
      async () => ({
        success: true,
        message: 'Folder created successfully.',
        folder: await this.foldersService.createFolder(
          { name, userId: req.user.userId },
          socketId,
        ),
      }),
      'Eror while creating folder.',
      this.logger,
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async get(
    @Req() req: { user: IJwtUser },
    @Query() query: Pagination & FolderName,
  ): Promise<IGetFoldersResponse> {
    return handleRequest(
      async () => {
        const { page, limit, name } = query;
        return await this.foldersService.getFolders({
          name,
          page: +page,
          limit: +limit,
          userId: req.user.userId,
        });
      },
      'Eror while fetching folders',
      this.logger,
    );
  }

  @Patch(':folderId')
  @UseGuards(AuthGuard('jwt'), FolderOwner)
  async rename(
    @Param() { folderId }: FolderId,
    @Body() { name }: FolderName,
    @Headers('x-socket-id') socketId?: string,
  ): Promise<IFolderResponse> {
    return handleRequest(
      async () => ({
        success: true,
        message: 'Folder renamed successfully.',
        folder: await this.foldersService.renameFolder(
          folderId,
          name,
          socketId,
        ),
      }),
      'Eror while renaminging folder.',
      this.logger,
    );
  }

  @Delete(':folderId')
  @UseGuards(AuthGuard('jwt'), FolderOwner)
  async delete(
    @Param() { folderId }: FolderId,
    @Headers('x-socket-id') socketId?: string,
  ): Promise<IFolderResponse> {
    return handleRequest(
      async () => ({
        success: true,
        message: 'Folder deleted successfully.',
        folder: await this.foldersService.deleteFolder(folderId, socketId),
      }),
      'Eror while deleting folder.',
      this.logger,
    );
  }
}
