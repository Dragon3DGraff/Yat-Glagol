import { DataTypes, Model, Sequelize } from "sequelize"

export interface MessageAttributes {
  id?: number
  content: string
  type: "text" | "image" | "file"
  userId: number
  chatRoomId: number
  replyToId?: number
  createdAt?: Date
  updatedAt?: Date
}

export class Message
  extends Model<MessageAttributes>
  implements MessageAttributes
{
  public id!: number
  public content!: string
  public type!: "text" | "image" | "file"
  public userId!: number
  public chatRoomId!: number
  public replyToId?: number
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

export const initMessageModel = (sequelize: Sequelize): typeof Message => {
  Message.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("text", "image", "file"),
        allowNull: false,
        defaultValue: "text",
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
      replyToId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "messages",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "Message",
      tableName: "messages",
      timestamps: true,
      paranoid: false,
    }
  )

  return Message
}
