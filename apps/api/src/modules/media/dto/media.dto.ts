import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { MEDIA } from '@juhar/shared';

/** The text fields sent along with an uploaded photo (the file itself is the multipart part named "file") */
export class UploadMediaDto {
  @ApiPropertyOptional({ description: 'A short description of the photo, for screen readers (the product title is used when empty)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ description: 'The colour this photo shows (a variant of the same product)' })
  @IsOptional()
  @IsUUID()
  variantId?: string;
}

export class UpdateMediaDto {
  @ApiPropertyOptional({ description: 'The description; send an empty text or null to clear it', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  altText?: string | null;

  @ApiPropertyOptional({ description: 'The colour this photo shows; send null to show it for the whole saree', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  variantId?: string | null;
}

export class ReorderMediaDto {
  @ApiPropertyOptional({ description: 'Every photo id of the product, in the new order (the first is the cover)', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MEDIA.MAX_PER_PRODUCT)
  @IsUUID('all', { each: true })
  ids!: string[];
}
