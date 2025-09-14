import { DataTypes, Model, Sequelize } from "sequelize"

export interface UserAttributes {
  id?: number
  username: string
  email: string
  password: string
  avatar?: string
  status: "online" | "offline" | "away"
  createdAt?: Date
  updatedAt?: Date
}

export class User extends Model<UserAttributes> implements UserAttributes {
  public id!: number
  public username!: string
  public email!: string
  public password!: string
  public avatar?: string
  public status!: "online" | "offline" | "away"
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

export const initUserModel = (sequelize: Sequelize): typeof User => {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      avatar: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("online", "offline", "away"),
        allowNull: false,
        defaultValue: "offline",
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true,
      paranoid: false,
    }
  )

  return User
}
