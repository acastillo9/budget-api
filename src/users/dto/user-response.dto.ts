import { UserDocument } from '../entities/user.entity';

export class UserResponseDto {
  id: string;
  name: string;
  email: string;

  static fromUser(user: UserDocument): UserResponseDto {
    const sourceResponseDTO = new UserResponseDto();
    sourceResponseDTO.id = user._id.toHexString();
    sourceResponseDTO.name = user.name;
    sourceResponseDTO.email = user.email;
    return sourceResponseDTO;
  }
}
