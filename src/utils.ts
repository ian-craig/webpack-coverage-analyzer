import * as t from "@babel/types";

export const getModuleId = (node: t.Node): ModuleId => {
    if (t.isStringLiteral(node) || t.isNumericLiteral(node)) {
        return node.value;
    }
    throw new Error(`Node is not a moduleId. Type ${node.type} at ${node.loc.start.line}`);
}