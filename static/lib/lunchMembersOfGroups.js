window.addEventListener("DOMContentLoaded", () => {
  const socket = io("/lunchMembersOfGroups");

  socket.on("result", ({membersOfGroups, currentDate, groupCount, shuffled}) => {
    state.membersOfGroups = membersOfGroups;
    state.currentDate = currentDate;
    state.groupCount = groupCount;
    state.shuffled = shuffled;
    if (!state.inactiveMembersInitialized) {
      handler.initInactiveMembers();
      state.inactiveMembersInitialized = true;
    }
    render();
  });

  socket.emit("init", id);

  handler.shuffle = function() {
    const dateNode = document.getElementById("date");
    const groupCountNode = document.getElementById("groupCount");
    const date = dateNode.value || state.currentDate;
    const groupCount = groupCountNode.value || state.groupCount || 1;
    const inactiveMembers = [];
    state.shuffleMode = false;
    render();
    socket.emit("shuffle", { date, groupCount, inactiveMembers });
  };
  
  handler.addGroupMember = function(groupId, name) {
    socket.emit("add", { date: state.currentDate, groupId, name });
  };
  
  handler.moveGroupMember = function(fromGroupId, toGroupId, name) {
    socket.emit("move", { date: state.currentDate, fromGroupId, toGroupId, name });
  };
});
