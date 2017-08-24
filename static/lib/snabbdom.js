window.addEventListener("DOMContentLoaded", function () {
  const patch = snabbdom.snabbdomBundle.patch;
  const h = snabbdom.snabbdomBundle.h;
  /*const patch = snabbdom.init([
    snabbdom_style,
    snabbdom_class,
    snabbdom_props,
    snabbdom_attributes,
    snabbdom_eventlisteners,
  ]);*/
  let vnode = h("div");
  const container = document.getElementById("app");
  vnode = patch(container, vnode);

  const updateDom = (newVnode) => vnode = patch(vnode, newVnode);
  window.h = h;
  window.updateDom = updateDom;
});
