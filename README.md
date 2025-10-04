# eslint-plugin-class-structure

Enforce a readable class layout and explicit visibility. The rule forces:

1. getters and setters first
2. then public methods
3. then protected
4. then private
5. every non accessor method must declare visibility
6. private methods must be named with `#name` or `_name`
7. classes must have at least one method or accessor

I built this because ambiguity inside classes wastes time. Private code sneaks into public surfaces. People throw random methods on a class and call it a service. This rule forces intent. You decide what is public, what is internal, and you keep accessors at the top for fast scanning. The result is classes that read at a glance.

## Install

```bash
pnpm i -D eslint eslint-plugin-class-structure
# or
bun add -d eslint eslint-plugin-class-structure
```

Peer requirement:

- `eslint >= 8.57 < 11`
- `typescript >= 5`

## Flat config usage

```js
// eslint.config.js
import classStructure from "eslint-plugin-class-structure";

export default [
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js"],
    plugins: { "class-structure": classStructure },
    rules: {
      "class-structure/enforce": "error",
    },
  },
];
```

## What it flags

```ts
class Bad {
  foo() {} // error: missing visibility
  private hidden() {} // error: private must start with # or _
  get name() {
    // error: error getter must be on top
    return "";
  }
  protected later() {} // error
}
```

## What passes

```ts
class Good {
  get name() {
    return "";
  }
  set name(v: string) {}

  public greet() {}
  protected audit() {}
  private #secret() {}
}
```

## Notes

- Constructors are ignored for ordering.
- Methods defined as class fields like `foo = () => {}` are treated as methods.
- Accessors may omit visibility, but normal methods must be explicit.
