const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("id");

let socket;
let videoEl;
let isRemoteUpdate = false;
let isGuest = false;
const suppressedMediaEvents = new Set();

function suppressMediaEvent(eventName) {
	suppressedMediaEvents.add(eventName);
	window.setTimeout(() => {
		suppressedMediaEvents.delete(eventName);
	}, 1000);
}

function withRemoteMediaUpdate(expectedEvents, applyUpdate) {
	const events = Array.isArray(expectedEvents)
		? expectedEvents
		: [expectedEvents];
	isRemoteUpdate = true;
	events.forEach((eventName) => suppressMediaEvent(eventName));
	try {
		applyUpdate();
	} finally {
		window.setTimeout(() => {
			isRemoteUpdate = false;
		}, 0);
	}
}

document.addEventListener("DOMContentLoaded", async () => {
	if (!roomId) {
		showInlineMessage("Некорректный ID комнаты.");
		setTimeout(() => {
			window.location.href = "index.html";
		}, 2000);
		return;
	}

	try {
		clearInlineMessage();
		const token = localStorage.getItem("comedia_token");
		isGuest = !token;

		// Fetch room details
		const room = await apiFetch(`/rooms/${roomId}`);
		document.querySelector(".room-name").textContent = room.name;
		
		const displayAutoId = document.querySelector("#display-room-id");
		if (displayAutoId) {
			displayAutoId.textContent = roomId;
		}

		const roomTypeEl = document.querySelector(".room-type");
		if (roomTypeEl) {
			roomTypeEl.textContent = room.is_private
				? "Приватная"
				: "Публичная";
			if (!room.is_private) {
				roomTypeEl.classList.add("public");
			}
		}
		renderParticipants(room);

		if (room.is_private && isGuest) {
			showInlineMessage(
				"Это приватная комната. Войдите, чтобы продолжить.",
			);
			disableChat(true);
			setTimeout(() => {
				window.location.href = "index.html";
			}, 2000);
			return;
		}

		const firstQueue = Array.isArray(room.queue) ? room.queue[0] : null;
		const mediaTitle =
			firstQueue && firstQueue.media && firstQueue.media.title
				? firstQueue.media.title
				: "Dummy Video";
		let mediaUrl =
			firstQueue && firstQueue.media && firstQueue.media.url
				? firstQueue.media.url
				: "https://www.w3schools.com/html/mov_bbb.mp4";
		if (mediaUrl.startsWith("/")) {
			mediaUrl = `${API_URL}${mediaUrl}`;
		}
		document.querySelector(".media-title").textContent = mediaTitle;

		// Setup real video player
		const wrapper = document.querySelector(".player-wrapper");
		wrapper.innerHTML = `<video id="room-video" src="${mediaUrl}" controls crossorigin playsinline style="width: 100%; height: 100%; object-fit: contain;"></video>`;
		
		videoEl = document.getElementById("room-video");
		videoEl.onerror = () => {
			const playerWrapper = document.querySelector(".player-wrapper");
			playerWrapper.innerHTML = `
				<div class="player-placeholder error">
					<div class="player-icon" style="color: #ff5252;">
						<i class="fas fa-exclamation-triangle"></i>
					</div>
					<div class="player-title">Ошибка загрузки медиа</div>
					<div class="player-subtitle">Не удалось загрузить видеофайл. Проверьте ссылку.</div>
				</div>
			`;
		};

		setupSocket(token);
		setupVideoEvents();
		if (isGuest) {
			disableChat(true);
			showInlineMessage(
				"Вы вошли как гость. Чат доступен только после входа.",
				"success",
			);
		}
		setupChatOverride(isGuest);
	} catch (e) {
		showInlineMessage("Не удалось открыть комнату: " + e.message);
		setTimeout(() => {
			window.location.href = "index.html";
		}, 2000);
	}
});

function renderParticipants(room) {
	const list = document.querySelector(".participants-list");
	if (!list) return;

	list.innerHTML = "";
	const seen = new Set();

	if (room.owner && room.owner.username) {
		list.appendChild(
			buildParticipantItem(room.owner.username, "Создатель"),
		);
		seen.add(room.owner.username);
	}

	if (Array.isArray(room.roomUsers)) {
		room.roomUsers.forEach((roomUser) => {
			const username =
				roomUser && roomUser.user ? roomUser.user.username : null;
			if (!username || seen.has(username)) return;
			const role = roomUser.role === "admin" ? "Админ" : "Участник";
			list.appendChild(buildParticipantItem(username, role));
			seen.add(username);
		});
	}

	if (!list.children.length) {
		list.appendChild(buildParticipantItem("Нет участников", ""));
	}
}

function buildParticipantItem(name, role) {
	const item = document.createElement("div");
	item.className = "participant";

	const initial = name ? name.trim().charAt(0).toUpperCase() : "-";

	const avatarEl = document.createElement("div");
	avatarEl.className = "avatar";
	avatarEl.textContent = initial;

	const infoEl = document.createElement("div");
	infoEl.className = "participant-info";

	const nameEl = document.createElement("div");
	nameEl.className = "participant-name";
	nameEl.textContent = name;

	infoEl.appendChild(nameEl);

	if (role) {
		const roleEl = document.createElement("div");
		roleEl.className = "participant-role";
		roleEl.textContent = role;
		infoEl.appendChild(roleEl);
	}

	item.appendChild(avatarEl);
	item.appendChild(infoEl);

	return item;
}

function setupSocket(token) {
	// Note: Assuming socket.io.min.js is injected
	const socketOptions = {
		transports: ["websocket"],
	};
	if (token) {
		socketOptions.auth = { token };
	}
	socket = io(API_URL, socketOptions);

	socket.on("connect_error", (err) => {
		console.error("Socket connection error:", err.message);
	});

	socket.on("auth_required", (data) => {
		const message =
			data && data.error
				? data.error
				: "Требуется авторизация для доступа к комнате.";
		showInlineMessage(message);
		disableChat(true);
	});

	socket.on("room_error", (data) => {
		const message = data && data.error ? data.error : "Ошибка комнаты.";
		alert(message);
		window.location.href = "index.html";
	});

	socket.emit("join_room", { roomId });

	socket.on("sync_state", (state) => {
		if (state.isPlaying) {
			withRemoteMediaUpdate(["seeked", "play"], () => {
				videoEl.currentTime = state.time;
				videoEl.play().catch((e) => console.log(e));
			});
		} else {
			withRemoteMediaUpdate(["seeked", "pause"], () => {
				videoEl.currentTime = state.time;
				videoEl.pause();
			});
		}
	});

	socket.on("play", ({ time }) => {
		withRemoteMediaUpdate(["seeked", "play"], () => {
			videoEl.currentTime = time;
			videoEl.play().catch((e) => console.log(e));
		});
	});

	socket.on("pause", ({ time }) => {
		withRemoteMediaUpdate(["seeked", "pause"], () => {
			videoEl.currentTime = time;
			videoEl.pause();
		});
	});

	socket.on("seek", ({ time }) => {
		withRemoteMediaUpdate("seeked", () => {
			videoEl.currentTime = time;
		});
	});

	socket.on("message_received", (data) => {
		appendChatMessage(data.user, data.text, new Date(data.time));
	});

	socket.on("user_left", async (data) => {
		try {
			const updatedRoom = await apiFetch(`/rooms/${roomId}`);
			renderParticipants(updatedRoom);
		} catch (e) { console.error("Error refreshing room after user left", e); }
	});

	socket.on("admin_assigned", async (data) => {
		try {
			const updatedRoom = await apiFetch(`/rooms/${roomId}`);
			renderParticipants(updatedRoom);
		} catch (e) {}
	});
}

function setupVideoEvents() {
	videoEl.addEventListener("play", () => {
		if (!isRemoteUpdate && !suppressedMediaEvents.has("play"))
			socket.emit("play", { roomId, time: videoEl.currentTime });
	});

	videoEl.addEventListener("pause", () => {
		if (!isRemoteUpdate && !suppressedMediaEvents.has("pause"))
			socket.emit("pause", { roomId, time: videoEl.currentTime });
	});

	videoEl.addEventListener("seeked", () => {
		if (!isRemoteUpdate && !suppressedMediaEvents.has("seeked"))
			socket.emit("seek", { roomId, time: videoEl.currentTime });
	});
}

function setupChatOverride(isGuestUser) {
	// Override existing sendMessage with real socket send
	window.sendMessage = () => {
		if (isGuestUser) {
			showInlineMessage("Гостевой режим: чат недоступен.");
			return;
		}
		const input = document.querySelector(".chat-input");
		const text = input.value.trim();
		if (text) {
			socket.emit("send_message", { roomId, text });
			input.value = "";
		}
	};
}

function disableChat(shouldDisable) {
	const input = document.querySelector(".chat-input");
	const sendButton = document.querySelector(".chat-send-btn");
	if (input) {
		input.disabled = shouldDisable;
		if (shouldDisable) {
			input.placeholder = "Войдите, чтобы писать в чат";
		}
	}
	if (sendButton) {
		sendButton.disabled = shouldDisable;
	}
}

function appendChatMessage(author, text, date) {
	const messagesContainer = document.querySelector(".chat-messages");
	const timeStr = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

	// determine if own message
	const isMe = author === localStorage.getItem("comedia_username");

	const messageElement = document.createElement("div");
	messageElement.className = isMe ? "message user-message" : "message";

	const headerElement = document.createElement("div");
	headerElement.className = "message-header";

	const authorElement = document.createElement("span");
	authorElement.className = "message-author";
	authorElement.textContent = isMe ? "Вы" : author;

	const timeElement = document.createElement("span");
	timeElement.className = "message-time";
	timeElement.textContent = timeStr;

	headerElement.appendChild(authorElement);
	headerElement.appendChild(timeElement);

	const textElement = document.createElement("div");
	textElement.className = "message-text";
	textElement.textContent = text;

	messageElement.appendChild(headerElement);
	messageElement.appendChild(textElement);

	messagesContainer.appendChild(messageElement);
	messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

window.copyRoomId = function() {
	const roomIdText = document.querySelector("#display-room-id").textContent;
	navigator.clipboard.writeText(roomIdText).then(() => {
		showInlineMessage("ID комнаты скопирован!", "success");
	}).catch(() => {
		showInlineMessage("Ошибка при копировании ID");
	});
};
