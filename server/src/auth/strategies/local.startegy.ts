import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { Injectable } from '@nestjs/common';
import { User } from 'src/user/entities/user.entitiey';
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({
            usernameField: 'email',
        });
    }
    async validate(email: string, password: string): Promise<User> {
        const user = await this.authService.validateLocalUser(email, password);

        //自动将user注入到request.user中
        return user !;
    }
}


