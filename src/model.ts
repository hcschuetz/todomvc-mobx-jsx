import { computed } from "mobx";
import {
  types as t,
  model,
  tProp,
  Model,
  modelAction,
  findParent,
} from "mobx-keystone";


export enum Filter {
  SHOW_ALL     = "SHOW_ALL",
  SHOW_ACTIVE  = "SHOW_ACTIVE",
  SHOW_COMPLETED = "SHOW_COMPLETED",
}

@model("TodoApp/Todo")
export class Todo extends Model({
  // No id needed since (for now) a todo is identified by its position in the
  // containing list.
  text: tProp(t.string),
  completed: tProp(t.boolean, false),
}) {
  @computed
  get store(): TodoStore | undefined {
    return findParent(this, n => n instanceof TodoStore);
  }

  @computed
  get isVisible(): boolean {
    const {store} = this;
    return Boolean(store && filters[store.filter](this));
  }

  @modelAction
  remove() {
    this.store?.removeTodo(this);
  }

  @modelAction
  edit(text: string) {
    const trimmed = text.trim();
    if (trimmed === this.text) {
      return;
    }
    if (!trimmed.length) {
      this.remove();
      return;
    }
    this.text = trimmed;
  }

  @modelAction
  toggle() {
    this.completed = !this.completed;
  }
}

@model("TodoApp/TodoStore")
export class TodoStore extends Model({
  todos: tProp(t.array(t.model(Todo)), () => []),
  filter: tProp(t.enum(Filter), Filter.SHOW_ACTIVE),
}) {
  @computed
  get completedCount(): number {
    return this.todos.filter((todo) => todo.completed).length;
  }

  @computed
  get activeCount(): number {
    return this.todos.length - this.completedCount;
  }

  @modelAction
  addTodo(text: string) {
    const trimmed = text.trim();
    if (trimmed !== "") {
      this.todos.push(new Todo({ text }));
    }
  }

  @modelAction
  removeTodo(todo: Todo) {
    const idx = this.todos.indexOf(todo);
    if (idx === -1) return;
    this.todos.splice(idx, 1);
  }

  @modelAction
  completeAll() {
    const haveActives = !this.todos.every(todo => todo.completed);
    this.todos.forEach((todo) => (todo.completed = haveActives));
  }

  @modelAction
  clearCompleted() {
    for (const todo of [...this.todos]) {
      if (todo.completed) {
        this.removeTodo(todo);
      }
    }
  }

  @modelAction
  setFilter(filter: Filter) {
    this.filter = filter;
  }
}

const filters: Record<Filter, (todo: Todo) => boolean> = {
  SHOW_ALL    : () => true,
  SHOW_ACTIVE   : (todo) => !todo.completed,
  SHOW_COMPLETED: (todo) => todo.completed
}
