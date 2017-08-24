function render() {
  const newVnode = state.shuffleMode ? renderShuffleMode() : renderNormalMode();
  updateDom(newVnode);
}

function toggleShuffleMode() {
  state.shuffleMode = !state.shuffleMode;
  render();
}

function renderNormalMode() {
  return h("div", [
    h("h1", { on: { click: toggleSetName }}, state.name),
    state.showSetName ? h("div", [
      h("input", { attrs: { id: "name" }, on: { keypress: enterPress(handler.setName) } }),
      h("button", { on: { click: handler.setName } }, "ランチのくくり名変更"),
    ]): "",
    h("p", [h("button", { on: { click: toggleShuffleMode } }, "シャッフル")]),
    h("h2", "いつものメンバー"),
    h("p", [
      h("button", { on: { click: toggleAddMembers } }, "追加"),
      h("button", { on: { click: toggleRemoveMembers } }, "削除"),
    ]),
    h("ul", (state.members || []).map(name =>
      h("li", [
        h("span", name),
        state.showRemoveMembers ? h("button", { on: { click: () => handler.removeMember(name) }}, "削除") : "",
      ]),
    )),
    state.showAddMembers ? h("div", [
      h("p", "1行に1人"),
      h("textarea", { attrs: { id: "addMembers", rows: 10, cols: 20 }}),
      h("p", [h("button", { on: { click: handler.addMembers } }, "追加")]),
    ]) : "",
    h("h2", "グループ分け"),
    state.currentDate ? h("p", `日付: ${state.currentDate}`) : "",
    h("div", (state.membersOfGroups || []).map((membersOfGroup, index) =>
      h("dl", [
        h("dt", `グループ${index + 1}`),
        h("dd", [
          h("ul", membersOfGroup.map(name =>
            h("li", [
              h("span", name),
            ])
          ))
        ])
      ])
    )),
  ]);
}

function toggleSetName() {
  state.showSetName = !state.showSetName;
  render();
}

function toggleAddMembers() {
  state.showAddMembers = !state.showAddMembers;
  render();
}

function toggleRemoveMembers() {
  state.showRemoveMembers = !state.showRemoveMembers;
  render();
}

function renderShuffleMode() {
  return h("div", [
    h("h1", {}, state.name),
    h("p", [h("button", { on: { click: toggleShuffleMode } }, "戻る")]),
    h("h2", "シャッフル"),
    h("p", `前回: ${state.currentDate || ""} →変更する`),
    h("input", { attrs: { id: "date" }}),
    h("p", `前回: ${state.groupCount || 0} →変更する`),
    h("input", { attrs: { id: "groupCount", type: "number" }}),
    // inactiveMembers
    h("p", [h("button", { on: { click: handler.shuffle } }, "シャッフルする")]),
  ]);
}
