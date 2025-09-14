import { DataTypes, Model, Sequelize } from "sequelize"

export interface RoomParticipantAttributes {
  id?: number
  userId: number
  chatRoomId: number
  role: "owner" | "admin" | "member"
  joinedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export class RoomParticipant
  extends Model<RoomParticipantAttributes>
  implements RoomParticipantAttributes
{
  public id!: number
  public userId!: number
  public chatRoomId!: number
  public role!: "owner" | "admin" | "member"
  public joinedAt!: Date
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

export const initRoomParticipantModel = (
  sequelize: Sequelize
): typeof RoomParticipant => {
  RoomParticipant.init(
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
      chatRoomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "chat_rooms",
          key: "id",
        },
      },
      role: {
        type: DataTypes.ENUM("owner", "admin", "member"),
        allowNull: false,
        defaultValue: "member",
      },
      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "RoomParticipant",
      tableName: "room_participants",
      timestamps: true,
      paranoid: false,
      indexes: [
        {
          unique: true,
          fields: ["userId", "chatRoomId"],
        },
      ],
    }
  )

  return RoomParticipant
}
