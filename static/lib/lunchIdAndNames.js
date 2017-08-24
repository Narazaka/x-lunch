window.addEventListener("DOMContentLoaded", () => {
  const socket = io("/lunchIdAndNames");

  socket.on("result", (idAndNames) => {
    state.idAndNames = idAndNames;
    render();
  });
});
