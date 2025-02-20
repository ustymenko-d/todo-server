import { IsInt, IsPositive, Min } from 'class-validator';

export class ResponseStatusDto {
  success: boolean;
  message: string;
}

export class GetRequestDto {
  @IsInt()
  @IsPositive({ message: 'Page must be a positive number greater than zero.' })
  @Min(1, { message: 'Page must be at least 1.' })
  page: number;

  @IsInt()
  @IsPositive()
  @IsPositive({ message: 'Limit must be a positive number greater than zero.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  limit: number;
}

export class GetResponseDto extends GetRequestDto {
  pages: number;
  total: number;
}
