import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { GetRequestDto } from 'src/common/common.dto';

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

export class GetTasksPayloadDto extends GetRequestDto {
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
