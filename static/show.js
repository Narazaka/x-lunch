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
  const [_, year, month, day] = dateStr.match(/^(\d+)-(\d+)-(\d+)$/);
  const date = new Date(year, month - 1, day, 0, 0, 0);
  const diff = date - now;
  console.log(diff);
  if (diff < -86400000) {
    return "過去";
  } else if (diff < 0) {
    return "今日";
  } else if (diff < 86400000) {
    return "明日";
  } else {
    return "次回";
  }
}

function renderMembersOfGroups() {
  return h("div", [
    h("h2", `${dateFromTodayMessage(state.currentDate)} ${state.currentDate.replace(/-/g, "/")} のグループ分け`),
    h("button", { on: { click: toggleStartMoveGroupMemberMode }, class: fa("random") }, "メンバー移動"),
    h("button", { on: { click: toggleEditInactive }, class: fa("thumbs-up") }, "出欠変更"),
    h("dl", (state.membersOfGroups || []).map((membersOfGroup, groupId) =>
      [
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
      ]
    ).reduce((all, part) => all.concat(part), [])),
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
      h("input", { attrs: { id: "groupCount", type: "number" }}),
    ]),
    h("p", "あらかじめ欠席者を追加する"),
    h("ul", { class: { members: true }},
      (state.members || []).map(name =>
        h("li", { class: { inactive: !isActive(name) }}, [
          h("span", name),
          h("div",
            (state.inactiveMembers || {})[name] ?
              (
                (state.additionalActiveMembers || {})[name] ?
                  h("button", { on: { click: () => toggleAdditionalActiveMember(name) } }, "欠席にする") :
                  h("button", { on: { click: () => toggleAdditionalActiveMember(name) } }, "出席にする")
              ) :
              (
                (state.additionalInactiveMembers || {})[name] ?
                  h("button", { on: { click: () => toggleAdditionalInactiveMember(name) } }, "出席にする") :
                  h("button", { on: { click: () => toggleAdditionalInactiveMember(name) } }, "欠席にする")
              )
          )
        ])
      )
    ),
    h("p", [h("button", { on: { click: handler.shuffle }, class: fa("bolt", { danger: true }) }, "シャッフル！")]),
  ]);
}

function isActive(name) {
  if ((state.additionalActiveMembers || {})[name]) return true;
  if ((state.additionalInactiveMembers || {})[name]) return false;
  return !(state.inactiveMembers || {})[name];
}

function toggleAdditionalActiveMember(name) {
  if (!state.additionalActiveMembers) state.additionalActiveMembers = {};
  if (state.additionalActiveMembers[name]) {
    delete state.additionalActiveMembers[name];
  } else {
    state.additionalActiveMembers[name] = true;
  }
  render();
}

function toggleAdditionalInactiveMember(name) {
  if (!state.additionalInactiveMembers) state.additionalInactiveMembers = {};
  if (state.additionalInactiveMembers[name]) {
    delete state.additionalInactiveMembers[name];
  } else {
    state.additionalInactiveMembers[name] = true;
  }
  render();
}
