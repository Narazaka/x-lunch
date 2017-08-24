window.addEventListener("DOMContentLoaded", () => {
  const socket = io("/lunchMembers");

  socket.on("result", (members) => {
    state.members = members;
    render();
  });

  socket.emit("init", id);

  handler.addMembers = function() {
    const node = document.getElementById("addMembers");
    const names = node.value.split(/\r?\n/).map(name => (name || "").trim()).filter(name => name);
    if (!names.length) return;
    node.value = "";
    state.showAddMembers = false;
    render();
    socket.emit("add", names);
  };
  
  handler.removeMember = function(name) {
    socket.emit("remove", name);
  };
});
