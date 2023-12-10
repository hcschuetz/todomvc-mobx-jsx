import { observe } from "mobx";
import { Registry } from "./disposal";

// This is for arrays where items are identified by their positions.
// TODO Have something similar for keyed collections.
/**
 * Transform an observable live array into a live list of DOM nodes.
 * The output list only reacts to array changes, not to changes in individual
 * items.
 */
export function mapObserving<T>(
  array: T[],
  factory: (value: T) => ChildNode,
  options: {registry?: Registry} = {}
): DocumentFragment {
  const fragment = new DocumentFragment();
  const elements = array.map(factory);
  // See below for the purpose of this dummy node:
  elements.push(new Comment("#"));
  fragment.append(...elements);

  const disposer = observe(array, change => {
    switch (change.type) {
      case "splice": {
        // Hint: `change.added` can be used with plain mobx and with
        // mobx-keystone.  With mobx-state-tree `change.added` seems to
        // contain some helper objects instead of the plain items.
        // But we can get the plain items as
        // `array.slice(change.index, change.index + change.addedCount)`.
        const {index, removedCount, added} = change;
        const addedElements = added.map(factory);
        elements.splice(index, removedCount, ...addedElements).forEach(old => {
          old.remove();
        });
        // Due to the dummy node this won't read beyond the end of `elements`:
        elements[index + added.length].before(...addedElements);
        break;
      }
      case "update": {
        // This case isn't used by our TodoMVC code and completely untested.
        const {index, newValue} = change;
        const oldElement = elements[index];
        const newElement = factory(newValue);
        elements[index] = newElement;
        oldElement.parentNode!.replaceChild(newElement, oldElement);
        break;
    }
    default:
        throw new Error("unexpected array-change type: " + change["type"]);
    }
  });
  options.registry?.registerDisposer(disposer);

  return fragment;
}
