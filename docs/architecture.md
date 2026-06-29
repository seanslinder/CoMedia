# Архитектура проекта CoMedia

В данном документе представлены базовые архитектурные схемы проекта, отражающие модель данных и физическое распределение компонентов.

## 1. Схема Базы Данных (Entity-Relationship Diagram)

Схема отображает структуру хранения данных в PostgreSQL, настроенную через Prisma ORM:

```mermaid
erDiagram
    USER {
        int id PK
        string username
    }
    ROOM {
        int id PK
        string name
        boolean is_private
        string password
        int owner_id FK
    }
    ROOM_USER {
        int room_id FK
        int user_id FK
        string role
        datetime joined_at
    }
    MEDIA {
        int id PK
        string title
        string url
    }
    QUEUE_ITEM {
        int id PK
        int room_id FK
        int media_id FK
        int position
    }
    MESSAGE {
        int id PK
        int room_id FK
        int user_id FK
        string content
        datetime created_at
    }

    USER ||--o{ ROOM : "владеет (owner)"
    USER ||--o{ ROOM_USER : "участвует"
    USER ||--o{ MESSAGE : "отправляет"
    ROOM ||--o{ ROOM_USER : "содержит пользователей"
    ROOM ||--o{ MESSAGE : "содержит сообщения"
    ROOM ||--o{ QUEUE_ITEM : "имеет очередь"
    MEDIA ||--o{ QUEUE_ITEM : "находится в очереди"
```

## 2. Общая Архитектура Уровня Подсистем (Component Diagram)

Диаграмма демонстрирует логическое распределение модулей приложения и характер их взаимодействия между клиентом, сервером и инфраструктурой.

```mermaid
flowchart TB
    subgraph Client ["Клиентская часть (Frontend)"]
        UI["Интерфейс (HTML/CSS)"]
        VanillaJS["Бизнес-логика (Vanilla JS)"]
        REST_Client["HTTP Клиент (api.js)"]
        WS_Client["WebSocket Клиент (room_logic.js)"]
        
        UI <--> VanillaJS
        VanillaJS --> REST_Client
        VanillaJS --> WS_Client
    end

    subgraph Server ["Серверная часть (Node.js & Express)"]
        AuthMiddleware["JWT Авторизация (middleware)"]
        REST_API["REST Контроллеры (routes/controllers)"]
        WS_Server["Socket.IO Сервер (socket.ts)"]
        PrismaClient["Prisma ORM"]
        FileService["Файловая система (Media Upload)"]
        
        REST_API --> AuthMiddleware
        WS_Server --> AuthMiddleware
        REST_API --> PrismaClient
        WS_Server --> PrismaClient
        REST_API --> FileService
    end

    subgraph Infrastructure ["Инфраструктура (Docker Compose)"]
        DB[("PostgreSQL\n(persistent)")]
        Redis[("Redis\n(in-memory/pubsub)")]
    end

    %% Внешние взаимодействия
    REST_Client -- "HTTP GET/POST" --> REST_API
    WS_Client -- "WebSocket Events" <--> WS_Server

    %% Внутренние взаимодействия сервиса
    PrismaClient -- "TCP/IP" --> DB
    WS_Server -- "Pub/Sub" --> Redis
```
