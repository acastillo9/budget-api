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
import { generateActivationCode } from './utils';
import { MailService } from 'src/mail/mail.service';
import { emailVerification } from 'src/mail/templates';
import { UserStatus } from './entities/user-status.enum';

@Injectable()
export class UsersService {
  private readonly logger: Logger = new Logger(UsersService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  /**
   * Create a new user.
   * @param createUserDto The data to create the user.
   * @returns The user created.
   * @async
   */
  async create(createUserDto: CreateUserDto): Promise<UserDto> {
    let user = await this.findOneByEmail(createUserDto.email);

    if (user && user.status === UserStatus.ACTIVE) {
      throw new HttpException('User already exists', HttpStatus.CONFLICT);
    }

    const activationCode = generateActivationCode();
    const hashedActivationCode = await hash(
      activationCode,
      Number(this.configService.get(PASSWORD_BYCRYPT_SALT)),
    );
    const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      if (!user) {
        const newUser = {
          ...createUserDto,
          activationCode: hashedActivationCode,
          activationCodeExpires: expirationDate,
        };
        user = new this.userModel(newUser);
      } else {
        user.activationCode = hashedActivationCode;
        user.activationCodeExpires = expirationDate;
        user.status = UserStatus.UNVERIFIED;
      }
      const savedUser = await user.save();

      this.sendActivationCodeEmail(savedUser.email, activationCode);

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
   * Check if a user exists by email.
   * @param email The email of the user to check.
   * @returns True if the user exists, false otherwise.
   * @async
   */
  async userExists(email: string): Promise<boolean> {
    return !!(await this.findOneByEmailAndStatus(email, UserStatus.ACTIVE));
  }

  /**
   * Verify the email of the user.
   * @param email The email of the user to verify.
   * @param activationCode The activation code to verify.
   * @returns The user verified.
   * @async
   */
  async verifyEmail(email: string, activationCode: string): Promise<UserDto> {
    const user = await this.findOneByEmailAndStatus(
      email,
      UserStatus.UNVERIFIED,
    );
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (
      !(await compare(activationCode, user.activationCode)) ||
      user.activationCodeExpires < new Date()
    ) {
      throw new HttpException(
        'Invalid activation code',
        HttpStatus.BAD_REQUEST,
      );
    }

    user.status = UserStatus.VERIFIED_NO_PASSWORD;
    user.activationCode = null;
    user.activationCodeExpires = null;
    try {
      const updatedUser = await user.save();
      return plainToClass(UserDto, updatedUser.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to activate user: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error activating the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Set the password of the user.
   * @param id The id of the user to set the password.
   * @param password The password to set.
   * @returns The user with the password set.
   * @async
   */
  async setPassword(id: string, password: string): Promise<UserDto> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    user.password = await hash(
      password,
      Number(this.configService.get(PASSWORD_BYCRYPT_SALT)),
    );
    user.status = UserStatus.ACTIVE;
    try {
      const updatedUser = await user.save();
      return plainToClass(UserDto, updatedUser.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to set password: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error setting the password',
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
  async findById(id: string): Promise<UserDto> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return plainToClass(UserDto, user.toObject());
  }

  /**
   * Find a user by email.
   * @param email The email of the user to find.
   * @returns The user found or null if not found.
   * @async
   */
  private async findOneByEmail(email: string): Promise<UserDocument | null> {
    try {
      return this.userModel.findOne({ email });
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
   * Find a user by email and status.
   * @param email The email of the user to find.
   * @param status The status of the user to find.
   * @returns The user found or null if not found.
   * @async
   */
  private async findOneByEmailAndStatus(
    email: string,
    status: UserStatus,
  ): Promise<UserDocument | null> {
    try {
      return this.userModel.findOne({ email, status });
    } catch (error) {
      this.logger.error(
        `Failed to find user by email and status: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send an email with the activation code.
   * @param to The email to send the activation code.
   * @param activationCode The activation code to send.
   * @async
   */
  private async sendActivationCodeEmail(to: string, activationCode: string) {
    this.mailService.sendMail(
      to,
      'Confirm Your Email',
      emailVerification(activationCode),
    );
  }
}
