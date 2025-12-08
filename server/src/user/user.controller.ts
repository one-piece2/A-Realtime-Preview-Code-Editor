import { Controller,Get,Param } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entitiey';
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}


  @Get(':id')
  async findone(@Param('id') id: string): Promise<User> {
    return this.userService.findone(id);
  }
}
