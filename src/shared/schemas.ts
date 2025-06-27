import mongoose from 'mongoose';

export const BaseSchema = new mongoose.Schema(
  {},
  {
    toObject: {
      transform: (document: any, result: any) => {
        result.id = document.id;
        delete result._id;
      },
      versionKey: false,
    },
  },
);

export const AuditableSchema = new mongoose.Schema(
  {},
  {
    timestamps: true,
  },
).add(BaseSchema);
