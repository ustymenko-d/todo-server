import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

interface ITaskBase {
  title: string;
  description?: string | null;
  completed: boolean;
  userId: string;
  parentTaskId?: string | null;
  expiresAt?: Date | null;
}

export class TaskBaseDto implements ITaskBase {
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
  @IsNotEmpty({ message: 'The user ID is required.' })
  userId: string;

  @IsString()
  @IsOptional()
  parentTaskId?: string | null;

  @IsOptional()
  expiresAt?: Date | null;
}

export class TaskDto extends TaskBaseDto {
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

export class GetTasksRequestDto {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsBoolean({ message: 'Invalid value.' })
  @IsOptional()
  completed: boolean;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsOptional()
  topLayerTasks?: boolean;

  @IsString()
  @IsOptional()
  taskId?: string;
}
