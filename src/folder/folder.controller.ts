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
import { FolderService } from './folder.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtUserDto } from 'src/auth/auth.dto';
import { FolderOwnerGuard } from './folder-owner.guard';
import {
  FolderIdDto,
  FolderNameDto,
  FolderResponseDto,
  GetFolderRequestDto,
  GetFolderResponseDto,
} from './folder.dto';
import { RequestHandlerService } from 'src/common/request-handler.service';

@Controller('folder')
export class FolderController {
  constructor(
    private readonly folderService: FolderService,
    private readonly requestHandlerService: RequestHandlerService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Req() req: { user: JwtUserDto },
    @Body() body: FolderNameDto,
  ): Promise<FolderResponseDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const payload = {
        name: body.name,
        userId: req.user.userId,
      };
      const createdFolder = await this.folderService.createFolder(payload);
      return {
        success: true,
        message: 'Folder create successfully',
        folder: createdFolder,
      };
    }, 'Eror while creating folder');
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async get(
    @Req() req: { user: JwtUserDto },
    @Query() query: GetFolderRequestDto,
  ): Promise<GetFolderResponseDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const { page, limit, name } = query;
      const payload = {
        name,
        page: Number(page),
        limit: Number(limit),
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
  ): Promise<FolderResponseDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const renamedFolder = await this.folderService.renameFolder({
        folderId,
        name,
      });
      return {
        success: true,
        message: 'Folder rename successfully',
        folder: renamedFolder,
      };
    }, 'Eror while renaminging folder');
  }

  @UseGuards(AuthGuard('jwt'), FolderOwnerGuard)
  @Delete(':folderId')
  async delete(@Param() { folderId }: FolderIdDto): Promise<FolderResponseDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const deletedFolder = await this.folderService.deleteFolder({ folderId });
      return {
        success: true,
        message: 'Folder deleted successfully',
        folder: deletedFolder,
      };
    }, 'Eror while deleting folder');
  }
}
