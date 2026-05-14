function switchTab(tabName) {
	document.querySelectorAll(".tab").forEach((tab) => {
		tab.classList.remove("active");
	});

	document.querySelectorAll(".tab-content").forEach((content) => {
		content.classList.remove("active");
	});

	const activeTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
	if (activeTab) {
		activeTab.classList.add("active");
	}
	const activeContent = document.getElementById(tabName + "-tab");
	if (activeContent) {
		activeContent.classList.add("active");
	}
}

function leaveRoom() {
	if (confirm("Вы уверены, что хотите покинуть комнату?")) {
		alert("Вы покинули комнату");
		window.location.href = "index.html";
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const tabs = document.querySelectorAll(".tab");
	tabs.forEach((tab) => {
		tab.addEventListener("click", () => {
			const target = tab.getAttribute("data-tab");
			if (target) {
				switchTab(target);
			}
		});
	});

	const leaveButton = document.querySelector(".leave-btn");
	if (leaveButton) {
		leaveButton.addEventListener("click", leaveRoom);
	}

	const sendMessageHandler = () => {
		if (typeof window.sendMessage === "function") {
			window.sendMessage();
		}
	};

	const sendButton = document.querySelector(".chat-send-btn");
	if (sendButton) {
		sendButton.addEventListener("click", sendMessageHandler);
	}

	const input = document.querySelector(".chat-input");
	if (input) {
		input.addEventListener("keypress", (e) => {
			if (e.key === "Enter") sendMessageHandler();
		});
	}
});
