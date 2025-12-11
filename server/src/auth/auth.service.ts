import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entities/user.entitiey';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Profile } from 'passport-github2';
import * as bcrypt from 'bcrypt';
//这是jwt的payload接口 token中第二个字段存储的信息
export interface JwtPayload {
    sub: string; // 用户 ID
    email: string;
    username: string;
    githubNickname?: string;
    githubAvatar?: string;
}
//这是认证响应接口 返回的token和用户信息
export interface AuthResponse {
    accessToken: string;
    refreshToken?: string;
    user: {
        id: string;
        email: string;
        username: string;
        githubNickname?: string;
        githubAvatar?: string;
    };
}


@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }
    //验证github的OAuth
    //profile是github返回的用户信息
    async validateOAuthUser(profile: Profile): Promise<User> {

        let email: string;
        let username: string;
        let githubNickname: string | undefined;
        let githubAvatar: string | undefined;
        let providerId: string | undefined;

        //兜底策略
        email = profile.emails?.[0]?.value || profile._json?.email || `${profile.id}@github.com`;
        //兜底策略
        username = profile.username || profile.login || 'GitHub User';
        githubNickname = profile.displayName || profile._json?.name || profile.username || profile.login;
        githubAvatar = profile.photos?.[0]?.value || profile.avatar_url || profile._json?.avatar_url || "/1.png";
        //查找或创建用户
        return this.userService.findOrCreate({
            email,
            username,

            provider: 'github', //github登录
            providerId: profile.id.toString(), //github的id
            githubNickname: githubNickname!, //github的昵称
            githubAvatar: githubAvatar! //github的头像
        });


    }
    //返回生成的token和用户信息  token是根据payload生成的  payload是用户信息
    async generateTokens(user: User): Promise<AuthResponse> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            username: user.username,
            githubNickname: user.githubNickname || undefined,
            githubAvatar: user.githubAvatar || undefined,
        };
        
        // 生成 Access Token（短期有效）
        const accessToken = this.jwtService.sign(payload);
        
        // 生成 Refresh Token（长期有效）
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any,
        });
        
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                githubNickname: user.githubNickname || undefined,
                githubAvatar: user.githubAvatar || undefined,
            },
        }
    }


    // 验证 JWT Payload 并返回用户信息

    async validateUser(payload: JwtPayload): Promise<User | null> {
        return await this.userService.findById(payload.sub);
    }

    // 验证本地用户（使用 bcrypt 加密验证）
    async validateLocalUser(email: string, password: string): Promise<User | null> {
        const user = await this.userService.findByEmail(email);
        if (!user || !user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // 使用 bcrypt 比较加密后的密码
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return user;
    }

    // 加密密码（注册时使用）
    async hashPassword(password: string): Promise<string> {
        const saltRounds = 10; // 加密强度，值越大越安全但越慢
        return await bcrypt.hash(password, saltRounds);
    }


    // 注册新用户 local注册
    async registerUser(registerData: {
        email: string;
        username: string;
        password: string;
    }): Promise<AuthResponse> {
        // 1. 检查邮箱是否已存在
        const existingUser = await this.userService.findByEmail(registerData.email);
        if (existingUser) {
            throw new ConflictException('该邮箱已被注册');
        }

        // 2. 创建新用户（密码会在 UserService.createlocalUser() 中自动加密）
        const user = await this.userService.createlocalUser({
            email: registerData.email,
            username: registerData.username,
            password: registerData.password,
            provider: 'local',
        });

        // 3. 生成 Token（注册后自动登录）
        return await this.generateTokens(user);
    }

  
    async refreshToken(refreshToken: string): Promise<AuthResponse> {
        try {
            // 验证 Refresh Token
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            }) as JwtPayload;

            // 查找用户
            const user = await this.userService.findById(payload.sub);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            // 生成新的 Token
            return await this.generateTokens(user);
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
}
