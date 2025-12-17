import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entitiey';
import { RoomMember } from './entities/room-member.entity';
@Module({
  controllers: [RoomController],
  providers: [RoomService],
  imports: [TypeOrmModule.forFeature([Room, RoomMember])],
  exports: [RoomService], //导出给websocket模块使用
})
export class RoomModule {}
