import { Controller,UseGuards,Post, Body,Get,Param, Patch,Delete,HttpCode,HttpStatus } from '@nestjs/common';
import { RoomService } from './room.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from 'src/user/entities/user.entitiey';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
@Controller('room')
@UseGuards(JwtAuthGuard)
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  
   //创建房间
  @Post()
  async createRoom(@CurrentUser() user: User, @Body() dto: CreateRoomDto) {
    const room = await this.roomService.createRoom(user.id, dto);
    return {
      success: true,
      data: room,
      message: '房间创建成功',
    };
  }

  
 // 获取用户的所有房间
  @Get()
  async getUserRooms(@CurrentUser() user: User) {
    const rooms = await this.roomService.getUserRooms(user.id);
    return {
      success: true,
      data: rooms,
    };
  }

   
   //获取房间详情
  @Get(':roomId')
  async getRoom(@CurrentUser() user: User, @Param('roomId') roomId: string) {
    const result = await this.roomService.getRoomWithMembers(roomId, user.id);
    return {
      success: true,
      data: result,
    };
  }

  
   //更新房间信息
  @Patch(':roomId')
  async updateRoom(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    const room = await this.roomService.updateRoom(roomId, user.id, dto);
    return {
      success: true,
      data: room,
      message: '房间更新成功',
    };
  }


 // 删除房间
  @Delete(':roomId')
  //显示指定状态码
  @HttpCode(HttpStatus.OK)
  async deleteRoom(@CurrentUser() user: User, @Param('roomId') roomId: string) {
    await this.roomService.deleteRoom(roomId, user.id);
    return {
      success: true,
      message: '房间已删除',
    };
  }


  // 加入房间
  @Post(':roomId/join')
  async joinRoom(@CurrentUser() user: User, @Param('roomId') roomId: string) {
    const member = await this.roomService.joinRoom(roomId, user.id);
    return {
      success: true,
      data: member,
      message: '成功加入房间',
    };
  }

  // 离开房间
  @Post(':roomId/leave')
  @HttpCode(HttpStatus.OK)
  async leaveRoom(@CurrentUser() user: User, @Param('roomId') roomId: string) {
    await this.roomService.leaveRoom(roomId, user.id);
    return {
      success: true,
      message: '已离开房间',
    };
  }

  // 获取房间成员列表
  @Get(':roomId/members')
  async getMembers(@CurrentUser() user: User, @Param('roomId') roomId: string) {
    const result = await this.roomService.getRoomWithMembers(roomId, user.id);
    return {
      success: true,
      data: result.members,
    };
  }

  // 更新成员角色
  @Patch(':roomId/members/:userId')
  async updateMemberRole(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    const member = await this.roomService.updateMemberRole(roomId, user.id, userId, dto);
    return {
      success: true,
      data: member,
      message: '成员角色已更新',
    };
  }

  // 移除成员
  @Delete(':roomId/members/:userId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ) {
    await this.roomService.removeMember(roomId, user.id, userId);
    return {
      success: true,
      message: '成员已移除',
    };
  }

  // 转让房间所有权
  @Post(':roomId/transfer/:userId')
  @HttpCode(HttpStatus.OK)
  async transferOwnership(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ) {
    await this.roomService.transferOwnership(roomId, user.id, userId);
    return {
      success: true,
      message: '房间所有权已转让',
    };
  }

}
