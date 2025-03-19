import { IsInt, IsPositive, Min } from 'class-validator';
import { applyDecorators } from '@nestjs/common';

const paginationRulesDto = [
  IsInt(),
  IsPositive({ message: 'Must be a positive number greater than zero.' }),
  Min(1, { message: 'Must be at least 1.' }),
];

export class PaginationDto {
  @applyDecorators(...paginationRulesDto)
  page: number;

  @applyDecorators(...paginationRulesDto)
  limit: number;
}

export class GetResponseDto extends PaginationDto {
  @applyDecorators(...paginationRulesDto)
  pages: number;

  @IsInt()
  total: number;
}
