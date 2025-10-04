import type { TSESLint, TSESTree } from "@typescript-eslint/utils";

// Helpers
function isMethodLike(
  n: TSESTree.ClassElement
): n is TSESTree.MethodDefinition | TSESTree.PropertyDefinition {
  if (n.type === "MethodDefinition")
    return n.kind === "method" || n.kind === "get" || n.kind === "set";
  if (n.type === "PropertyDefinition") {
    const v = n.value;
    return (
      !!v &&
      (v.type === "FunctionExpression" || v.type === "ArrowFunctionExpression")
    );
  }
  return false;
}

function isConstructor(
  n: TSESTree.ClassElement
): n is TSESTree.MethodDefinition {
  return n.type === "MethodDefinition" && n.kind === "constructor";
}

function getName(
  n: TSESTree.MethodDefinition | TSESTree.PropertyDefinition
): string {
  const key = n.key;
  if (key?.type === "Identifier") return key.name;
  if (key?.type === "PrivateIdentifier") return `#${key.name}`;
  if (key?.type === "Literal" && typeof key.value === "string")
    return String(key.value);
  return "<computed>";
}

function getAccess(
  n: TSESTree.MethodDefinition | TSESTree.PropertyDefinition
): "public" | "protected" | "private" | undefined {
  // @ts-ignore accessibility is on TS nodes
  if (n.accessibility) return n.accessibility;
  const name = getName(n);
  if (name.startsWith("#")) return "private";
  return undefined;
}

function orderOf(
  n: TSESTree.MethodDefinition | TSESTree.PropertyDefinition
): number {
  if (n.type === "MethodDefinition" && (n.kind === "get" || n.kind === "set"))
    return 0; // accessors first
  const a = getAccess(n);
  if (a === "public") return 1;
  if (a === "protected") return 2;
  if (a === "private") return 3;
  return 4; // unknown last
}

type MsgIds = "order" | "visibility" | "privateNaming" | "classMustHaveMethods";

const rule: TSESLint.RuleModule<MsgIds, []> = {
  meta: {
    type: "suggestion",
    docs: { description: "Enforce class layout and explicit visibility" },
    messages: {
      order:
        "Order is: getters/setters, then public methods, then protected, then private.",
      visibility:
        "Non accessor methods must be explicitly public or protected or private.",
      privateNaming:
        "Private methods must be named with #private or a leading underscore.",
      classMustHaveMethods:
        "Class must declare at least one method or accessor.",
    },
    schema: [],
  },
  create(context) {
    return {
      ClassBody(node: TSESTree.ClassBody & TSESLint.NodeParentExtension) {
        const members = node.body
          .filter(isMethodLike)
          .filter((m) => !isConstructor(m));
        if (members.length === 0) {
          context.report({ node, messageId: "classMustHaveMethods" });
          return;
        }

        for (const m of members) {
          const kind = m.type === "MethodDefinition" ? m.kind : "method";
          if (kind === "method" && !getAccess(m)) {
            context.report({ node: m, messageId: "visibility" });
          }
          if (getAccess(m) === "private") {
            const name = getName(m);
            const ok = name.startsWith("#") || name.startsWith("_");
            if (!ok) context.report({ node: m, messageId: "privateNaming" });
          }
        }

        let maxSeen = -1;
        for (const m of members) {
          const cur = orderOf(m);
          if (cur < maxSeen) {
            context.report({ node: m, messageId: "order" });
          } else {
            maxSeen = cur;
          }
        }
      },
    };
  },
};

const plugin: TSESLint.Plugin = {
  rules: {
    enforce: rule,
  },
};

export default plugin;
