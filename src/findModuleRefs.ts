import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { getModuleId } from "./utils";

export interface ModuleRef {
  moduleId: ModuleId;
  pos: number;
  line: number;
}

export const findModuleRefs = (path: NodePath<t.FunctionExpression>): ModuleRef[] => {
  // Grab the __webpack_require__ identifier by it's param in case it's been minified or renamed
  const webpackRequireParamPath = path.get("params.2") as NodePath<t.Identifier>;
  if (!t.isIdentifier(webpackRequireParamPath)) {
    throw new Error(`Unexpected parameters in module function at line ${path.node.loc.start.line}`);
  }

  // Look up the binding for __webpack_require__ in the module scope
  const binding = path.get("body").scope.getBinding(webpackRequireParamPath.node.name);
  if (binding.identifier !== webpackRequireParamPath.node) {
    throw new Error(
      `Unexpected binding for name ${webpackRequireParamPath.node.name} at line ${path.node.loc.start.line}`
    );
  }

  const result: ModuleRef[] = [];
  for (const refPath of binding.referencePaths) {
    if (t.isCallExpression(refPath.parent) && refPath.parentKey === "callee") {
      const moduleId = getModuleId(refPath.parent.arguments[0]);

      const gpPath = refPath.parentPath.parentPath;
      if (t.isVariableDeclarator(gpPath.node) && t.isIdentifier(gpPath.node.id)) {
        const assignedBinding = gpPath.scope.getBinding(gpPath.node.id.name);
        if (assignedBinding.identifier !== gpPath.node.id) {
          throw new Error(`Unexpected binding for name ${gpPath.node.id.name} at line ${gpPath.node.loc.start.line}`);
        }

        for (const varRefPath of assignedBinding.referencePaths) {
          result.push({
            moduleId,
            pos: varRefPath.node.start,
            line: varRefPath.node.loc.start.line,
          });
        }
      } else {
        result.push({
          moduleId,
          pos: refPath.node.start,
          line: refPath.node.loc.start.line,
        });
      }
    }
  }

  return result;
};
