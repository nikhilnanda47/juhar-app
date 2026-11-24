import {
  Controller, Get, Post, Delete, Param, Body, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto';

@ApiTags('Wishlist')
@Controller('api/v1/wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async getWishlist(@CurrentUser() user: AuthenticatedUser) {
    return this.wishlistService.getWishlist(user.id);
  }

  @Post()
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddToWishlistDto,
  ) {
    return this.wishlistService.addItem(user.id, dto);
  }

  @Delete(':variantId')
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.wishlistService.removeItem(user.id, variantId);
  }

  @Post('items/:variantId/toggle')
  async toggleItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.wishlistService.toggleItem(user.id, variantId);
  }

  @Get(':variantId/check')
  async checkItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.wishlistService.checkItem(user.id, variantId);
  }
}
