import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class FolderName {
  @IsNotEmpty()
  @IsString()
  @MaxLength(25, {
    message: 'The folder name must not exceed 25 characters',
  })
  @Matches(/^[\p{L}0-9 _-]+$/u, {
    message: 'The folder name must contain only letters, digits and spaces.',
  })
  name: string;
}

export class FolderId {
  @IsNotEmpty()
  @IsUUID()
  folderId: string;
}
