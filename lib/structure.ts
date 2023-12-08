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

import { Tree, Emit, forNodes } from "./tree";
import { observe, reaction } from "mobx";

function clearRange(start: ChildNode, end: ChildNode) {
    // Instead of removing DOM nodes to nowhere, we move them to a
    // dummy fragment (which by itself lives nowhere).  So when other code
    // wants to manipulate the cleared range, this is still possible
    // (but superfluous) within the dummy fragment.
    // Is this trick super elegant or super hacky?
    // TODO Stop that other code?  How?
    const dummyFragment = new DocumentFragment();
    for (let current = start; current !== end;) {
        if (current == null) {
            console.error("clearRange: found null/undefined");
            return;
        }
        const next = current.nextSibling!;
        // current.remove();
        dummyFragment.append(current);
        current = next;
    }
}

// Deriving the parameter types for `observing(...)` from the ones of
// `reaction(...)` to avoid dependency on implementation details such
// as the type names used by mobx.
// (But I did not refine the typing so far that with `fireImmediately === false`
// the parameter `prev` becomes `T` instead of `T | undefined`.)
type ReactionParams<T> = Parameters<typeof reaction<T, boolean>>; 

/**
 * A variant of `mobx`' `reaction` function, but for DOM generation.
 * - The first parameter function is used to determine when the second one
 *   fires, just as in `reaction(...)`.
 * - The second parameter function should return a `Tree` of DOM nodes (whereas
 *   the second parameter of `reaction(...)` runs for its side effects.)
 * - The optional third parameter allows to set options as in `reaction(...)`.
 *   But here the option `fireImmediately` defaults to `true`.
 */
export function observing<T>(
    expression: ReactionParams<T>[0],
    generate: (...args: Parameters<ReactionParams<T>[1]>) => Tree,
    options: ReactionParams<T>[2] = {},
): DocumentFragment {
    const fragment = new DocumentFragment();
    const start = new Comment("(");
    const end = new Comment(")");
    fragment.append(start, end);

    // TODO dispose observation, but when?
    reaction(
        expression,
        (value, prev, r) => {
            clearRange(start.nextSibling!, end);
            forNodes(generate(value, prev, r), el => end.before(el));
        },
        {...options, fireImmediately: options.fireImmediately ?? true},
    );

    return fragment;
}

// This is for arrays where items are identified by their positions.
// TODO Have something similar for keyed collections.
/**
 * Transform an observable live array into a live `Tree` of DOM nodes.
 * The output `Tree` only reacts to array changes.
 * If the subtrees for individual array elements should be reactive,
 * the factory function must implement it.
 */
export function mapObserving<T>(array: T[], factory: (value: T) => Tree) {
    function markedBlocks(items: T[], end: ChildNode) {
        const emit: Emit = el => end.before(el);
        return items.map(item => {
            const mark = new Comment("|");
            emit(mark);
            forNodes(factory(item), emit);
            return mark;
        });
    }

    const fragment = new DocumentFragment();
    const end = new Comment("#");
    fragment.append(end);
    const markers: ChildNode[] = markedBlocks(array, end);
    markers.push(end);

    // TODO dispose observation, but when?
    // In the disconnectedCallback of some element, but which one?
    // Maybe use a no-UI (`display: none;`) `<dis-poser>` element
    observe(array, change => {
        switch (change.type) {
            case "splice": {
                // Hint: `change.added` can be used with plain mobx and with
                // mobx-keystone.  With mobx-state-tree `change.added` seems to
                // contain some helper objects instead of the plain items.
                // But we can get the plain items as
                // `array.slice(change.index, change.index + change.addedCount)`.
                const {index, removedCount, added} = change;
                const end = markers[index + removedCount];
                clearRange(markers[index], end);
                markers.splice(index, removedCount, ...markedBlocks(added, end));
                break;
            }
            default:
                // "update" would be easy to implement, but we don't need it
                throw new Error("change type not yet implemented: " + change.type);
        }
    });

    return fragment;
}
