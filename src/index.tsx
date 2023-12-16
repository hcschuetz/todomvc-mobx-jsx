import { configure } from "mobx";
import { ModelAutoTypeCheckingMode, applyPatches, fromSnapshot, onPatches, onSnapshot, setGlobalConfig } from "mobx-keystone";

import { h } from "../lib/jsx";
// import debug from "./lib/debug";

import "todomvc-common/base.css";
import "todomvc-app-css/index.css";

import { Filter, TodoStore } from "./model";
import "./view";


configure({
  enforceActions: "never",
  computedRequiresReaction: false,
  reactionRequiresObservable: false,
  observableRequiresReaction: false,
  disableErrorBoundaries: false,
});

setGlobalConfig({
  modelAutoTypeChecking: ModelAutoTypeCheckingMode.AlwaysOff //AlwaysOn,
});


const store = new TodoStore({
  todos: fromSnapshot(JSON.parse(localStorage.getItem("todos-mk") ?? "[]")),
});

onSnapshot(store.todos, snap => {
  localStorage.setItem("todos-mk", JSON.stringify(snap));
});

{
  const channel = new BroadcastChannel("todos-mk");

  let applyingIncomingPatches = false;

  onPatches(store.todos, patches => {
    if (!applyingIncomingPatches) {
      channel.postMessage(patches);
    }
  });

  channel.onmessage = msg => {
    try {
      applyingIncomingPatches = true;
      applyPatches(store.todos, msg.data);
    } finally {
      applyingIncomingPatches = false;
    }
  }
}

{
  function updateFilter() {
    const {hash} = document.location;
    store.setFilter(
      hash === "#/active"    ? Filter.SHOW_ACTIVE    :
      hash === "#/completed" ? Filter.SHOW_COMPLETED :
                               Filter.SHOW_ALL,
    )
  }

  window.addEventListener("hashchange", updateFilter);

  updateFilter();
}

// debug(store);

document.getElementById("root")!.append(<todo-app prop:store={store} />);
