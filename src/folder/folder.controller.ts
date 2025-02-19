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
import { FolderService } from './folder.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtUserDto } from 'src/auth/auth.dto';
import { FolderOwnerGuard } from './folder-owner.guard';
import {
  FolderNameDto,
  FolderResponseDto,
  GetFolderRequestDto,
  GetFolderResponseDto,
} from './folder.dto';

@Controller('folder')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  private readonly logger = new Logger(FolderController.name);

  private handleError(message: string, error: Error): never {
    this.logger.error(message, error.stack);
    throw error;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Req() req: { user: JwtUserDto },
    @Body() body: FolderNameDto,
  ): Promise<FolderResponseDto> {
    try {
      const payload = {
        name: body.name,
        userId: req.user.userId,
      };
      const createdFolder = await this.folderService.createFolder(payload);
      return { message: 'Folder create successfully', folder: createdFolder };
    } catch (error) {
      this.handleError('Eror while creating folder:', error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async get(
    @Req() req: { user: JwtUserDto },
    @Query() query: GetFolderRequestDto,
  ): Promise<GetFolderResponseDto> {
    try {
      const { page, limit, name } = query;
      const payload = {
        name,
        page: Number(page),
        limit: Number(limit),
        userId: req.user.userId,
      };
      return await this.folderService.getFolders(payload);
    } catch (error) {
      this.handleError('Eror while fetching folder:', error);
    }
  }

  @UseGuards(AuthGuard('jwt'), FolderOwnerGuard)
  @Patch(':folderId')
  async rename(
    @Param('folderId') folderId: string,
    @Body() body: FolderNameDto,
  ): Promise<FolderResponseDto> {
    try {
      const renamedFolder = await this.folderService.renameFolder(
        folderId,
        body.name,
      );
      return { message: 'Folder rename successfully', folder: renamedFolder };
    } catch (error) {
      this.handleError('Eror while renaminging folder:', error);
    }
  }

  @UseGuards(AuthGuard('jwt'), FolderOwnerGuard)
  @Delete(':folderId')
  async delete(
    @Param('folderId') folderId: string,
  ): Promise<FolderResponseDto> {
    try {
      const deletedFolder = await this.folderService.deleteFolder(folderId);
      return { message: 'Folder deleted successfully', folder: deletedFolder };
    } catch (error) {
      this.handleError('Eror while deleting folder:', error);
    }
  }
}
