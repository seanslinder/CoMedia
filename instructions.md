# Prompt for Building the CoMedia "Watch Together" Application

## 1. Overall Goal

Your task is to build a "watch together" web application called **CoMedia**. This application will allow users to create or join rooms to watch videos in a synchronized manner. Each room will have a real-time chat.

## 2. Core Features

- **Synchronized Video Playback**: All users in a room will see the video playing, pausing, and seeking at the same time.
- **Room Management**: Users can create public rooms (open to anyone) or private rooms (password-protected).
- **Real-time Chat**: A chat box within each room for users to communicate.
- **Media Queue**: A playlist for each room where users can add videos.
- **User Authentication**: A simple username-based system. Users can "sign in" with a username to create rooms and access private ones. Guest access is allowed for public rooms.
- **Media Upload**: Authenticated users can upload their own MP4 video files to be watched in a room.

## 3. Technology Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL, managed via Prisma ORM
- **Real-time Communication**: Socket.IO
- **Authentication**: JSON Web Tokens (JWT)
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3. **Do not use any frontend frameworks like React, Vue, or Angular.**
- **Containerization**: Docker and Docker Compose to run the PostgreSQL database and a Redis instance.

## 4. Project Structure

Create the following directory and file structure. You will populate these files as you proceed through the steps.

```
/
├── docker-compose.yml
├── frontend/
│   ├── index.html          # Landing page to join/create rooms
│   ├── room.html           # The main "watch" page
│   ├── styles/
│   │   ├── common.css
│   │   └── ...
│   ├── api.js              # Helper for frontend API calls
│   ├── index.js            # Logic for index.html
│   └── room_logic.js       # Logic for room.html
└── server/
    ├── .env
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── index.ts        # Main server entry point
        ├── socket.ts       # Socket.IO logic
        ├── prisma.ts       # Prisma client instance
        ├── middleware/
        │   └── auth.ts     # JWT authentication middleware
        └── routes/
            ├── auth.ts     # Authentication routes
            └── rooms.ts    # Room management routes
```

---

## 5. Step-by-Step Implementation Plan

Follow these steps in order.

### Step 1: Backend Project Setup

1.  Create the root `comedia` directory and the `server` and `frontend` subdirectories.
2.  In the `server` directory, initialize a Node.js project (`npm init -y`).
3.  Install necessary backend dependencies: `express`, `cors`, `dotenv`, `jsonwebtoken`, `socket.io`, `prisma`, `@prisma/client`, `multer`.
4.  Install development dependencies: `typescript`, `ts-node`, `nodemon`, `@types/node`, `@types/express`, `@types/cors`, `@types/jsonwebtoken`, `@types/multer`.
5.  Create a `tsconfig.json` file in `server/` configured for a modern Node.js project targeting ES2020 with `outDir` set to `dist`.
6.  Create a basic `server/src/index.ts` that sets up an Express app, creates an `http` server, and listens on a port defined in `.env` (default to 3000).

### Step 2: Database and Services Setup

1.  In the project root, create a `docker-compose.yml` file to define two services: `db` (using `postgres:15-alpine`) and `redis` (using `redis:7-alpine`).
2.  Configure the `db` service with environment variables for `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`. Expose port `5432`.
3.  In `server/`, initialize Prisma (`npx prisma init`). This will create `prisma/schema.prisma` and a `.env` file.
4.  Update `server/.env` with the `DATABASE_URL` matching the credentials in your `docker-compose.yml`. Example: `DATABASE_URL="postgres://admin:password@localhost:5432/comedia"`. Also add a `JWT_SECRET`.
5.  Define the data models in `prisma/schema.prisma`:
    -   `User` (id, username)
    -   `Room` (id, name, is_private, password, owner_id)
    -   `RoomUser` (linking table for users in a room, with a `role` like 'admin' or 'member')
    -   `Message` (for chat, linked to a room and a user)
    -   `Media` (id, title, url)
    -   `QueueItem` (linking a `Media` item to a `Room`'s queue)
6.  Run `npx prisma migrate dev --name init` to create the database schema from your models.

### Step 3: Backend API Endpoints

1.  **Authentication (`server/src/routes/auth.ts`)**:
    -   Create a `POST /auth/login` endpoint. It should accept a `username`. It will find a user with that username or create a new one.
    -   Upon successful login/creation, it should generate and return a JWT containing the user's `id` and `username`.
2.  **Rooms (`server/src/routes/rooms.ts`)**:
    -   Create a `POST /rooms` endpoint (protected by JWT middleware). It should create a new room, making the authenticated user the owner.
    -   Create a `GET /rooms` endpoint to list all public rooms.
    -   Create a `GET /rooms/:id` endpoint to fetch details for a single room, including its owner, participants, and media queue.
3.  **Media Upload (`server/src/index.ts`)**:
    -   Implement a `POST /media/upload` endpoint using `multer` for file handling.
    -   This endpoint must be protected by JWT middleware.
    -   It should accept an MP4 file, save it to a `/media` directory on the server, and return the public URL to access it (e.g., `/media/filename.mp4`).
    -   Serve the `/media` directory statically using `express.static`.

### Step 4: Real-time Logic with Socket.IO

Create `server/src/socket.ts` to handle all WebSocket logic.

1.  **Initialization**: The main `index.ts` should import and call an `initSocket` function, passing it the `http` server instance.
2.  **Authentication**: Use Socket.IO middleware to verify the JWT from `socket.handshake.auth.token`. Attach the user payload to the socket object. Allow unauthenticated connections for guest access.
3.  **Event Handlers**:
    -   `join_room`: When a user joins, add them to the Socket.IO room. If the room is private, verify the user is authenticated. Send the current video state (`isPlaying`, `currentTime`) to the new user for synchronization.
    -   `send_message`: When a user sends a chat message, save it to the database and broadcast it to all users in that room.
    -   `play`, `pause`, `seek`: When a user performs one of these actions, broadcast the event and the video's current time to all *other* users in the room.
    -   `disconnecting`: When a user disconnects, handle cleanup. If they are the last user in a temporary room, delete the room and its associated data from the database. If they were the only admin, assign a new admin.

### Step 5: Frontend - Landing Page (`index.html`)

1.  Create the HTML structure for the landing page. It should include:
    -   A section to join an existing room by entering a Room ID and an optional password.
    -   A section displaying a grid of currently active public rooms.
    -   A "Create Room" button.
2.  Write the JavaScript in `frontend/index.js`:
    -   On page load, fetch and display the list of public rooms from the `GET /rooms` endpoint.
    -   Implement the "Join Room" logic. When the button is clicked, redirect the user to `room.html?id=<roomId>`.
    -   Implement the "Create Room" logic. This should prompt the user for a room name and whether it should be private (with a password). It will then call the `POST /rooms` endpoint and redirect to the new room page.
    -   Implement a simple "login" flow where a user can enter a username. This calls the `POST /auth/login` endpoint and saves the returned JWT and username to `localStorage`.

### Step 6: Frontend - Room Page (`room.html`)

1.  Create the HTML structure for the room page. This is the main view and should have a three-column layout:
    -   **Left Column**: Participants list and room details (name, public/private).
    -   **Center Column**: The video player.
    -   **Right Column**: The chat box and media queue.
2.  Write the JavaScript in `frontend/room_logic.js`:
    -   On page load, get the `roomId` from the URL query parameters.
    -   Fetch room details from `GET /rooms/:id` and populate the UI.
    -   Initialize the video player with the first media item from the room's queue.
    -   **Connect to Socket.IO**:
        -   Establish a WebSocket connection, passing the JWT from `localStorage` in the `auth` payload.
        -   Emit the `join_room` event.
    -   **Implement Socket Event Listeners**:
        -   `sync_state`, `play`, `pause`, `seek`: Update the local video player's state based on events from the server. Use a flag (e.g., `isRemoteUpdate`) to prevent these updates from re-emitting events back to the server.
        -   `message_received`: Append new messages to the chat box.
        -   `user_left`, `admin_assigned`: Refresh the participant list.
    -   **Implement Video Player Event Listeners**:
        -   Listen for `play`, `pause`, and `seeked` events on the `<video>` element.
        -   When an event is triggered by the user (i.e., not a remote update), emit the corresponding event (`play`, `pause`, `seek`) to the server with the `roomId` and `video.currentTime`.
    -   **Implement Chat**:
        -   When the user sends a chat message, emit the `send_message` event to the server.
        -   Disable the chat input for guest users.

### Step 7: Final Polish

1.  Add basic, clean styling in the CSS files for a good user experience. Include a dark/light theme toggle.
2.  Ensure all API calls and user interactions have proper error handling (e.g., display messages to the user if an API call fails).
3.  Write a `README.md` file explaining what the project is and how to set it up and run it locally.

---

Execute these steps sequentially. After each major step, verify its functionality before moving to the next.