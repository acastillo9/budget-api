import { UserDocument } from '../entities/user.entity';

export class UserResponseDto {
  id: string;
  name: string;
  email: string;

  static fromUser(user: UserDocument): UserResponseDto {
    const userResponseDto = new UserResponseDto();
    userResponseDto.id = user._id.toHexString();
    userResponseDto.name = user.name;
    userResponseDto.email = user.email;
    return userResponseDto;
  }
}
