import { UserDocument } from '../entities/user.entity';

export class UserDto {
  id: string;
  name: string;
  email: string;
  password: string;

  static fromUser(user: UserDocument): UserDto {
    const sourceResponseDTO = new UserDto();
    sourceResponseDTO.id = user._id.toHexString();
    sourceResponseDTO.name = user.name;
    sourceResponseDTO.email = user.email;
    sourceResponseDTO.password = user.password;
    return sourceResponseDTO;
  }
}
