import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto';

const MAX_ADDRESSES = 10;

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all addresses for a user, default first.
   */
  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Create a new address.
   * Max 10 per user. If isDefault=true or first address, unset other defaults.
   */
  async create(userId: string, dto: CreateAddressDto) {
    const count = await this.prisma.address.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) {
      throw new BadRequestException(`Maximum ${MAX_ADDRESSES} addresses allowed`);
    }

    const isFirst = count === 0;
    const shouldBeDefault = dto.isDefault || isFirst;

    return this.prisma.$transaction(async (tx) => {
      // Unset existing default if this one will be default
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          line1: dto.line1,
          line2: dto.line2,
          landmark: dto.landmark,
          city: dto.city,
          district: dto.district,
          state: dto.state ?? 'Odisha',
          pinCode: dto.pinCode,
          label: dto.label,
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  /**
   * Update an address. Ownership check enforced.
   * If setting as default, unset others. A customer who has addresses always has exactly one default,
   * so turning the default off is ignored (the way to change it is to make another address the default).
   */
  async update(userId: string, id: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findFirst({
      where: { id, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    // "not the default" for the address that is the default would leave the customer with none
    const isDefault = dto.isDefault === false && address.isDefault ? undefined : dto.isDefault;

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: {
          ...(dto.recipientName !== undefined && { recipientName: dto.recipientName }),
          ...(dto.recipientPhone !== undefined && { recipientPhone: dto.recipientPhone }),
          ...(dto.line1 !== undefined && { line1: dto.line1 }),
          ...(dto.line2 !== undefined && { line2: dto.line2 }),
          ...(dto.landmark !== undefined && { landmark: dto.landmark }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(dto.district !== undefined && { district: dto.district }),
          ...(dto.state !== undefined && { state: dto.state }),
          ...(dto.pinCode !== undefined && { pinCode: dto.pinCode }),
          ...(dto.label !== undefined && { label: dto.label }),
          ...(isDefault !== undefined && { isDefault }),
        },
      });
    });
  }

  /**
   * Delete an address. Ownership check enforced. Orders keep their own copy of the address they were
   * placed with (order.addressSnapshot), so deleting a saved address never changes a past order.
   * If the default is deleted, the most recently added of the remaining addresses becomes the default.
   */
  async delete(userId: string, id: string) {
    await this.prisma.$transaction(async (tx) => {
      // read inside the transaction, so "was it the default?" is the answer at the moment of deleting
      const address = await tx.address.findFirst({ where: { id, userId } });
      if (!address) throw new NotFoundException('Address not found');

      // deleteMany: two deletes at once cannot both succeed (the loser gets "not found", not a 500)
      const removed = await tx.address.deleteMany({ where: { id, userId } });
      if (removed.count === 0) throw new NotFoundException('Address not found');
      if (!address.isDefault) return;

      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    });
    return { message: 'Address deleted' };
  }
}
