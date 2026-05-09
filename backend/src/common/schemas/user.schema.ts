import { HydratedDocument, Schema } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
export type UserRole = 'male' | 'female' | 'other';

export class User {
  name!: string;

  email!: string;

  passwordHash!: string;

  role!: UserRole;
}

export const UserSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'other' },
  },
  { timestamps: true },
);
