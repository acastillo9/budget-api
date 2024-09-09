import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model } from 'mongoose';
import { UserResponseDto } from './dto/user-response.dto';
import { hash } from 'bcrypt';
import { PASSWORD_BYCRYPT_SALT } from './utils/constants';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const newUser = {
      ...createUserDto,
      password: await hash(createUserDto.password, PASSWORD_BYCRYPT_SALT),
    };
    return new this.userModel(newUser).save().then(UserResponseDto.fromUser);
  }

  /**
   * Find a user by email used in the login process.
   * @param email The email of the user to find.
   * @returns The user found or null if not found.
   * @async
   */
  async findOne(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }
}
