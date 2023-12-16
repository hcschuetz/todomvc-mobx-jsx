import { h, TextNode, Fragment } from '../lib/jsx';
import { DisposingHTMLElement } from "../lib/disposal";
import { mapObserving } from "../lib/structure";
import { Filter, Todo, TodoStore } from './model';
import { observable, reaction } from 'mobx';


class NewTodoForm extends HTMLElement {
  create: (text: string) => unknown;

  connectedCallback() {
    let input: HTMLInputElement;

    const onSubmit = () => {
      this.create(input.value);
      input.value = "";
    }

    this.append(
      <form on:submit={onSubmit}>
        {input =
          <input class="new-todo"
            placeholder="What needs to be done?"
            autofocus
          />
        }
      </form>
    );
  }
}

customElements.define("new-todo-form", NewTodoForm);

class TodoItem extends DisposingHTMLElement {
  todo: Todo;

  connectedCallback() {
    /** UI state */
    const editing = observable.box<boolean>(false);

    let completed: HTMLInputElement;
    let input: HTMLInputElement;

    const startEdit = () => {
      editing.set(true);
      input.value = this.todo.text;
      input.focus();
    };
    const endEdit = () => {
      editing.set(false);
      this.todo.edit(input.value);
    };

    this.registerDisposer(reaction(
      () => this.todo.isVisible,
      visible => {
        this.replaceChildren(
          visible ? (
            <li
              obs-class:editing={[this, () => editing.get()]}
              // Instead of adding/removing contents
              // we might just show/hide it it using CSS:
              // obs-class:hidden={[this, () => !this.todo.isVisible]}
            >
              <div class="view">
                {completed =
                  <input type="checkbox" class="toggle"
                    on:change={() => this.todo.setCompleted(completed.checked)}
                    obs-prop:checked={[this, () => this.todo.completed]}
                  />
                }
                <label on:dblclick={startEdit}>
                  <TextNode obs-prop:data={[this, () => this.todo.text]}/>
                </label>
                <button class="destroy" on:click={() => this.todo.remove()}/>
              </div>
              <form style:display="contents" on:submit={endEdit}>
                {input = <input class="edit" on:blur={endEdit}/>}
              </form>
            </li>
          ) : (
            <></>
          )
        );
      },
      {fireImmediately: true},
    ));
  }
}

customElements.define("todo-item", TodoItem);

class TodoList extends DisposingHTMLElement {
  todos: Todo[];

  connectedCallback() {
    this.append(
      <ul class="todo-list">
        {mapObserving(
          this.todos,
          (todo: Todo) => <todo-item prop:todo={todo} />,
          {registry: this},
        )}
      </ul>
    );
  }
} 

customElements.define("todo-list", TodoList);

/**
This class is just for demonstration purposes.
I would not recommend using `<filter-selector>` for several reasons:
- The abstraction of so little functionality is not really worthwhile.
- Using the shadow DOM does not fit well with our global CSS.
  We need to re-define some CSS in the shadow DOM and
  we even have to override some CSS in the main DOM.
- We need a nicer solution for the observable property `currentFilter`.

But this class shows how children of the custom element can be referenced
elegantly in the shadow DOM using `<slot/>`.
*/
class FilterSelector extends HTMLElement {
  href: string;
  myFilter: Filter;

  // We should be able to simply write something like
  //
  //   @observable accessor currentFilter: Filter;
  //
  // But according to https://mobx.js.org/enabling-decorators.html
  // that requires "experimentalDecorators" to be disabled in tsconfig.json.
  // OTOH mobx-keystone decorators seem to need "experimentalDecorators" enabled.
  #currentFilter = observable.box<Filter>();
  set currentFilter(value: Filter) { this.#currentFilter.set(value); }
  get currentFilter(): Filter | undefined { return this.#currentFilter.get(); }

  connectedCallback() {
    // When the focus is on the <a> element in the shadow DOM,
    // this <filter-selector> element has the focus of the main DOM and thus
    // gets a boxShadow from the CSS.  Override this:
    this.style.boxShadow = "none";

    this.attachShadow({mode: "closed"}).append(
      // CSS for the main DOM does not apply in the shadow DOM,
      // so we have to provide the relevant styles here:
      <style>{`
        li {
          display: inline;
        }
        li a {
          color: inherit;
          margin: 3px;
          padding: 3px 7px;
          text-decoration: none;
          border: 1px solid transparent;
          border-radius: 3px;
        }
        li a:hover {
          border-color: #DB7676;
        }
        li a.selected {
          border-color: #CE4646;
        }
        li a:focus {
          box-shadow: 0 0 2px 2px #CF7D7D;
          outline: 0;
        }
      `}</style>,
      <li>
        <a href={this.href}
          obs-class:selected={() => this.currentFilter === this.myFilter}
        >
          <slot/>
        </a>
      </li>
    );
  }
}

customElements.define("filter-selector", FilterSelector);

class TodoApp extends HTMLElement {
  store: TodoStore;

  connectedCallback() {
    // It's ugly to use an `id` attribute in a generated component without
    // Shadow DOM.  But here we follow the standard structure of TodoMVC
    // so that we can use their CSS.  At least we use newly generated ids
    // so that this component could be re-used in theory.
    const toggleAllId =
      `toggle-all-${Date.now().toString(36)}-${(Math.random() * (2**53)).toString(36)}`;

    this.append(
      <section class="todoapp">
        <header class="header">
          <h1>todos</h1>
          <new-todo-form
            prop:create={(text: string) => this.store.addTodo(text)}
            on:new-todo={(e: CustomEvent) => this.store.addTodo(e.detail)}
          />
        </header>
        <section class="main">
          <input type="checkbox" id={toggleAllId} class="toggle-all"
            on:change={() => this.store.completeAll()}
          />
          <label for={toggleAllId}
            obs-class:hidden={() => this.store.todos.length === 0}
          >
            {/* Is this text ever visible?  For accessibility? */}
            Mark all as complete
          </label>
          <todo-list prop:todos={this.store.todos} />
        </section>
        <footer class="footer"
          obs-class:hidden={() => this.store.todos.length === 0}
        >
          <span class="todo-count">
            <TextNode obs-prop:data={() =>
              `${this.store.activeCount}
              item${this.store.activeCount === 1 ? "" : "s"} left!`
            }/>
          </span>
          <ul class="filters">
            <filter-selector
              prop:href="#/"
              prop:myFilter={Filter.SHOW_ALL}
              obs-prop:currentFilter={() => this.store.filter}
            >All</filter-selector>
            <filter-selector
              prop:href="#/active"
              prop:myFilter={Filter.SHOW_ACTIVE}
              obs-prop:currentFilter={() => this.store.filter}
            >Active</filter-selector>
            <filter-selector
              prop:href="#/completed"
              prop:myFilter={Filter.SHOW_COMPLETED}
              obs-prop:currentFilter={() => this.store.filter}
            >Completed</filter-selector>
          </ul>
          <button
            class="clear-completed"
            obs-class:hidden={() => this.store.completedCount === 0}
            on:click={() => this.store.clearCompleted()}
          >Clear completed</button>
        </footer>
      </section>
    );
  }
}

customElements.define("todo-app", TodoApp);

// The .hidden rule from TodoMVC is not specific enough for the toggle-all label.
// So we add a more specific one.
document.body.append(<style>{".hidden.hidden {display: none;}"}</style>)
