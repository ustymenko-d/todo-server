import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PaginationDto,
  GetResponseDto,
  ResponseStatusDto,
} from 'src/common/common.dto';

export class FolderNameDto {
  @IsString()
  @IsNotEmpty({ message: 'The folder name is required.' })
  @MinLength(2, {
    message: 'The folder name must be at least 2 characters long.',
  })
  @MaxLength(20, {
    message: 'The folder name must not exceed 20 characters',
  })
  @Matches(/(?=.*[a-z])|(?=.*[A-Z])/, {
    message:
      'The folder name must contain at least one lowercase or one uppercase letter.',
  })
  name: string;
}

export class FolderIdDto {
  @IsUUID()
  @IsNotEmpty({ message: 'The folder ID is required.' })
  folderId: string;
}

export class RenameFolderDto extends FolderNameDto {
  @IsUUID()
  @IsNotEmpty({ message: 'The folder ID is required.' })
  folderId: string;
}

export class FolderPayloadDto extends FolderNameDto {
  @IsUUID()
  @IsNotEmpty({ message: 'The user ID is required.' })
  userId: string;
}

export type GetFolderRequestDto = PaginationDto & FolderNameDto;
export type GetFolderPayloadDto = GetFolderRequestDto & FolderPayloadDto;

export class FolderDto extends FolderPayloadDto {
  id: string;
}

export class FolderResponseDto extends ResponseStatusDto {
  folder: FolderDto;
}

export class GetFolderResponseDto extends GetResponseDto {
  folders: FolderDto[] = [];
}
