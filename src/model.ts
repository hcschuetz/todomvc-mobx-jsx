import { computed } from "mobx";
import {
  types as t,
  model,
  tProp,
  Model,
  modelAction,
  findParent,
  createContext,
} from "mobx-keystone";


const filterCtx = createContext<(todo: Todo) => boolean>(() => true);
const removeTodoCtx = createContext<(todo: Todo) => unknown>();

@model("TodoApp/Todo")
export class Todo extends Model({
  // No id needed since (for now) a todo is identified by its position in the
  // containing list.
  text: tProp(t.string),
  completed: tProp(t.boolean, false),
}) {
  @computed
  get isVisible(): boolean {
    return filterCtx.get(this)(this);
  }

  @modelAction
  remove() {
    removeTodoCtx.get(this)?.(this);
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

export enum Filter {
  SHOW_ALL     = "SHOW_ALL",
  SHOW_ACTIVE  = "SHOW_ACTIVE",
  SHOW_COMPLETED = "SHOW_COMPLETED",
}

const filters: Record<Filter, (todo: Todo) => boolean> = {
  SHOW_ALL    : () => true,
  SHOW_ACTIVE   : (todo) => !todo.completed,
  SHOW_COMPLETED: (todo) => todo.completed
}

@model("TodoApp/TodoStore")
export class TodoStore extends Model({
  todos: tProp(t.array(t.model(Todo)), () => []),
  filter: tProp(t.enum(Filter), Filter.SHOW_ACTIVE),
}) {
  protected onInit(): void {
    filterCtx.setComputed(this, () => filters[this.filter]);
    removeTodoCtx.set(this, todo => this.removeTodo(todo));
  }

  @computed
  get completedCount(): number {
    return this.todos.reduce((sum, todo) => sum + Number(todo.completed), 0);
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
