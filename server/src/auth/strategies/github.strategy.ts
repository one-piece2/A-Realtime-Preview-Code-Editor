import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(private configService: ConfigService, private authService: AuthService) {
        super({
            clientID: configService.get<string>('GITHUB_CLIENT_ID'),
            clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
            //登录成功后回调的url
            callbackURL: configService.get<string>('GITHUB_CALLBACK_URL'),
            //请求数据的范围：获取用户邮箱和基本信息
            scope: ['user:email', 'read:user'],
        });
    }
    //验证github的OAuth 会自动注入这些参数：accessToken, refreshToken, profile
    async validate(accessToken: string, refreshToken: string, profile: Profile) {
        const user = await this.authService.validateOAuthUser(profile);
        //自动将user注入到request.user中
        return user;
    }
}
