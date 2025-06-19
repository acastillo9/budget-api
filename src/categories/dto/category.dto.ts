import { Type } from 'class-transformer';
import { UserDto } from 'src/users/dto/user.dto';

export class CategoryDto {
  id: string;
  name: string;
  icon: string;
  categoryType: string;

  @Type(() => UserDto)
  user: UserDto;
}
