type Disposer = () => unknown; // just like Runnable by coincidence

export interface Registry {
    registerDisposer(disposer: Disposer): unknown;
}

export class DisposingHTMLElement extends HTMLElement implements Registry {
    #disposers: (() => void)[] = [];

    registerDisposer(disposer: () => void): void {
        this.#disposers.push(disposer);
    }

    disconnectedCallback() {
        this.innerHTML = '';
        this.#disposers.forEach(disposer => disposer());
        this.#disposers.length = 0;
    }
}
