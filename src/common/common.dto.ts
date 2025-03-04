import { IsInt, IsPositive, Min } from 'class-validator';
import { applyDecorators } from '@nestjs/common';

export class ResponseStatusDto {
  success: boolean;
  message: string;
}

const paginationRules = [
  IsInt(),
  IsPositive({ message: 'Must be a positive number greater than zero.' }),
  Min(1, { message: 'Must be at least 1.' }),
];

export class PaginationDto {
  @applyDecorators(...paginationRules)
  page: number;

  @applyDecorators(...paginationRules)
  limit: number;
}

export class GetResponseDto extends PaginationDto {
  @applyDecorators(...paginationRules)
  pages: number;

  @IsInt()
  total: number;
}
