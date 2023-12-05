// This code uses comments to define a (potentially hierarchical)
// structure within a fragment or the content of an element.
// This allows to manipulate parts of that structure.
// For example, `observeList` translates a dynamic list into a document
// fragment
// - which may be surrounded by other nodes within its parent node and
// - where the individual values in the list may correspond to zero or multiple
//   nodes.
//
// Does this make sense or is it over-engineering?
// Many DOM-generation frameworks have this, but can't we just use some
// custom element(s) to wrap such parts?
// The application programmer might have to deal with these helpers in
// some places.  In particular the meaning of ">" in CSS and querySelector
// is affected.  But wouldn't this be acceptable?
//
// Actually the TodoMVC app in this folder doesn't really need this as it
// wraps lists and list items with TodoList and TodoItem.

import { Tree, Emit, forNodes } from "./tree";
import { observe } from "mobx";


// This is for arrays where values are identified by their positions.
// TODO Have something similar for keyed collections.
export function mapObs<T>(array: T[], factory: (value: T) => Tree) {
    function markedBlocks(items: T[], end: ChildNode) {
        const emit: Emit = el => end.before(el);
        return items.map(item => {
            const mark = new Comment("|");
            emit(mark);
            forNodes(factory(item), emit);
            return mark;
        });
    }

    const frag = new DocumentFragment();
    const end = new Comment("#");
    frag.append(end);
    const markers: ChildNode[] = markedBlocks(array, end);
    markers.push(end);

    // TODO dispose observation, but when?
    // In the disconnectedCallback of some element, but which one?
    // Maybe use a no-UI (`display: none;`) `<dis-poser>` element
    observe(array, change => {
        switch (change.type) {
            case "splice": {
                const {index, removedCount, added} = change;
                const end = markers[index + removedCount];
                for (let current = markers[index]; current !== end;) {
                    const next = current.nextSibling!;
                    current.remove();
                    current = next;
                }
                markers.splice(index, removedCount, ...markedBlocks(added, end));
                break;
            }
            default:
                // "update" would be easy to implement, but we don't need it
                throw new Error("change type not implemented: " + change.type);
        }
    });

    return frag;
}
