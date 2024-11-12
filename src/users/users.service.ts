import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { compare, hash } from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PASSWORD_BYCRYPT_SALT } from './constants';
import { UserDto } from 'src/shared/dto/user.dto';

@Injectable()
export class UsersService {
  private readonly logger: Logger = new Logger(UsersService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  /**
   * Create a new user.
   * @param createUserDto The data to create the user.
   * @returns The user created.
   * @async
   */
  async create(createUserDto: CreateUserDto): Promise<UserDto> {
    if (this.userExists(createUserDto.email)) {
      //throw new HttpException('User already exists', HttpStatus.CONFLICT);
    }

    const hashedPassword = await this.hashPassword(createUserDto.password);
    const newUser = {
      ...createUserDto,
      password: hashedPassword,
    };

    try {
      const userModel = new this.userModel(newUser);
      const savedUser = await userModel.save();
      return plainToClass(UserDto, savedUser.toObject());
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw new HttpException(
        'Error creating the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a user by email and password used in the login process.
   * @param email The email of the user to find.
   * @param password The password of the user to find.
   * @returns The user found or null if not found.
   * @async
   */
  async findUserByEmailAndPassword(
    email: string,
    password: string,
  ): Promise<UserDto | null> {
    const user = await this.findOneByEmail(email);
    if (!user) return null;
    const isPasswordMatching = await compare(password, user.password);
    if (!isPasswordMatching) return null;
    return plainToClass(UserDto, user.toObject());
  }

  /**
   * hash the password using bcrypt.
   * @param password The password to hash.
   * @returns The hashed password.
   * @async
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = Number(
      this.configService.get(PASSWORD_BYCRYPT_SALT) || 10,
    );
    return hash(password, saltRounds);
  }

  /**
   * Find a user by email.
   * @param email The email of the user to find.
   * @returns The user found or null if not found.
   * @async
   */
  private async findOneByEmail(email: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findOne({ email }).exec();
    } catch (error) {
      this.logger.error(
        `Failed to find user by email: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if a user exists by email.
   * @param email The email of the user to check.
   * @returns True if the user exists, false otherwise.
   * @async
   */
  private async userExists(email: string): Promise<boolean> {
    return !!(await this.findOneByEmail(email));
  }
}
