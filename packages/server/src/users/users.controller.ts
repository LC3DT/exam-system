import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from '@exam/shared';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles('admin', 'teacher')
  @Get()
  list(@Query() query: any) {
    return this.usersService.list(query);
  }

  @Roles('admin', 'teacher')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Roles('admin')
  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  @Roles('admin')
  @Put(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body: ResetPasswordDto) {
    return this.usersService.resetPassword(id, body.password);
  }
}
