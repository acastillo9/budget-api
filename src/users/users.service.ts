import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './entities/user.entity';
import { Model } from 'mongoose';
import { UserResponseDto } from './dto/user-response.dto';
import { UserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto) {
    const user = await new this.userModel(createUserDto)
      .save()
      .then(UserResponseDto.fromUser);
    return user;
  }

  async findOneByUsernameWithPassword(username: string) {
    return this.userModel
      .findOne({ email: username })
      .exec()
      .then((user) => user && UserDto.fromUser(user));
  }

  async findOne(id: string) {
    return this.userModel.findById(id).exec().then(UserResponseDto.fromUser);
  }
}
