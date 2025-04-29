import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
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

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsUUID()
  parentTaskId?: string | null;

  @IsOptional()
  @IsISO8601()
  startDate?: Date | null;

  @IsOptional()
  @IsISO8601()
  @IsAfterDate('startDate', {
    message: 'expiresDate must be later than startDate',
  })
  expiresDate?: Date | null;

  @IsOptional()
  @IsUUID()
  folderId?: string | null;
}

export class Task extends TaskBase {
  @IsUUID()
  id: string;

  @IsUUID()
  userId: string;
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

function IsAfterDate(property: string, validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterDate',
      target: target.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(
          value: string | null | undefined,
          { constraints, object }: ValidationArguments,
        ) {
          const relatedPropertyName = constraints[0] as string;
          const relatedValue = (
            object as Record<string, string | null | undefined>
          )[relatedPropertyName];

          if (!value || !relatedValue) return true;

          const startDate = new Date(relatedValue);
          const endDate = new Date(value);

          return (
            !isNaN(startDate.getTime()) &&
            !isNaN(endDate.getTime()) &&
            endDate >= startDate
          );
        },

        defaultMessage({ property, constraints }: ValidationArguments) {
          return `The "${property}" must be the same as or later than ${constraints[0]}.`;
        },
      },
    });
  };
}
