window.addEventListener("DOMContentLoaded", () => {
  const socket = io("/lunchMembersOfGroups");

  socket.on("result", ({membersOfGroups, currentDate, groupCount, shuffled}) => {
    for (let i = membersOfGroups.length - 1; i >= 0; --i) {
      if (membersOfGroups[i].length) break;
      membersOfGroups.pop();
    }
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
    if (!date) {
      alert("日付が間違っています");
      return;
    }
    const dateContent = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateContent) {
      alert("日付が間違っています");
      return;
    }
    const dateData = new Date(Number(dateContent[1]), Number(dateContent[2]) - 1, Number(dateContent[3]), 23, 59, 59);
    if (new Date() > dateData) {
      alert("日付が過去です");
      return;
    }
    const groupCount = groupCountNode.value || state.groupCount || 1;
    // 欠席者抽出
    const nextInactiveMembersHash = {};
    const nextMemberAttendance = state.nextMemberAttendance || {};
    const inactiveMembers = state.inactivateNextMembersAsCurrent && state.inactiveMembers ? state.inactiveMembers : {};
    for (const name of Object.keys(nextMemberAttendance)) {
      if (nextMemberAttendance[name] === false) nextInactiveMembersHash[name] = true;
    }
    for (const name of Object.keys(inactiveMembers)) {
      if (nextMemberAttendance[name] !== true) nextInactiveMembersHash[name] = true;
    }
    delete state.nextMemberAttendance;
    delete state.inactivateNextMembersAsCurrent;
    const nextInactiveMembers = Object.keys(nextInactiveMembersHash);
    state.shuffleMode = false;
    render();
    socket.emit("shuffle", { date, groupCount, inactiveMembers: nextInactiveMembers });
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
