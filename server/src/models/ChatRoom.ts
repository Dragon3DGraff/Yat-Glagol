import { DataTypes, Model, Sequelize } from "sequelize"

export interface ChatRoomAttributes {
  id?: number
  name: string
  description?: string
  isPrivate: boolean
  createdBy: number
  createdAt?: Date
  updatedAt?: Date
}

export class ChatRoom
  extends Model<ChatRoomAttributes>
  implements ChatRoomAttributes
{
  public id!: number
  public name!: string
  public description?: string
  public isPrivate!: boolean
  public createdBy!: number
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

export const initChatRoomModel = (sequelize: Sequelize): typeof ChatRoom => {
  ChatRoom.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isPrivate: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "ChatRoom",
      tableName: "chat_rooms",
      timestamps: true,
      paranoid: false,
    }
  )

  return ChatRoom
}
