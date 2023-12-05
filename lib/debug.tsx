import { getSnapshot, onPatches, onSnapshot } from "mobx-keystone";
import { h } from "./jsx";

export default function debug(store: any) {
    const log = <pre style="
        margin: 5px 0;
        border-radius: 5px;
        padding: 5px;
        color: white;
        background-color: #444;
        overflow-x: auto;
    "/> 
    document.body.append(log);
    onPatches(store.todos, patches => {
        for (const patch of patches) {
            log.textContent += JSON.stringify(patch) + "\n";
        }
        log.textContent += "----------------\n";
    });


    const state = <pre style="
        margin: 5px 0;
        border-radius: 5px;
        padding: 5px;
        color: white;
        background-color: black;
        overflow-x: auto;
    "/>
    document.body.append(state);
    onSnapshot(store, (data) => {
        state.textContent = JSON.stringify(data, null, 2);
    })
    state.textContent = JSON.stringify(getSnapshot(store), null, 2);
}
