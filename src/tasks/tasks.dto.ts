import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

type TaskStatus = 'IN_PROGRESS' | 'COMPLETED';

interface ITaskBase {
  title: string;
  description?: string | null;
  status: TaskStatus;
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

  @IsEnum(['IN_PROGRESS', 'COMPLETED'], { message: 'Invalid status.' })
  status: TaskStatus;

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

  @IsEnum(['IN_PROGRESS', 'COMPLETED'], { message: 'Invalid status.' })
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsOptional()
  topLayerTasks?: boolean;

  @IsString()
  @IsOptional()
  taskId?: string;
}
