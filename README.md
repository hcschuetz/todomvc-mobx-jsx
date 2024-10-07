TodoMVC with MobX, Custom Elements and JSX
==========================================

This implementation of the TodoMVC example demonstrates how a reactive
application state (based on MobX and, for convenience, `mobx-keystone`)
can be mapped to a DOM tree dynamically, even without React.

A DOM-based JSX implementation and custom elements (web components)
help to make the application code succinct and readable.

(Without a heavy UI framework, does this TodoMVC implementation still count as
"Vanilla JS"?  Or is the MobX flavor dominating too strongly?)


TL;DR
-----

Have a look at [`./src/view.tsx`](src/view.tsx) to get an idea
how the dynamic mapping from the state to the DOM is implemented.


Building and Running
--------------------

```bash
git clone https://github.com/hcschuetz/todomvc-mobx-jsx
cd todomvc-mobx-jsx
npm install

# Build the app which can be served by a static HTTP server:
# (Goes to ./dist/)
npm run build

# Or run a dev server:
npm run dev
```


Application Overview
--------------------

The `src/` folder contains application-specific code whereas
the `lib/` folder contains a few general utilities
that might go to to some new library.

The not-so-interesting files in `src/`:
- `src/index.html` contains the usual top-level HTML.
- `src/model.ts` contains the state definition, a straight-forward
  `mobx-keystone` application.
- `src/index.tsx` binds all the pieces together.
  Furthermore it implements
  - the observation of the URL hash,
  - access to the `localStorage`, and
  - communication with other windows
    running the same application from the same origin
    through a `BroadcastChannel`
    (just to demonstrate that the state can also react to non-UI events).

The most interesting code is in `src/view.tsx`.
It defines and registers four custom elements:
- `NewTodoForm` (HTML tag: `new-todo-form`) contains the `<input>` element
  for creating new todos.
- `TodoItem` (HTML tag: `todo-item`) provides the UI for an individual todo.
- `TodoList` (HTML tag: `todo-list`) lists the todos.
- `TodoApp` (HTML tag: `todo-app`) binds the previous components together and
  also provides the bottom bar.

Let us have a closer look at these components, starting from the simpler ones
and progressing to the more complex ones.

### `NewTodoForm`

This component holds a reference to a callback function `create` that will be
invoked every time the user enters a new todo.
The code instantiating the `NewTodoForm` is expected to also set the `create`
property.

`connectedCallback` is a life-cycle method for custom elements, which is
invoked as soon as the element becomes part of a DOM tree.
Its implementation consists of the following parts:
- the variable `input` (which will refer to the contained `<input>` element),
- the user-action callback `onSubmit` (emitting the input text
  to the `create` callback and clearing the input element), and
- code adding a small new DOM tree as the contents of the `NewTodoForm`.
  (`this.append(...)` is the standard DOM method for inserting children
  -- just as a reminder for people like me who have almost forgotton about
  plain DOM manipulation in years of using React.)

The JSX looks a bit like the JSX in a typical React application, but there are
important differences:
- Each JSX element evaluates to a real DOM element, not a VDOM (virtual DOM)
  element.
- Therefore we can simply assign such elements to variables without
  workarounds like React's `useRef()` and `ref` attribute.
- Unqualified attributes become DOM attributes, not properties as in React.
  This is the reason why we write `class="..."` rather than `className="..."`.
- An attribute with qualifier `on:` is converted into an event listener.
  Actually `on:`-qualified event listeners will automatically "consume"
  their events by calling
  `preventDefault()` and `stopImmediatePropagation()` on them.
  (If you don't want this, use `on_:`.)

The structure of our `connectedCallback` implementation is quite typical for
our programming style.   A typical implementation contains
- zero or more variable declarations,
- zero or more callback functions,
- code inserting children.

BTW, we could have written
```tsx
const input =
  <input class="new-todo"
    placeholder="What needs to be done?"
    autofocus
  />
```
at the beginning of the function and
```tsx
    this.append(
      <form on:submit={onSubmit}>
        {input}
      </form>
    );
```
later.  But as a matter of taste I prefer not to break the DOM nesting apart.

Instead of deriving `NewTodoForm` from `HTMLElement`
(as an "autonomous custom element") and wrapping a `<form>` element,
we could have derived it from `HTMLFormElement`
(as a "customized built-in element"), wrapping only the `<input>` element.
But wrapping the `<form>` has the advantage that we can use our JSX shorthand
syntax for attaching the submit-event listener.

### `TodoList`

This component holds a reference `todos` to
the corresponding array of todos in the global state.
Actually this is a reactive (observable) MobX array.

The `connectedCallback` does not need any DOM references or callbacks.
It only adds some contained DOM elements.

The most interesting part is the call to `mapObserving(...)`.
This function converts an array into a sequence of DOM nodes in a way
similar to
```tsx
this.todos.map((todo: Todo) => <todo-item prop:todo={todo} />)
```
but will keep observing the array:
- Whenever elements are added to the array, corresponding DOM elements will be
  added to the output
- Similarly removing or replacing array elements will lead to the removal or
  replacement of the corresponding DOM elements.

The third argument of `mapObserving` is an options object.
The only supported option is `registry`, which provides an object implementing
the `Registry` interface.  `mapObserving` will use it to register the disposer
of the observation for later invocation.

For convenience there is `DisposingHTMLElement`, a subclass of
`HTMLElement` implementing the `Registry` interface and invoking all the
registered disposers in the `disconnectedCallback` life-cycle method.
(If you implement `disconnectedCallback` by yourself, don't forget to
call `super.disconnectedCallback()`.)

`TodoList` is again an autonomous custom element wrapping a `<ul>` element
(rather than a customized build-in element derived from from `HTMLUListElement`),
which allows to attach the class attribute with JSX in a comfortable way
and to inherit the disposal support from `DisposingHTMLElement`.

Finally notice that the todo reference of the `TodoItem` element is assigned
using the attribute definition `prop:todo={todo}`.
(The qualifier `prop:` indicates that the value should be assigned to the
*property* `todo`, not to an attribute.)


### `TodoItem`

This component has a reference `todo` of type `Todo`.
This is actually the property that has just been mentioned
at the end of the previous section.

The `connectedCallback` has two variables (`completed` and `input`)
referencing DOM elements
and two callbacks `startEdit` and `endEdit` to be invoked upon user actions.
Finally there is some code assigning child elements.
These things are similar to what we had in `NewTodoForm`,
but we have some additional complexity:
- `editing` is an observable `boolean` telling whether the todo is currently
  being edited.
  This piece of state is not considered to be part of the model, but rather
  just UI state.  Therefore it is defined in the view code.
- The content depends on the visibility of the todo.
  This is implemented by a reaction observing the visibility.
  Instead of `this.append(...)` we are now using `this.replaceChildren(...)`
  because the function is invoked repeatedly (whenever the visibility changes)
  and therefore old children must be cleaned up.
- The `TodoItem` element itself is used to manage disposal of the observation.
  It is (like `TodoList`) derived from `DisposingHTMLElement` and its
  `registerDisposer` takes the disposer returned by the reaction.
- We have more attribute qualifiers in JSX.  (See the section on JSX below.)

Some utility function analogous to `mapObserving` might help
to reduce the amount of boilerplate code needed for the visibility treatment.
(In Svelte this would just be a `{#if todo.isVisible}...{/if}` block.)


### `TodoApp`

This custom element should by now be quite straight-forward to understand.


## JSX in More Detail

JSX parsers distinguish
element tags starting with lowercase letters (case 1) from
ones starting with uppercase letters (case 2).
In case 1 the tag itself is passed to the JSX handler as a string
whereas in case 2 the tag is interpreted as an identifier and its value
is passed to the JSX handler.
And if there is no tag at all (`<>...</>`) this is taken as a shorthand
notation for `<Fragment>...</Fragment>`.

Our JSX handler creates DOM elements from strings (case 1).
Depending on the tag these may be
standard elements (`<div>`, `<span>`, `<a>`, ...) or
custom elements (`<todo-item>`, ...).
Any other value (case 2) is expected to denote a class with a zero-argument constructor.
This constructor will be invoked.
The resulting object is returned after handling any JSX attributes.

We provide these classes for case 2:
- `Fragment` is an alias for `DocumentFragment` and provided to support the
  `<>...</>` shorthand syntax.
- `TextNode` is an alias for `Text` and creates a text node.
  (Unfortunately we cannot use `<Text data="foo" />` directly because
  TypeScript would expect React-ish semantics here.  Can we adjust that?)

For our (autonomous) custom elements we can use the variants
`<todo-item ...>` and `<TodoItem ...>` interchangeably.

As mentioned earlier, we could have derived `NewTodoForm` from `HTMLFormElement`
and registered it as a customization of `"form"`.
In this case we would instantiate it in JSX just as in HTML by
`<form is="new-todo-form" ...>`.

JSX attributes of the following forms are supported:
- `xxx=` (without colon) sets the DOM attribute `xxx`.
  (But `is=` is used in a special way as described above.)
- `prop:xxx=` sets the property `xxx`.
- `class:xxx=` with a boolean value is a shorthand for adding/removing
  class `xxx` to/from the class list.
- `style:xxx=` is a shorthand for setting the style property `xxx`.
- `obs:xxx=`, `obs-prop:xxx`, `obs-class:xxx`, and `obs-style:xxx` are
  variants of the above observing a value.
  (See below for the expected arguments.)
- `on_:xxx=` adds the value as an event listener for event type `"xxx"`.
- `on:xxx=` does the same, but "consumes" the event by calling the event methods
  `preventDefault` and `stopImmediatePropagation` before invoking the
  given listener.

The argument of an observing attribute may be
- a 2-element array consisting of
  - a disposal `Registry`
  - *and* a zero-argument observer function
- *or* just the zero-argument observer function.
  (In this case the observation is not disposed but left to garbage collection
  or memory leakage.)

You have to import `h` and possibly `TextNode` and `Fragment` from `lib/jsx`.
While this may appear tedious,
it allows you to use different JSX implementations
in different parts of your code.
(Actually the name `h` of the JSX-handler function may be chosen differently
in the TypeScript configuration.)


## Web Components

Out of the three main technologies we are only using custom elements
in this example.

*Shadow DOM* could be used to encapsulate parts of a DOM tree
rigorously, in particular with respect to style-sheet application and
Event propagation.
But in our example we actually wanted to re-use the existing global
style sheets.

We are not using *templates* as JSX is far more comfortable to use due to
its tight integration into JavaScript/TypeScript.
That being said, you can of course use templates if you want.
(According to rumors, template instantiation is faster than element-wise
DOM manipulation from JavaScript.)

*Custom elements* play a central role in our component structure.
They play a role similar to React components
for structuring an application.
Both here and in React components are used to keep local state and
references into the global state.
Components also provide callbacks for use interactions.
And in both cases components render a UI,
even though this works in very different ways.

React render functions run repeatedly (whenever something *might* have
changed) and results are reconciled with earlier results automatically.
This makes many components easy to implement, to understand, and to test.
OTOH, hacks (in React terminology: "hooks") are needed for certain things
such as
- local state (`useState`)
- access to DOM elements (`useRef`)
- actions that should only happen under certain conditions (`useEffect`)
- ...

With our approach observations resulting in re-rendering (reactions) are more explicit.
But we need not manage the dependencies of these observations since MobX does
that for us. 

One nice property of custom elements is that they are a standard web technology.
No library needs to be included and shipped to get this functionality!


## Open Questions/Help Wanted

### For MobX/mobx-keystone experts

- Does all this make sense?
- Does an approach like this already exist?
  <br>
  (It meanwhile looks so natural to me that it is hard to imagine that nobody
  else has had similar ideas.)
  <br>
  I think that functionality analogous to Svelte and SolidJS
  can be achieved with not too much tuning.
  (But we still have too lose weight.  See next item.)
- Can we reduce the "weight" of MobX/mobx-keystone?
  I haven't investigated it yet, but my current guess is:
  - I am probably using only a small subset of
    the MobX/mobx-keystone functionality
  - but the tree-shaking of rollup is less effective than it could be
    because MobX/mobx-keystone is not implemented in a tree-shaking-friendly
    way.  (In particular heavily overloaded identifiers might cause rollup to
    include unused functionality.)

> #### Update
>
> Adam Haile's [S](https://github.com/adamhaile/S) and
> [surplus](https://github.com/adamhaile/surplus) and
> Ryan Carniato's [SolidJS](https://www.solidjs.com/)
> also
> - create real DOM rather than virtual DOM from JSX and
> - support reactivity.
>
> Their reactivity implementations are probably more light-weight than MobX.
>
> But I'm not (yet) comfortable with the implicit tracking scopes in their
> JSX implementations with inline JS (`{...}`) being compiled to thunks.
> (I do not like a dependency on a pre-compiler that might go out of maintenance.
> This would be more serious than a library going out of maintenance.)
>
> Is it possible to replace MobX with something similar to S
> while keeping a "standard" JSX parser?

### For TypeScript experts

- Can I make the typing around JSX stricter?
  I have found the documentation around `JSX.IntrinsicElements`
  but could not yet get it working.

### General Questions

- What would be another appropriate use-case example?
  - The
    "[RealWorld example](https://github.com/gothinkster/realworld#readme)"
    probably does not help much because
    I am concentrating on dynamic UIs,
    whereas the "RealWorld example" emphasizes full-stack aspects.
  - Some kind of product configurator might help.
    (Ideally with somewhat complex but still understandable business logic
    and without the need to invest a lot of time in a graphical representation)
- Ideas for a good name for the approach?
