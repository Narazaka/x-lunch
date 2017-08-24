function render() {
  const list = state.idAndNames.map(idAndName =>
    h("li", h("a", { attrs: { href: `/${idAndName.id}` }}, idAndName.name || "(無名のランチ)"))
  );
  const newVnode = h("ul", list);
  updateDom(newVnode);
}
