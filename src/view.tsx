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

class TodoApp extends HTMLElement {
  store: TodoStore;

  connectedCallback() {
    const toggleAllId = `toggle-all-${crypto.randomUUID()}`;

    const store = this.store;

    this.append(
      <section class="todoapp">
        <header class="header">
          <h1>todos</h1>
          <new-todo-form
            prop:create={(text: string) => store.addTodo(text)}
            on:new-todo={(e: CustomEvent) => store.addTodo(e.detail)}
          />
        </header>
        <section class="main">
          <input type="checkbox" id={toggleAllId} class="toggle-all"
            on:change={() => store.completeAll()}
          />
          <label for={toggleAllId}
            obs-class:hidden={() => store.todos.length === 0}
          >
            {/* Is this text ever visible?  For accessibility? */}
            Mark all as complete
          </label>
          <todo-list prop:todos={store.todos} />
        </section>
        <footer class="footer"
          obs-class:hidden={() => store.todos.length === 0}
        >
          <span class="todo-count">
            <TextNode obs-prop:data={() =>
              `${store.activeCount}
              item${store.activeCount === 1 ? "" : "s"} left!`
            }/>
          </span>
          <ul class="filters">
            <li>
              <a href="#/" obs-class:selected={() =>
                store.filter === Filter.SHOW_ALL
              }>All</a>
            </li>
            <li>
              <a href="#/active" obs-class:selected={() =>
                store.filter === Filter.SHOW_ACTIVE
              }>Active</a>
            </li>
            <li>
              <a href="#/completed" obs-class:selected={() =>
                store.filter === Filter.SHOW_COMPLETED
              }>Completed</a>
            </li>
          </ul>
          <button
            class="clear-completed"
            obs-class:hidden={() => store.completedCount === 0}
            on:click={() => store.clearCompleted()}
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
