import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ResponseStatusDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class GetRequestDto {
  @IsNumber()
  @Min(1, { message: 'Page must be at least 1.' })
  page: number;

  @IsNumber()
  @Min(1, { message: 'Limit must be at least 1.' })
  limit: number;
}

export class GetResponseDto extends GetRequestDto {
  @IsNumber()
  pages: number;

  @IsNumber()
  total: number;
}
