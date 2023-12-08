export type Tree = string | Node | Tree[];

export type Emit = (nodeOrString: Node) => void;

/**
 * Descend recursively through the arrays in a Tree and emit them.
 * Convert strings to nodes.
 */
export function forNodes(tree: Tree, emit: Emit): void {
    if (Array.isArray(tree)) {
        for (const child of tree) {
            forNodes(child, emit);
        }
    } else if (tree == null || tree === "") {
        // do nothing
    } else if (typeof tree === "string") {
        emit(new Text(tree));
    } else {
        emit(tree);
    }
}
