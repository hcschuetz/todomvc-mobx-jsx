type Disposer = () => void;

export interface Registry {
    registerDisposer(disposer: Disposer): unknown;
}

export class DisposingHTMLElement extends HTMLElement implements Registry {
    #disposers: Disposer[] = [];

    registerDisposer(disposer: Disposer): void {
        this.#disposers.push(disposer);
    }

    disconnectedCallback() {
        this.replaceChildren();
        this.#disposers.forEach(disposer => disposer());
        this.#disposers.length = 0;
    }
}
