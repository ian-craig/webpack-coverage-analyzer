import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { getModuleId } from "./utils";

export interface ModuleRef {
  moduleId: ModuleId;
  pos: number;
}

export const findModuleRefs = (path: NodePath<t.FunctionExpression>): ModuleRef[] => {
    // Grab the __webpack_require__ identifier by it's param in case it's been minified or renamed
    const webpackRequireParamPath = path.get('params.2') as NodePath<t.Identifier>;
    if (!t.isIdentifier(webpackRequireParamPath)) {
        throw new Error(`Unexpected parameters in module function at line ${path.node.loc.start.line}`);
    }

    // Look up the binding for __webpack_require__ in the module scope
    const binding = path.get('body').scope.getBinding(webpackRequireParamPath.node.name);
    if (binding.identifier !== webpackRequireParamPath.node) {
      throw new Error(`Unexpected binding for name ${webpackRequireParamPath.node.name} at line ${path.node.loc.start.line}`);
    }

    const result: ModuleRef[] = []; 
    for (const refPath of binding.referencePaths) {
      if (t.isCallExpression(refPath.parent) && refPath.parentKey === 'callee') {
        result.push({
          moduleId: getModuleId(refPath.parent.arguments[0]),
          pos: refPath.node.start,
        });
      }
    }

    return result;
};