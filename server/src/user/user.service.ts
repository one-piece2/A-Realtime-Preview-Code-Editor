import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entitiey';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }
//根据提供商和提供商ID查找用户
  async findByProvider(provider: string, providerId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { provider, providerId },
    });
  }
//local创建用户（如果提供了密码，会自动加密）
  async createlocalUser(userData: {
    email: string;
    username: string;
    password: string;
    provider: string;
  }): Promise<User> {
    // 如果提供了密码，先加密再保存
    if (userData.password) {
      const saltRounds = 10;
      userData.password = await bcrypt.hash(userData.password, saltRounds);
    }
    
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }
  //github创建用户
async create(userData: {
  email: string;
  username: string;
  provider: string;
  providerId?: string;
  githubNickname: string;
  githubAvatar: string;
}): Promise<User> {
  const user = this.userRepository.create(userData);
  return await this.userRepository.save(user);
}

  //更新用户
  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, userData);
    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return updatedUser;
  }

  //查找或创建用户（OAuth登录时使用）
  async findOrCreate(userData: {
    email: string;
    username: string;
    provider: string;
    providerId?: string;
    githubNickname: string;

    githubAvatar: string;
  }): Promise<User> {
    // 如果是 GitHub 登录，先通过 providerId 查找
    if (userData.provider === 'github' && userData.providerId) {
      let user = await this.findByProvider('github', userData.providerId);
      if (user) {
        // 更新用户信息（GitHub 昵称和头像可能会变化）
        user.githubNickname = userData.githubNickname || user.githubNickname;
        user.githubAvatar = userData.githubAvatar || user.githubAvatar;
        user.email = userData.email;
        user.username = userData.username;
        return await this.userRepository.save(user);
      }
    }

    // 如果不存在，创建新用户
    return await this.create(userData);
  }
}


