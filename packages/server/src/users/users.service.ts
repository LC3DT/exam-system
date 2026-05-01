import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async list(query: { role?: string; orgId?: string; page?: number; pageSize?: number }) {
    const role = query.role;
    const orgId = query.orgId;
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 20);
    const where: any = { isActive: true };
    if (role) where.role = role;
    if (orgId) where.orgId = orgId;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { id: true, username: true, realName: true, role: true, orgId: true, createdAt: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async create(data: { username: string; password: string; realName: string; role: string; orgId?: string }) {
    const existing = await this.findByUsername(data.username);
    if (existing) throw new ConflictException('用户名已存在');

    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: { ...data, passwordHash },
      select: { id: true, username: true, realName: true, role: true, orgId: true, createdAt: true },
    });
  }

  async update(id: string, data: { realName?: string; role?: string; orgId?: string; isActive?: boolean }) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, realName: true, role: true, orgId: true },
    });
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findById(id);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: '密码已重置' };
  }
}
