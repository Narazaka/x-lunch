window.addEventListener("DOMContentLoaded", () => {
  const socket = io("/lunchInactiveMembers");

  socket.on("result", (date, inactiveMembers) => {
    if (!(date === state.currentDate)) return;
    state.inactiveMembers = {};
    for (const name of inactiveMembers) state.inactiveMembers[name] = true;
    render();
  });

  handler.initInactiveMembers = function() {
    socket.emit("init", { id, date: state.currentDate });
  };

  handler.setActive = function(name) {
    socket.emit("active", { date: state.currentDate, name });
  };
  
  handler.setInactive = function(name) {
    socket.emit("inactive", { date: state.currentDate, name });
  };
});
