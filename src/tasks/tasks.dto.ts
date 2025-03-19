import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { PaginationDto } from 'src/common/common.dto';

export class TaskBaseDto {
  @IsString()
  @IsNotEmpty({ message: 'The title is required.' })
  @MinLength(2, { message: 'The title must be at least 2 characters long.' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsBoolean({ message: 'Invalid value.' })
  completed: boolean;

  @IsString()
  @IsOptional()
  parentTaskId?: string | null;

  @IsOptional()
  expiresAt?: Date | null;

  @IsUUID()
  @IsOptional()
  folderId?: string | null;
}

export class TaskDto extends TaskBaseDto {
  @IsString()
  @IsNotEmpty({ message: 'The task ID is required.' })
  id: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  createdAt?: Date;
}

export class GetTasksRequestDto extends PaginationDto {
  @IsString({ message: 'Invalid value.' })
  @IsOptional()
  title?: string;

  @IsBoolean({ message: 'Invalid value.' })
  @IsOptional()
  completed?: boolean;

  @IsBoolean()
  @IsOptional()
  topLayerTasks?: boolean;

  @IsString()
  @IsOptional()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string | null;
}

export class GetTasksPayloadDto extends GetTasksRequestDto {
  @IsUUID()
  userId: string;
}

export class TaskIdDto {
  @IsUUID()
  taskId: string;
}
