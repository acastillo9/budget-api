import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { AuditableSchema } from 'src/shared/schemas';
import { UserDocument } from 'src/users/entities/user.entity';
import { CategoryType } from './category-type.enum';

export type CategoryDocument = HydratedDocument<Category>;

@Schema()
export class Category {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  icon: string;

  @Prop({ type: String, enum: CategoryType, required: true })
  categoryType: CategoryType;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    autopopulate: true,
  })
  user: UserDocument;
}

export const CategorySchema =
  SchemaFactory.createForClass(Category).add(AuditableSchema);
