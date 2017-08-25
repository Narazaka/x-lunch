function render() {
  const list = state.idAndNames.sort((a, b) => a.name > b.name ? 1 : a.name === b.name ? 0 : -1).map(idAndName =>
    h("li", h("a", { attrs: { href: `/${idAndName.id}` }}, idAndName.name || "(無名のランチ)"))
  );
  const newVnode = h("ul", { class: { lunchList: true } }, list);
  updateDom(newVnode);
}
