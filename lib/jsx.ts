import { autorun } from "mobx";
import { Tree, forNodes } from "./tree";

type Attrs = Record<string, any>;
type Component = () => void ;

export function h(tag: string | Component, attrs: Attrs, ...children: Tree[]): Tree {
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

// TODO register the autoruns somewhere for disposal (but where?)
                    case "obs":
                        autorun(() => el.setAttribute(name, value()));
                        break;
                    case "obs-prop":
                        autorun(() => (el as any)[unqualified] = value());
                        break;
                    case "obs-style":
                        autorun(() => (el.style as any)[unqualified] = value());
                        break;
                    case "obs-class":
                        autorun(() => el.classList.toggle(unqualified, value()));
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
    forNodes(children, (child: Node | string) => el.append(child));
    return el;
}

/** Our JSX fragments actually produce DocumentFragment instances */
export const Fragment = DocumentFragment;

/** Hacky alias for Text making TypeScript happy */
export const TextNode = Text as new() => Text;


