// @flow

import type { NodePath, Node } from "babel-traverse";

type Quasi = { raw: string };

export default function babelPluginHyperHTML({ types: t }) {
  class ConversionContext {
    wirePattern = "hyperHTML.wire";
    componentPattern = "hyperHTML.Component";

    getWireID() {
      return this.wirePattern
        .split(".")
        .reduce(
          (expr, part) =>
            expr === null
              ? t.identifier(part)
              : t.memberExpression(expr, t.identifier(part)),
          null
        );
    }

    appendString(quasis: Array<Quasi>, expressions: Array<Node>, raw: string) {
      if (quasis.length > expressions.length) {
        quasis[quasis.length - 1].raw += raw;
      } else {
        quasis.push({ raw });
      }
    }

    convert(path: NodePath<*>) {
      const quasis = [];
      const expressions = [];
      this.convertJSXElement(quasis, expressions, path);
      if (expressions.length === 1 && quasis.length === 0) {
        return expressions[0];
      } else {
        const parentFn = path.findParent(parent => parent.isFunction());
        if (parentFn && parentFn.isClassMethod()) {
          const classPath = parentFn.parentPath.parentPath;

          if (
            classPath.has("superClass") &&
            (classPath.get("superClass").node.name === this.componentPattern ||
              classPath.get("superClass").matchesPattern(this.componentPattern))
          ) {
            return t.taggedTemplateExpression(
              t.memberExpression(t.thisExpression(), t.identifier("html")),
              t.templateLiteral(
                quasis.map(item => t.templateElement(item)),
                expressions
              )
            );
          }
        }

        const args = [];
        const target = path.scope.getData("hyperHTML:wireTarget");
        if (target) {
          args.push(t.identifier(target));
        }

        return t.taggedTemplateExpression(
          t.callExpression(this.getWireID(), args),
          t.templateLiteral(
            quasis.map(item => t.templateElement(item)),
            expressions
          )
        );
      }
    }

    convertJSXElement(
      quasis: Array<Quasi>,
      expressions: Array<Node>,
      path: NodePath<*>
    ) {
      const openingElement = path.get("openingElement");
      if (openingElement.get("name").isJSXMemberExpression()) {
        this.convertCustom(quasis, expressions, path);
      } else if (/^[a-z]/.test(openingElement.node.name.name)) {
        this.convertBuiltin(quasis, expressions, path);
      } else {
        this.convertCustom(quasis, expressions, path);
      }
    }

    convertBuiltin(
      quasis: Array<Quasi>,
      expressions: Array<Node>,
      path: NodePath<*>
    ) {
      const openingElement = path.get("openingElement");
      const { name } = openingElement.node.name;
      this.appendString(quasis, expressions, `<${name}`);
      const attributes = openingElement.get("attributes");
      for (const attribute of attributes) {
        if (attribute.isJSXSpreadAttribute()) {
          this.appendString(quasis, expressions, " ");
          expressions.push(
            this.convertObjectChildren(attribute.get("argument"))
          );
          continue;
        }
        const { name } = attribute.node.name;
        const { value } = attribute.node;
        if (value == null) {
          this.appendString(quasis, expressions, ` ${name}`);
        } else {
          this.appendString(quasis, expressions, ` ${name}=`);
          if (value.type === "StringLiteral") {
            this.appendString(quasis, expressions, JSON.stringify(value.value));
          } else {
            expressions.push(
              this.convertObjectChildren(attribute.get("value"))
            );
          }
        }
      }
      if (openingElement.node.selfClosing) {
        this.appendString(quasis, expressions, "/>");
        return;
      }
      this.appendString(quasis, expressions, ">");
      this.convertChildren(quasis, expressions, path.get("children"));
      this.appendString(quasis, expressions, `</${name}>`);
    }

    convertCustom(
      quasis: Array<Quasi>,
      expressions: Array<Node>,
      path: NodePath<*>
    ) {
      const openingElement = path.get("openingElement");
      const props = [];
      const attributes = openingElement.get("attributes");
      for (const attribute of attributes) {
        if (attribute.isJSXSpreadAttribute()) {
          props.push(
            t.spreadProperty(
              this.convertObjectChildren(attribute.get("argument"))
            )
          );
          continue;
        }
        const { name } = attribute.node.name;
        const { value } = attribute.node;
        if (value == null) {
          props.push(
            t.objectProperty(t.identifier(name), t.booleanLiteral(true))
          );
        } else {
          props.push(
            t.objectProperty(
              t.identifier(name),
              this.convertObjectChildren(attribute.get("value"))
            )
          );
        }
      }
      let componentIdentifier;
      if (openingElement.get("name").isJSXMemberExpression()) {
        componentIdentifier = this.convertJSXMemberExpression(
          openingElement.get("name")
        );
      } else {
        const { name: componentName } = openingElement.node.name;
        componentIdentifier = t.identifier(componentName);
      }
      if (!openingElement.node.selfClosing) {
        const children = this.convertObjectChildren(path.get("children"));
        props.push(t.objectProperty(t.identifier("children"), children));
      }
      expressions.push(
        t.newExpression(componentIdentifier, [t.objectExpression(props)])
      );
    }

    convertJSXMemberExpression(path: NodePath<*>) {
      if (path.isJSXIdentifier()) {
        return t.identifier(path.node.name);
      } else if (path.isJSXMemberExpression()) {
        return t.memberExpression(
          this.convertJSXMemberExpression(path.get("object")),
          this.convertJSXMemberExpression(path.get("property"))
        );
      }
      return path.node;
    }

    convertObjectChildren(path: NodePath<*> | NodePath<*>[]) {
      if (Array.isArray(path)) {
        return t.arrayExpression(path.map(this.convertObjectChildren, this));
      } else if (path.type === "JSXElement") {
        return this.convert(path);
      } else if (path.type === "JSXText") {
        return t.stringLiteral(path.node.value);
      } else if (path.type === "JSXExpressionContainer") {
        return this.convertObjectChildren(path.get("expression"));
      } else {
        return path.node;
      }
    }

    convertChildren(
      quasis: Array<Quasi>,
      expressions: Array<Node>,
      path: NodePath<*> | NodePath<*>[]
    ) {
      if (Array.isArray(path)) {
        for (const child of path) {
          this.convertChildren(quasis, expressions, child);
        }
      } else if (path.type === "JSXElement") {
        this.convertJSXElement(quasis, expressions, path);
      } else if (path.type === "JSXText") {
        this.appendString(quasis, expressions, path.node.value);
      } else if (path.type === "JSXExpressionContainer") {
        expressions.push(path.node.expression);
      }
    }
  }

  return {
    visitor: {
      ImportDeclaration(path: NodePath<*>) {
        if (
          path.node.source.value !== "hyperhtml" ||
          path.node.importKind === "type"
        ) {
          return;
        }
        const context = new ConversionContext();
        for (const specifier of path.get("specifiers")) {
          const { node } = specifier;
          if (
            node.type === "ImportDefaultSpecifier" ||
            node.type === "ImportNamespaceSpecifier"
          ) {
            context.wirePattern = `${node.local.name}.wire`;
            context.componentPattern = `${node.local.name}.Component`;
          } else if (node.imported && node.imported.name === "wire") {
            context.wirePattern = node.local.name;
          } else if (node.imported && node.imported.name === "Component") {
            context.componentPattern = node.local.name;
          }
        }
        path.parentPath.traverse({
          Function(path: NodePath<*>) {
            if (path.isArrowFunctionExpression()) {
              return;
            }
            path.scope.setData("hyperHTML:wireTarget", "");
          },
          ArrowFunctionExpression(path: NodePath<*>) {
            const params = path.get("params");
            if (params.length !== 1) {
              return;
            }
            if (params[0].isObjectPattern() || params[0].isArrayPattern()) {
              const inserts = [];
              const pattern = params[0].node;
              const id = path.scope.generateUidIdentifier("arg");
              path.scope.setData("hyperHTML:wireTarget", id.name);
              params[0].replaceWith(id);
              inserts.push(
                t.variableDeclaration("let", [
                  t.variableDeclarator(pattern, id)
                ])
              );
              if (!path.get("body").isBlockStatement()) {
                path
                  .get("body")
                  .replaceWith(
                    t.blockStatement([
                      ...inserts,
                      t.returnStatement(path.node.body)
                    ])
                  );
              } else {
                path
                  .get("body")
                  .replaceWith(
                    t.blockStatement([...inserts, ...path.node.body.body])
                  );
              }
            } else {
              path.scope.setData("hyperHTML:wireTarget", params[0].node.name);
            }
          },
          JSXElement(path: NodePath<*>) {
            path.replaceWith(context.convert(path));
          }
        });
      }
    }
  };
}
