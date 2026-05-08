import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from '../../common/schemas/user.schema';

type TokenPair = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(name: string, email: string, password: string, role: UserRole) {
    const existing = await this.userModel.findOne({ email: email.toLowerCase() }).lean();
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userModel.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
    });

    const tokens = this.createTokens(user.id, user.email, user.role);
    return {
      message: 'User registered',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.createTokens(user.id, user.email, user.role);
    return {
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    };
  }

  refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('REFRESH_SECRET') ?? 'replace-me-too',
      });
      return this.createTokens(payload.sub, payload.email, payload.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private createTokens(userId: string, email: string, role: UserRole): TokenPair {
    const accessSecret = this.configService.get<string>('JWT_SECRET') ?? 'replace-me';
    const refreshSecret =
      this.configService.get<string>('REFRESH_SECRET') ?? 'replace-me-too';
    const accessExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m';

    const accessToken = this.jwtService.sign(
      { sub: userId, email, role },
      { secret: accessSecret, expiresIn: accessExpiresIn as never },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, email, role },
      { secret: refreshSecret, expiresIn: '30d' },
    );
    return { accessToken, refreshToken };
  }
}
