import { DataTypes, Model, Sequelize } from "sequelize"

export interface FriendAttributes {
  id?: number
  userId: number
  friendId: number
  status: "pending" | "accepted" | "blocked"
  createdAt?: Date
  updatedAt?: Date
}

export class Friend
  extends Model<FriendAttributes>
  implements FriendAttributes
{
  public id!: number
  public userId!: number
  public friendId!: number
  public status!: "pending" | "accepted" | "blocked"
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

export const initFriendModel = (sequelize: Sequelize): typeof Friend => {
  Friend.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      friendId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      status: {
        type: DataTypes.ENUM("pending", "accepted", "blocked"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      sequelize,
      modelName: "Friend",
      tableName: "friends",
      timestamps: true,
      paranoid: false,
      indexes: [
        {
          unique: true,
          fields: ["userId", "friendId"],
        },
      ],
    }
  )

  return Friend
}
