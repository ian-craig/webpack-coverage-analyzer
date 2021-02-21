import { parse } from "@babel/parser";
import * as t from "@babel/types";

interface Range {
  start: number;
  end: number;
}

interface Usage {
  moduleId: ModuleId;
  pos: number;
  isCovered: boolean;
}

export interface ModuleCoverageAnalysisResult {
  id: ModuleId;
  range: Range;
  coveredRanges: Range[];
  usages: Usage[];
}

const analyzeModuleUsages = (body: t.BlockStatement, coveredRanges: Range[]) => {
  const moduleAliases = new Map<string, string>();
  const moduleUsages: [string, number][] = [];

  for (const statement of body.body) {
    if (
      t.isVariableDeclaration(statement) &&
      statement.declarations.length === 1 &&
      t.isCallExpression(statement.declarations[0].init) &&
      t.isIdentifier(statement.declarations[0].init.callee, { name: "__webpack_require__" })
    ) {
      const moduleId = (statement.declarations[0].init.arguments[0] as t.StringLiteral).value;
      const localName = (statement.declarations[0].id as t.Identifier).name;
      moduleAliases.set(localName, moduleId);
    } else {
      t.traverse(statement, (node, ancestors) => { //TODO this doesn't account for shadowed variables or reassignment. Consider adding an error or using babel traverse scopes.
        if (t.isIdentifier(node) && moduleAliases.has(node.name) && !ancestors.some(a => t.isMemberExpression(a.node) && a.key === 'property')) {
          console.log(`  ${node.name} used at ${node.start}`);
          moduleUsages.push([moduleAliases.get(node.name), node.start]);
        }
      })
    }
  }

  let usages: Usage[] = [];
  let rangeIndex = 0;
  for (const [moduleId, pos] of moduleUsages) {
    while (rangeIndex < coveredRanges.length && coveredRanges[rangeIndex].end <= pos) rangeIndex++;
    usages.push({
      moduleId,
      pos,
      isCovered: rangeIndex < coveredRanges.length && coveredRanges[rangeIndex].start <= pos
    });
  }

  return usages;
};

export const analyzeAsset = (asset: CoverageAsset): ModuleCoverageAnalysisResult[] => {
  const ast = parse(asset.text) as t.File;

  console.log(`\nParsing ${asset.url}`);

  let modules = getWebpackChunkModules(ast);
  if (modules === undefined) return;

  let results: ModuleCoverageAnalysisResult[] = [];

  let rangeIndex = 0;
  for (const prop of modules) {
    const id = t.isStringLiteral(prop.key) ? prop.key.value : (prop.key as t.NumericLiteral).value;
    const body = (prop.value as t.FunctionExpression).body;
    const range = { start: body.body[0].start, end: body.body[body.body.length - 1].end };
    let coveredRanges: Range[] = [];

    // Skip any ranges which end before this module
    while (rangeIndex < asset.ranges.length && asset.ranges[rangeIndex].end <= range.start) {
      rangeIndex++;
    }

    // Add all ranges which end before the module end, cropping the start to the start of the module
    for (; rangeIndex < asset.ranges.length && asset.ranges[rangeIndex].end < range.end; rangeIndex++) {
      coveredRanges.push({
        start: Math.max(range.start, asset.ranges[rangeIndex].start),
        end: asset.ranges[rangeIndex].end,
      });
    }

    // If the next range starts in this module, add it and crop to the end of the module
    if (rangeIndex < asset.ranges.length && asset.ranges[rangeIndex].start < range.end) {
      coveredRanges.push({
        start: Math.max(range.start, asset.ranges[rangeIndex].start),
        end: Math.min(range.end, asset.ranges[rangeIndex].end),
      });
    }

    results.push({ id, range, coveredRanges, usages: analyzeModuleUsages(body, coveredRanges) });
  }
  return results;
};

const getWebpackChunkModules = (ast: t.File): t.ObjectProperty[] | undefined => {
  // Chunk with bootstrap (generally the entry chunk)
  if (
    ast.program.body.length === 1 &&
    t.isExpressionStatement(ast.program.body[0]) &&
    t.isCallExpression(ast.program.body[0].expression) &&
    t.isFunctionExpression(ast.program.body[0].expression.callee, { id: null }) &&
    t.isIdentifier(ast.program.body[0].expression.callee.params[0], { name: "modules" }) &&
    t.isFunctionDeclaration(ast.program.body[0].expression.callee.body.body[0]) &&
    t.isIdentifier(ast.program.body[0].expression.callee.body.body[0].id, { name: "webpackJsonpCallback" }) &&
    t.isObjectExpression(ast.program.body[0].expression.arguments[0])
  ) {
    return ast.program.body[0].expression.arguments[0].properties as t.ObjectProperty[];
  }

  // Chunk without bootstrap
  if (
    ast.program.body.length === 1 &&
    t.isExpressionStatement(ast.program.body[0]) &&
    t.isCallExpression(ast.program.body[0].expression) &&
    t.isMemberExpression(ast.program.body[0].expression.callee) &&
    t.isIdentifier(ast.program.body[0].expression.callee.property, { name: "push" }) &&
    t.isAssignmentExpression(ast.program.body[0].expression.callee.object) &&
    t.isMemberExpression(ast.program.body[0].expression.callee.object.left) &&
    t.isStringLiteral(ast.program.body[0].expression.callee.object.left.property, { value: "webpackJsonp" }) &&
    t.isArrayExpression(ast.program.body[0].expression.arguments[0]) &&
    t.isObjectExpression(ast.program.body[0].expression.arguments[0].elements[1])
  ) {
    return ast.program.body[0].expression.arguments[0].elements[1].properties as t.ObjectProperty[];
  }

  return undefined;
};
