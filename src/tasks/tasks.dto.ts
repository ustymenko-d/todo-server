import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Pagination } from 'src/common/common.dto';

export class TaskBase {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string | null;

  @IsBoolean()
  completed: boolean;

  @IsOptional()
  @IsUUID()
  parentTaskId?: string | null;

  @IsOptional()
  @IsDate()
  expiresAt?: Date | null;

  @IsOptional()
  @IsUUID()
  folderId?: string | null;
}

export class Task extends TaskBase {
  @IsUUID()
  id: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsDate()
  createdAt?: Date;
}

export class GetTasksRequest extends Pagination {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsBoolean()
  topLayerTasks?: boolean;

  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string | null;
}

export class TaskId {
  @IsUUID()
  taskId: string;
}
