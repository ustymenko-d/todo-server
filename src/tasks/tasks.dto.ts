import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

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
}

export class TaskBaseAndOwnerDto extends TaskBaseDto {
  @IsString()
  userId: string;
}

export class TaskDto extends TaskBaseAndOwnerDto {
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

export class ManyTasksDto {
  tasks: TaskDto[] = [];
  total: number;
  page: number;
  pages: number;
}

export class GetTasksResponseDto {
  success: boolean;
  tasksData: ManyTasksDto;
}

export class GetTasksPayloadDto {
  @IsNumber()
  @Min(1, { message: 'Page must be at least 1.' })
  page: number;

  @IsNumber()
  @Min(1, { message: 'Limit must be at least 1.' })
  limit: number;

  @IsBoolean({ message: 'Invalid value.' })
  @IsOptional()
  completed?: boolean;

  @IsBoolean()
  @IsOptional()
  topLayerTasks?: boolean;

  @IsString()
  @IsOptional()
  taskId?: string;
}

export class GetTasksRequestDto extends GetTasksPayloadDto {
  @IsString()
  userId: string;
}
