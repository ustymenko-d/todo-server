import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class FolderNameDto {
  @IsString()
  @IsNotEmpty({ message: 'The folder name is required.' })
  @MinLength(2, {
    message: 'The folder name must be at least 2 characters long.',
  })
  @MaxLength(20, {
    message: 'The folder name must not exceed 20 characters',
  })
  @Matches(/^[a-zA-Z0-9 ]*$/, {
    message:
      'The folder name must contain at least one letter (a-z or A-Z) or digits. Cyrillic characters are not allowed.',
  })
  name: string;
}

export class FolderIdDto {
  @IsUUID()
  @IsNotEmpty({ message: 'The folder ID is required.' })
  folderId: string;
}
