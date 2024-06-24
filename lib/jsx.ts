import { reaction } from "mobx";
import { Registry } from "./disposal";


type Observe<T> = Parameters<typeof reaction<T, true>>[0];
type Update <T> = Parameters<typeof reaction<T, true>>[1];

function obsHelper<T>(
  value: [Registry, Observe<T>] | Observe<T>,
  update: Update<T>,
) {
  // TODO more dynamic type checking for a more helpful error message?
  // Or can I make TypeScript's static checking stricter?
  if (value instanceof Array) {
    const [registry, observe] = value;
    registry.registerDisposer(reaction(observe, update, {fireImmediately: true}));
  } else if (value instanceof Function) {
    reaction(value, update, {fireImmediately: true});
  } else {
    console.error("bad 'obs-...' attribute");
  }
}


type Attrs = Record<string, any>;
type Component = () => void ;

export function h(tag: string | Component, attrs: Attrs, ...children: Node[]): Node {
  const el =
    typeof tag === "string"
    ? document.createElement(tag, {is: attrs?.is})
    : new tag();
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      if (!name.includes(":")) {
        if (typeof tag === "string" && name === "is") {
           // do nothing since "is" was already processed
        } else {
          el.setAttribute(name, value);
        }
      } else {
        const [qualifier, unqualified] = name.split(":");
        switch(qualifier) {
          case "prop":
            (el as any)[unqualified] = value;
            break;
          case "style":
            (el.style as any)[unqualified] = value;
            break;
          case "class":
            el.classList.toggle(unqualified, value);
            break;

          case "obs":
            obsHelper(value, newVal => el.setAttribute(unqualified, newVal));
            break;
          case "obs-prop":
            obsHelper(value, newVal => (el as any)[unqualified] = newVal);
            break;
          case "obs-style":
            obsHelper(value, newVal => (el.style as any)[unqualified] = newVal);
            break;
          case "obs-class":
            obsHelper(value, newVal => el.classList.toggle(unqualified, newVal));
            break;

          case "on":
            // add "consuming" event listener
            el.addEventListener(unqualified, (e: Event) => {
              e.preventDefault();
              e.stopImmediatePropagation();
              value(e);
            });
            break;
          case "on_":
            // add "non-consuming" event listener
            // (but the listener itself may still tweak the event)
            el.addEventListener(unqualified, value);
            break;
          default:
            throw new Error("unsupported qualifier: " + qualifier);
        }
      }
    }
  }
  for (const child of children) {
    el.append(child);
  }
  return el;
}

/** Our JSX fragments actually produce DocumentFragment instances */
export const Fragment = DocumentFragment;

/** Hacky alias for Text making TypeScript happy */
export const TextNode = Text as new() => Text;


