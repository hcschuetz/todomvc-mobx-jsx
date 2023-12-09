import { h, TextNode } from '../lib/jsx';
import { DisposingHTMLElement } from "../lib/disposal";
import { mapObserving, observing } from "../lib/structure";
import { Filter, Todo, TodoStore } from './model';
import { observable } from 'mobx';


class NewTodoForm extends HTMLElement {
  store: TodoStore;

  connectedCallback() {
    let input: HTMLInputElement;

    const onSubmit = () => {
      this.store.addTodo(input.value);
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

    this.append(
      <li
        // Instead of omitting an invisible `TodoItem`s in TodoList we
        // might just hide it using CSS:
        // obs-class:hidden={[this, () => !this.todo.isVisible]}
        obs-class:editing={[this, () => editing.get()]}
      >
        <div class="view">
          <input type="checkbox" class="toggle"
            on:change={() => this.todo.toggle()}
            obs-prop:checked={[this, () => this.todo.completed]}
          />
          <label on:dblclick={startEdit}>
            <TextNode obs-prop:data={[this, () => this.todo.text]}/>
          </label>
          <button class="destroy" on:click={() => this.todo.remove()}/>
        </div>
        <form style:display="contents" on:submit={endEdit}>
          {input = <input class="edit" on:blur={endEdit}/>}
        </form>
      </li>
    );
  }
}

customElements.define("todo-item", TodoItem);

const renderTodoWheneverVisible = (todo: Todo) => observing(
  () => todo.isVisible,
  visible => visible ? <todo-item prop:todo={todo} /> : null,
);

class TodoList extends HTMLElement {
  todos: Todo[];

  connectedCallback() {
    this.append(
      <ul class="todo-list">
        {mapObserving(this.todos, renderTodoWheneverVisible)}
      </ul>
    );
  }
} 

customElements.define("todo-list", TodoList);

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
            prop:store={this.store}
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
            <li>
              <a href="#/" obs-class:selected={() =>
                this.store.filter === Filter.SHOW_ALL
              }>All</a>
            </li>
            <li>
              <a href="#/active" obs-class:selected={() =>
                this.store.filter === Filter.SHOW_ACTIVE
              }>Active</a>
            </li>
            <li>
              <a href="#/completed" obs-class:selected={() =>
                this.store.filter === Filter.SHOW_COMPLETED
              }>Completed</a>
            </li>
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
