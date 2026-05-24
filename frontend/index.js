document.addEventListener("DOMContentLoaded", async () => {
	try {
		document.querySelector(".create-room").addEventListener("click", () => {
			window.location.href = "createRoom.html";
		});

		const joinButton = document.querySelector(
			".private-room-section .btn-primary",
		);
		if (joinButton) {
			joinButton.addEventListener("click", joinPrivateRoom);
		}

		clearInlineMessage();
		updateAuthUI();
		loadRooms();
	} catch (e) {
		console.error(e);
	}
});

function updateAuthUI() {
	const token = localStorage.getItem("comedia_token");
	const username = localStorage.getItem("comedia_username");
	const authContainer = document.querySelector(".header-actions") || document.querySelector("header");
	
	if (!authContainer) return;

	// Remove existing auth buttons if any
	const existing = authContainer.querySelector(".auth-status");
	if (existing) existing.remove();

	const statusEl = document.createElement("div");
	statusEl.className = "auth-status";
	statusEl.style.display = "flex";
	statusEl.style.alignItems = "center";
	statusEl.style.gap = "10px";

	if (token && username) {
		statusEl.innerHTML = `
			<span class="user-name"><i class="fas fa-user"></i> ${username}</span>
			<button class="btn-secondary" onclick="logout()" style="padding: 5px 12px; font-size: 0.9rem;">Выйти</button>
		`;
	} else {
		statusEl.innerHTML = `
			<button class="btn-primary" onclick="handleManualLogin()" style="padding: 5px 12px; font-size: 0.9rem;">Войти</button>
		`;
	}
	authContainer.appendChild(statusEl);
}

window.handleManualLogin = async () => {
	try {
		await performAuth();
		window.location.reload();
	} catch (e) {
		console.error("Auth failed", e);
	}
};

async function loadRooms() {
	const publicGrid = document.querySelector(".rooms-grid");
	publicGrid.innerHTML = "<p>Загрузка комнат...</p>";

	try {
		// Load My Rooms if logged in
		const token = localStorage.getItem("comedia_token");
		if (token) {
			const myRooms = await apiFetch("/rooms/me");
			renderRoomsSection(myRooms, "Мои комнаты", "У вас пока нет созданных комнат.");
		}

		// Load Public Rooms
		const rooms = await apiFetch("/rooms/public");
		publicGrid.innerHTML = "";
		if (rooms.length === 0) {
			publicGrid.innerHTML = "<p>Нет активных публичных комнат. Создайте свою!</p>";
		} else {
			rooms.forEach(room => publicGrid.appendChild(createRoomCard(room)));
		}
	} catch (e) {
		publicGrid.innerHTML = '<p style="color:var(--error)">Ошибка загрузки</p>';
	}
}

function renderRoomsSection(rooms, title, emptyMsg) {
	if (rooms.length === 0) return;

	const existing = document.querySelector(".my-rooms-section");
	if (existing) existing.remove();

	const section = document.createElement("section");
	section.className = "rooms-section my-rooms-section";
	section.style.marginBottom = "40px";
	
	const heading = document.createElement("h2");
	heading.textContent = title;
	heading.style.marginBottom = "20px";
	
	const grid = document.createElement("div");
	grid.className = "rooms-grid";
	
	rooms.forEach(room => grid.appendChild(createRoomCard(room)));
	
	section.appendChild(heading);
	section.appendChild(grid);
	
	const publicSection = document.querySelector(".rooms-section");
	if (publicSection) {
		publicSection.parentNode.insertBefore(section, publicSection);
	}
}

function createRoomCard(room) {
	const card = document.createElement("div");
	card.className = "room-card";
	
	const preview = document.createElement("div");
	preview.className = "room-preview";
	preview.innerHTML = '<i class="fas fa-play-circle" style="font-size: 3rem; opacity: 0.5;"></i>';

	const content = document.createElement("div");
	content.className = "room-content";

	const title = document.createElement("div");
	title.className = "room-title";
	title.textContent = room.name;

	const joinButton = document.createElement("button");
	joinButton.className = "join-btn";
	joinButton.textContent = "Присоединиться";
	joinButton.addEventListener("click", () => joinRoom(room.id));

	content.appendChild(title);
	content.appendChild(joinButton);
	card.appendChild(preview);
	card.appendChild(content);
	
	return card;
}

async function joinRoom(id) {
	try {
		clearInlineMessage();
		const token = localStorage.getItem("comedia_token");
		if (token) {
			await apiFetch("/rooms/join", {
				method: "POST",
				body: JSON.stringify({ roomId: id }),
			});
		}
		window.location.href = `room?id=${id}`;
	} catch (e) {
		showInlineMessage(e.message || "Ошибка входа в комнату.");
	}
}

async function joinPrivateRoom() {
	const roomId = document.getElementById("room-code").value.trim();
	const password = document.getElementById("room-password").value.trim();

	if (!roomId) {
		showInlineMessage("Пожалуйста, введите ID комнаты.");
		return;
	}

	const payload = { roomId };
	if (password) {
		payload.password = password;
	}

	try {
		clearInlineMessage();
		await performAuth();
	} catch (err) {
		showInlineMessage(
			"Ошибка авторизации. Требуется авторизация для входа в приватную комнату.",
		);
		return;
	}

	try {
		await apiFetch("/rooms/join", {
			method: "POST",
			body: JSON.stringify(payload),
		});
		window.location.href = `room?id=${roomId}`;
	} catch (err) {
		showInlineMessage(err.message || "Ошибка входа в комнату.");
	}
}
