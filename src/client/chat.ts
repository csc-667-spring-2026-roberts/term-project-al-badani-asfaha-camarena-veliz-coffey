// SSE setup
const scriptTag = document.currentScript as HTMLScriptElement;
const gameId = scriptTag.dataset.gameId || "";
const user = scriptTag.dataset.user;
const evtSource = new EventSource(`/api/sse/${gameId}`);
evtSource.onmessage = function (event): void {
  const data = JSON.parse(event.data);
  const msg = data.data as { text: string; user: string };
  if (data.type === "game_message") {
    const div = document.createElement("div");
    div.className = `message ${msg.user === user ? "self" : "other"}`;
    div.innerHTML = `<strong>${msg.user} :</strong> ${msg.text}`;
    const messagesDiv = document.getElementById("messages");
    if (messagesDiv) {
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }
};

const chatForm = document.getElementById("chatForm");
const textInput = document.getElementById("textInput") as HTMLInputElement;
if (chatForm && gameId) {
  chatForm.addEventListener("submit", function (e) {
    e.preventDefault();

    fetch(`/api/games/${gameId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: textInput.value,
      }),
    })
      .then(() => {
        textInput.value = "";
      })
      .catch((err: unknown) => {
        console.error("Failed to send message:", err);
      });
  });
}
