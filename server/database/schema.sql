-- Создание базы данных
CREATE DATABASE IF NOT EXISTS yat_glagol_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yat_glagol_chat;

-- Таблица пользователей
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255) DEFAULT NULL,
    status ENUM('online', 'offline', 'away') DEFAULT 'offline',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Таблица чатов/комнат
CREATE TABLE chat_rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type ENUM('private', 'group', 'public') DEFAULT 'group',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Участники чатов
CREATE TABLE room_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('admin', 'moderator', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room_user (room_id, user_id)
);

-- Сообщения (зашифрованные)
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    encrypted_content TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
    reply_to INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP NULL,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL,
    INDEX idx_room_created (room_id, created_at)
);

-- Файлы (вложения)
CREATE TABLE message_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Активные видеозвонки
CREATE TABLE active_calls (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    created_by INT NOT NULL,
    call_type ENUM('audio', 'video', 'screen') DEFAULT 'video',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Участники звонков
CREATE TABLE call_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    call_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    FOREIGN KEY (call_id) REFERENCES active_calls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица дружбы между пользователями
CREATE TABLE friendships (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'blocked') DEFAULT 'accepted',
    room_id INT DEFAULT NULL, -- приватная комната между друзьями
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE SET NULL,
    UNIQUE KEY unique_friendship (user_id, friend_id),
    -- Предотвращаем самодружбу
    CHECK (user_id != friend_id)
);

-- Таблица запросов на дружбу
CREATE TABLE friend_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'declined', 'cancelled') DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_friend_request (from_user_id, to_user_id),
    -- Предотвращаем запросы самому себе
    CHECK (from_user_id != to_user_id)
);

-- Индексы для оптимизации
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_messages_room_user ON messages(room_id, user_id);
CREATE INDEX idx_room_participants_user ON room_participants(user_id);
CREATE INDEX idx_friendships_user ON friendships(user_id);
CREATE INDEX idx_friendships_friend ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_friend_requests_to_user ON friend_requests(to_user_id);
CREATE INDEX idx_friend_requests_from_user ON friend_requests(from_user_id);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);
