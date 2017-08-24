window.addEventListener("DOMContentLoaded", () => {
  const socket = io("/lunchMembersOfGroups");

  socket.on("result", ({membersOfGroups, currentDate, groupCount, shuffled}) => {
    state.membersOfGroups = membersOfGroups;
    state.currentDate = currentDate;
    state.groupCount = groupCount;
    state.shuffled = shuffled;
    handler.initInactiveMembers();
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
  
  handler.addGroupMember = function(groupId) {
    const node = document.getElementById(`addGroupMember-${groupId}`);
    const name = node.value;
    if (!name) return;
    node.value = "";
    state.showAddGroupMember = false;
    render();
    socket.emit("add", { date: state.currentDate, groupId, name });
  };
  
  handler.moveGroupMember = function(toGroupId) {
    const name = state.moveGroupMember;
    let fromGroupId;
    for (let groupId = 0; groupId < (state.membersOfGroups || []).length; ++groupId) {
      if (state.membersOfGroups[groupId].indexOf(name) !== -1) {
        fromGroupId = groupId;
        break;
      }
    }
    if (fromGroupId == null) return;
    state.moveGroupMemberMode = undefined;
    socket.emit("move", { date: state.currentDate, fromGroupId, toGroupId, name });
  };
});
