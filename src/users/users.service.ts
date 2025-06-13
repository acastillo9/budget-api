import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './entities/user.entity';
import { ClientSession, Model } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { UserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger: Logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  /**
   * Create a new user.
   * @param createUserDto The data to create the user.
   * @param session The session to use for the transaction.
   * @returns The user created.
   * @async
   */
  async create(
    createUserDto: CreateUserDto,
    session?: ClientSession,
  ): Promise<UserDto> {
    try {
      const newUser = new this.userModel(createUserDto);
      const user = await newUser.save({ session });
      return plainToClass(UserDto, user.toObject());
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw new HttpException(
        'Error saving the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a user.
   * @param id The id of the user to update.
   * @param updateUserDto The data to update the user.
   * @param session The session to use for the transaction.
   * @returns The user updated.
   * @async
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    session?: ClientSession,
  ): Promise<UserDto> {
    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        id,
        updateUserDto,
        { new: true, session },
      );

      if (!updatedUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return plainToClass(UserDto, updatedUser.toObject());
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);
      throw new HttpException(
        'Error saving the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a user by id.
   * @param id The id of the user to find.
   * @returns The user found.
   * @async
   */
  async findById(id: string): Promise<UserDto | null> {
    try {
      const user = await this.userModel.findById(id);
      if (!user) return null;
      return plainToClass(UserDto, user.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to find user by id: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a user by email.
   * @param email The email of the user to find.
   * @returns The user found or null if not found.
   * @async
   */
  async findByEmail(email: string): Promise<UserDto | null> {
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) return null;
      return plainToClass(UserDto, user.toObject());
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
}
