window.addEventListener("DOMContentLoaded", () => {
  const socket = io("/lunchName");

  socket.on("result", (name) => {
    state.name = name;
    document.title = `${name} - X-Lunch`;
    render();
  });

  socket.emit("init", id);

  handler.setName = function() {
    const nameNode = document.getElementById("name");
    const name = nameNode.value;
    if (!name) return;
    nameNode.value = "";
    state.showSetName = false;
    render();
    socket.emit("update", name);
  };
});
