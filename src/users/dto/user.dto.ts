import { UserDocument } from '../entities/user.entity';

export class UserDto {
  id: string;
  name: string;
  email: string;
  password: string;

  static fromUser(user: UserDocument): UserDto {
    const userDto = new UserDto();
    userDto.id = user._id.toHexString();
    userDto.name = user.name;
    userDto.email = user.email;
    userDto.password = user.password;
    return userDto;
  }
}
