import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OTP_PROVIDER } from './providers/otp-provider.interface';
import { createOtpProvider } from './providers/otp-provider.factory';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: OTP_PROVIDER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createOtpProvider(configService.get('OTP_PROVIDER')),
    },
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
