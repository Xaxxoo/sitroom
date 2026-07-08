import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account is inactive');

    await this.usersService.updateLastSeen(user.id);

    const token = this.jwtService.sign({ sub: user.id, phone: user.phone, role: user.role });
    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        lga: user.lga,
        ward: user.ward,
        pollingUnit: user.pollingUnit,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByPhone(dto.phone);
    if (existing) throw new ConflictException('Phone number already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({ ...dto, password: hashed });

    const token = this.jwtService.sign({ sub: user.id, phone: user.phone, role: user.role });
    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    return this.usersService.findOne(userId);
  }
}
