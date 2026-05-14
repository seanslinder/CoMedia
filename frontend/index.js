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
		loadRooms();
	} catch (e) {
		console.error(e);
	}
});

async function loadRooms() {
	const grid = document.querySelector(".rooms-grid");
	grid.innerHTML = "<p>Загрузка комнат...</p>";
	try {
		const rooms = await apiFetch("/rooms/public");
		grid.innerHTML = "";
		if (rooms.length === 0) {
			grid.innerHTML =
				"<p>Нет активных публичных комнат. Создайте свою!</p>";
			return;
		}
		rooms.forEach((room) => {
			const card = document.createElement("div");
			card.className = "room-card";
			const preview = document.createElement("div");
			preview.className = "room-preview";
			preview.innerHTML =
				'<i class="fas fa-play-circle" style="font-size: 3rem; opacity: 0.5;"></i>';

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
			grid.appendChild(card);
		});
	} catch (e) {
		grid.innerHTML = '<p style="color:var(--error)">Ошибка загрузки</p>';
	}
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
		window.location.href = `room.html?id=${id}`;
	} catch (e) {
		showInlineMessage("Ошибка входа в комнату.");
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
			"Требуется авторизация для входа в приватную комнату.",
		);
		return;
	}

	try {
		await apiFetch("/rooms/join", {
			method: "POST",
			body: JSON.stringify(payload),
		});
		window.location.href = `room.html?id=${roomId}`;
	} catch (err) {
		showInlineMessage("Ошибка входа в комнату.");
	}
}
