import { Type } from 'class-transformer';
import { UserDto } from 'src/shared/dto/user.dto';

export default class CategoryDto {
  id: string;
  name: string;
  icon: string;

  @Type(() => UserDto)
  user: UserDto;
}
