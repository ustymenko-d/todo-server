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
  @Matches(/^[a-zA-Z0-9 ]*$/, {
    message:
      'The folder name must contain at least one letter or digits. Cyrillic characters are not allowed.',
  })
  name: string;
}

export class FolderId {
  @IsNotEmpty()
  @IsUUID()
  folderId: string;
}
