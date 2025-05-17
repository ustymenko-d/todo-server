import { Injectable } from '@nestjs/common';
import { WebSocketGateway } from '@nestjs/websockets';
import { BaseGateway } from './base.gateway';
import { ConfigService } from '@nestjs/config';
import { IFolder } from 'src/folders/folders.types';

@Injectable()
@WebSocketGateway()
export class FoldersGateway extends BaseGateway {
  constructor(configService: ConfigService) {
    super(configService);
  }

  emitFolderCreated(folder: IFolder, initiatorSocketId?: string) {
    this.emitEntityEvent<IFolder>(
      'folder',
      'created',
      folder,
      initiatorSocketId,
    );
  }

  emitFolderRenamed(folder: IFolder, initiatorSocketId?: string) {
    this.emitEntityEvent<IFolder>(
      'folder',
      'renamed',
      folder,
      initiatorSocketId,
    );
  }

  emitFolderDeleted(folder: IFolder, initiatorSocketId?: string) {
    this.emitEntityEvent<IFolder>(
      'folder',
      'deleted',
      folder,
      initiatorSocketId,
    );
  }
}
