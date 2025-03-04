import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { PaginationDto, GetResponseDto } from 'src/common/common.dto';

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

export class CreateTaskPayload extends TaskBaseDto {
  @IsString()
  @IsUUID()
  userId: string;
}

export class TaskDto extends CreateTaskPayload {
  @IsString()
  @IsNotEmpty({ message: 'The task ID is required.' })
  id: string;

  @IsOptional()
  createdAt?: Date;
}

export class TaskResponseDto {
  success: boolean;
  task: TaskDto;
}

export class ManyTasksDto extends GetResponseDto {
  tasks: TaskDto[] = [];
}

export class GetTasksResponseDto {
  success: boolean;
  tasksData: ManyTasksDto;
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
  @IsString()
  @IsUUID()
  userId: string;
}

export class TaskIdDto {
  @IsString()
  @IsUUID()
  taskId: string;
}
