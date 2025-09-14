import { Sequelize } from "sequelize"
import { User, initUserModel } from "./User"
import { ChatRoom, initChatRoomModel } from "./ChatRoom"
import { Message, initMessageModel } from "./Message"
import { RoomParticipant, initRoomParticipantModel } from "./RoomParticipant"
import { Friend, initFriendModel } from "./Friend"

export class Models {
  public sequelize: Sequelize
  public User: typeof User
  public ChatRoom: typeof ChatRoom
  public Message: typeof Message
  public RoomParticipant: typeof RoomParticipant
  public Friend: typeof Friend

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize

    // Initialize models
    this.User = initUserModel(sequelize)
    this.ChatRoom = initChatRoomModel(sequelize)
    this.Message = initMessageModel(sequelize)
    this.RoomParticipant = initRoomParticipantModel(sequelize)
    this.Friend = initFriendModel(sequelize)

    this.setupAssociations()
  }

  private setupAssociations(): void {
    // User associations
    this.User.hasMany(this.ChatRoom, {
      foreignKey: "createdBy",
      as: "createdRooms",
    })

    this.User.hasMany(this.Message, {
      foreignKey: "userId",
      as: "messages",
    })

    this.User.belongsToMany(this.ChatRoom, {
      through: this.RoomParticipant,
      foreignKey: "userId",
      as: "rooms",
    })

    this.User.belongsToMany(this.User, {
      through: this.Friend,
      foreignKey: "userId",
      otherKey: "friendId",
      as: "friends",
    })

    // ChatRoom associations
    this.ChatRoom.belongsTo(this.User, {
      foreignKey: "createdBy",
      as: "creator",
    })

    this.ChatRoom.hasMany(this.Message, {
      foreignKey: "chatRoomId",
      as: "messages",
    })

    this.ChatRoom.belongsToMany(this.User, {
      through: this.RoomParticipant,
      foreignKey: "chatRoomId",
      as: "participants",
    })

    this.ChatRoom.hasMany(this.RoomParticipant, {
      foreignKey: "chatRoomId",
      as: "participantRecords",
    })

    // Message associations
    this.Message.belongsTo(this.User, {
      foreignKey: "userId",
      as: "author",
    })

    this.Message.belongsTo(this.ChatRoom, {
      foreignKey: "chatRoomId",
      as: "room",
    })

    this.Message.belongsTo(this.Message, {
      foreignKey: "replyToId",
      as: "replyTo",
    })

    this.Message.hasMany(this.Message, {
      foreignKey: "replyToId",
      as: "replies",
    })

    // RoomParticipant associations
    this.RoomParticipant.belongsTo(this.User, {
      foreignKey: "userId",
      as: "user",
    })

    this.RoomParticipant.belongsTo(this.ChatRoom, {
      foreignKey: "chatRoomId",
      as: "room",
    })

    // Friend associations
    this.Friend.belongsTo(this.User, {
      foreignKey: "userId",
      as: "user",
    })

    this.Friend.belongsTo(this.User, {
      foreignKey: "friendId",
      as: "friend",
    })
  }

  async sync(options?: { force?: boolean; alter?: boolean }): Promise<void> {
    await this.sequelize.sync(options)
  }
}

export { User, ChatRoom, Message, RoomParticipant, Friend }
