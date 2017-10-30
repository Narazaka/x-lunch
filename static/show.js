function render() {
  if (state.shuffleMode) {
    updateDom(renderShuffleMode());
  } else {
    updateDom(renderNormalMode());
  }
}

function toggleShuffleMode() {
  state.shuffleMode = !state.shuffleMode;
  render();
}

function renderLunchTitle() {
  return h("h1", { class: { lunchName: true }}, [
    (
      state.showSetName ?
      h("span", [
        h("input", { attrs: { id: "name", type: "text" }, on: { keypress: enterPress(handler.setName) } }),
        h("button", { on: { click: handler.setName }, class: fa("check") }),
      ]) :
      h("span", {}, state.name)
    ),
    h("button", { on: { click: toggleSetName }, class: fa("edit") }),
  ]);
}

function toggleSetName() {
  state.showSetName = !state.showSetName;
  render();
}

function renderMembersControl() {
  return h("div", [
    h("h2", [
      h("span", "いつものメンバー"),
      h("button", { on: { click: toggleAddMembers }, class: fa("plus") }),
      h("button", { on: { click: toggleRemoveMembers }, class: fa("minus") }),
    ]),
    (
      !state.members || !state.members.length ? "いつもシャッフルランチにいくメンバーを追加してください" :
      h("ul", { class: { members: true }}, (state.members || []).map(name =>
        h("li", [
          h("span", name),
          state.showRemoveMembers ? h("button", { on: { click: () => handler.removeMember(name) }, class: fa("remove") }) : "",
        ]),
      ))
    ),
    state.showAddMembers ? h("div", [
      h("p", "1行に1人書いてください"),
      h("textarea", { attrs: { id: "addMembers", rows: 10, cols: 20 }}),
      h("p", [h("button", { on: { click: handler.addMembers }, class: fa("check") }, "追加")]),
    ]) : "",
  ]);
}

function toggleAddMembers() {
  state.showAddMembers = !state.showAddMembers;
  state.showRemoveMembers = false;
  render();
}

function toggleRemoveMembers() {
  state.showRemoveMembers = !state.showRemoveMembers;
  state.showAddMembers = false;
  render();
}

function dateFromTodayMessage(dateStr) {
  const now = new Date();
  now.setHours(0);
  now.setMinutes(0);
  now.setSeconds(0);
  now.setMilliseconds(0);
  const [_, year, month, day] = dateStr.match(/^(\d+)-(\d+)-(\d+)$/);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  const diff = Math.round((date - now) / 86400000);
  const wdiff = diff + now.getDay() - 7;
  if (diff <= -1) {
    return "過去";
  } else if (diff === 0) {
    return "今日";
  } else if (diff === 1) {
    return "明日";
  } else if (diff === 2) {
    return "明後日";
  } else if (wdiff >= 14) {
    return "次回";
  } else if (wdiff >= 7) {
    return "再来週";
  } else if (wdiff >= 0) {
    return "来週";
  } else {
    return "今週";
  }
}

function weekMessage(dateStr) {
  const [_, year, month, day] = dateStr.match(/^(\d+)-(\d+)-(\d+)$/);
  const date = new Date(year, month - 1, day, 0, 0, 0);
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
}

function dateTitle() {
  return `${dateFromTodayMessage(state.currentDate)} ${state.currentDate.replace(/-/g, "/")}(${weekMessage(state.currentDate)}) のグループ分け`;
}

function renderMembersOfGroups() {
  return h("div", [
    h("h2", dateTitle()),
    h("button", { on: { click: toggleStartMoveGroupMemberMode }, class: fa("random") }, "メンバー移動"),
    h("button", { on: { click: toggleEditInactive }, class: fa("thumbs-up") }, "出欠変更"),
    h("button", { on: { click: toggleMemberOfGroupsUIMode }, class: fa("clipboard") }, "ChatWork貼り付け用"),
    state.memberOfGroupsUIMode === "chatwork" ?
    renderMembersOfGroupsChatworkUI() :
    renderMembersOfGroupsNormalUI(),
  ]);
}

function renderMembersOfGroupsNormalUI() {
  return h("dl", (state.membersOfGroups || []).map((membersOfGroup, groupId) => [
    h("dt", { class: { groupTitle: true } }, [
      h("span", `グループ${groupId + 1}`),
    ]),
    h("dd", { class: { groupMembers: true }}, [
      h("ul", { class: { members: true }}, membersOfGroup.map(name =>
        h("li", { class: { inactive: (state.inactiveMembers || {})[name], moving: state.moveGroupMemberMode && state.moveGroupMember === name } }, [
          h("span", name),
          {
            default: "",
            from: h("button", { on: { click: () => setMoveGroupMember(name) }}, "ここから"),
            to: "", // state.moveGroupMember === name ? h("span", "ここから") : "",
          }[state.moveGroupMemberMode || "default"],
          state.editInactive ? (
            (state.inactiveMembers || {})[name] ?
              h("button", { on: { click: () => handler.setActive(name) }}, "出席する") :
              h("button", { on: { click: () => handler.setInactive(name) }}, "欠席する")
          ) : "",
        ])
      ).concat([
        h("li", { class: { command: true }}, [
          state.moveGroupMemberMode || state.editInactive ? "" : h("button", { on: { click: () => toggleAddGroupMember(groupId) }, class: fa("plus") }),
          state.showAddGroupMember === groupId ? h("span", [
            h("input", { attrs: { id: `addGroupMember-${groupId}`, type: "text" }, on: { keypress: enterPress(() => handler.addGroupMember(groupId)) }}),
            h("button", { on: { click: () => handler.addGroupMember(groupId) }, class: fa("check") }, "追加"),
          ]) : "",
          state.moveGroupMemberMode === "to" ? h("button", { on: { click: () => handler.moveGroupMember(groupId) }}, "ここへ") : "",
        ])
      ]))
    ])
  ]).reduce((all, part) => all.concat(part), []));
}

function renderMembersOfGroupsChatworkUI() {
  return h("div", [
    h("textarea", { attrs: { readonly: true, cols: 50, rows: 15 }},
      `[info][title]${dateTitle()}[/title]` +
      (state.membersOfGroups || []).map((membersOfGroup, groupId) => [
        `グループ${groupId + 1}: ` + membersOfGroup.map(name =>
          (state.inactiveMembers || {})[name] ?
          `×${name}`:
          `○${name}`,
        ).join(", "),
      ]).join("\n") + "[/info]",
    ),
  ]);
}

function renderNormalMode() {
  return h("div", [
    renderLunchTitle(),
    h("span", [h("button", { on: { click: toggleShuffleMode } }, "シャッフルする")]),
    renderMembersControl(),
    (!state.membersOfGroups || !state.membersOfGroups.length ? "" : renderMembersOfGroups()),
  ]);
}

function toggleAddGroupMember(groupId) {
  if (state.showAddGroupMember == null || state.showAddGroupMember !== groupId) {
    state.showAddGroupMember = groupId;
  } else {
    state.showAddGroupMember = undefined;
  }
  state.moveGroupMemberMode = undefined;
  state.editInactive = false;
  render();
}

function toggleStartMoveGroupMemberMode() {
  state.moveGroupMemberMode = state.moveGroupMemberMode ? undefined : "from";
  state.moveGroupMember = undefined;
  state.showAddGroupMember = false;
  state.editInactive = false;
  render();
}

function toggleMemberOfGroupsUIMode() {
  state.memberOfGroupsUIMode = state.memberOfGroupsUIMode ? undefined : "chatwork";
  render();
}

function setMoveGroupMember(name) {
  state.moveGroupMember = name;
  state.moveGroupMemberMode = "to";
  render();
}

function toggleEditInactive() {
  state.editInactive = !state.editInactive;
  state.moveGroupMemberMode = undefined;
  state.showAddGroupMember = false;
  render();
}

function renderShuffleMode() {
  return h("div", [
    renderLunchTitle(),
    h("span", [h("button", { on: { click: toggleShuffleMode } }, "グループ分けへ")]),
    h("h2", "シャッフル"),
    h("p", [
      h("span", "日程:"),
      state.currentDate ? h("span", `${state.currentDate.replace(/-/g, "/")} →変更?`) : "",
      h("input", { attrs: { id: "date", type: "date" }}),
    ]),
    h("p", [
      h("span", "グループ数:"),
      state.groupCount ? h("span", `${state.groupCount} →変更?`) : "",
      h("input", { attrs: { id: "groupCount", type: "number", min: 1, max: 25 }}),
    ]),
    h("p", [
      "あらかじめ欠席者を追加する",
      h("button", { on: { click: () => activateAllNextMembers() }, class: fa("refresh") }, "すべてのメンバーを出席にする"),
      h(
        "button",
        {
          on: { click: () => toggleInactivateNextMembersAsCurrent() },
          class: fa(state.inactivateNextMembersAsCurrent ? "check-square-o" : "square-o"),
        },
        "今回欠席者を次回も欠席にする"
      ),
    ]),
    h("ul", { class: { members: true }},
      (state.members || []).map(name =>
        h("li", { class: { inactive: !isActive(name) }}, [
          h("span", name),
          h("div",
            h("button", { on: { click: () => toggleNextMemberAttendance(name) } }, `${isActive(name) ? "欠席" : "出席"}にする`),
          )
        ])
      )
    ),
    h("p", [h("button", { on: { click: handler.shuffle }, class: fa("bolt", { danger: true }) }, "シャッフル！")]),
  ]);
}

function activateAllNextMembers() {
  delete state.nextMemberAttendance;
  delete state.inactivateNextMembersAsCurrent;
  render();
}

function toggleInactivateNextMembersAsCurrent() {
  state.inactivateNextMembersAsCurrent = !state.inactivateNextMembersAsCurrent;
  render();
}

function isActive(name) {
  const nextMemberAttendance = state.nextMemberAttendance || {};
  if (nextMemberAttendance[name] === true) return true;
  if (nextMemberAttendance[name] === false) return false;
  const inactiveMembers = state.inactivateNextMembersAsCurrent && state.inactiveMembers ? state.inactiveMembers : {};
  return !inactiveMembers[name];
}

function toggleNextMemberAttendance(name) {
  if (!state.nextMemberAttendance) state.nextMemberAttendance = {};
  if (state.inactivateNextMembersAsCurrent && state.inactiveMembers[name]) {
    if (state.nextMemberAttendance[name]) { // 明示的に出席とされている場合
      delete state.nextMemberAttendance[name]; // 明示的な指定を消す
    } else { // 明示的な欠席とされているあるいは明示的な指定がない場合
      state.nextMemberAttendance[name] = true; // 明示的な出席を付ける
    }
  } else {
    if (state.nextMemberAttendance[name] === true) { // 明示的に出席とされている場合
      state.nextMemberAttendance[name] = false; // 明示的な欠席をつける
    } else if (state.nextMemberAttendance[name] === false) { // 明示的な欠席とされている場合
      delete state.nextMemberAttendance[name]; // 明示的な指定を消す
    } else { // 明示的な指定がない場合
      state.nextMemberAttendance[name] = false; // 明示的な欠席をつける
    }
  }
  render();
}
