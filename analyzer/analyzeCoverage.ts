import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { findModuleRefs, ModuleRef } from "./findModuleRefs";
import { getModuleId } from "./utils";

interface Range {
  start: number;
  end: number;
}

interface ModuleRefWithCoverage {
  moduleId: ModuleId;
  pos: number;
  isCovered: boolean;
}

export interface ModuleCoverageAnalysisResult {
  id: ModuleId;
  range: Range;
  coveredRanges: Range[];
  refs: ModuleRefWithCoverage[];
}

const checkModuleRefCoverage = (moduleRefs: ModuleRef[], coveredRanges: Range[]): ModuleRefWithCoverage[] => {
  let result: ModuleRefWithCoverage[] = [];

  let rangeIndex = 0;
  for (const { moduleId, pos } of moduleRefs) {
    while (rangeIndex < coveredRanges.length && coveredRanges[rangeIndex].end <= pos) rangeIndex++;
    result.push({
      moduleId,
      pos,
      isCovered: rangeIndex < coveredRanges.length && coveredRanges[rangeIndex].start <= pos
    });
  }

  return result;
};

const analuyzeModules = (asset: AssetCoverage, modulePaths: NodePath<t.ObjectProperty>[]): ModuleCoverageAnalysisResult[] => {
  let results: ModuleCoverageAnalysisResult[] = [];

  let rangeIndex = 0;
  for (const modulePath of modulePaths) {
    const id: ModuleId = getModuleId(modulePath.node.key);
    const body = (modulePath.node.value as t.FunctionExpression).body;
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

    console.log(`==== Finding refs for module ${id} ====`);
    const moduleRefs = findModuleRefs(modulePath.get('value') as NodePath<t.FunctionExpression>);

    results.push({ id, range, coveredRanges, refs: checkModuleRefCoverage(moduleRefs, coveredRanges) });
  }
  return results;
};

export const analyzeAsset = (asset: AssetCoverage): ModuleCoverageAnalysisResult[] => {
  let results: ModuleCoverageAnalysisResult[] = [];

  const ast = parse(asset.text) as t.File;
  console.log(`\nParsing ${asset.url}`);

  traverse(ast, {
    Program(path) {
      const rootStatements = path.node.body;
      for (let i = 0; i < rootStatements.length; i++) {
        const statement = rootStatements[i];

        // Chunk with bootstrap (generally the entry chunk)
        if (
          t.isExpressionStatement(statement) &&
          t.isCallExpression(statement.expression) &&
          t.isFunctionExpression(statement.expression.callee, { id: null }) &&
          t.isIdentifier(statement.expression.callee.params[0], { name: "modules" }) &&
          t.isFunctionDeclaration(statement.expression.callee.body.body[0]) &&
          t.isIdentifier(statement.expression.callee.body.body[0].id, { name: "webpackJsonpCallback" }) &&
          t.isObjectExpression(statement.expression.arguments[0])
        ) {
          results.push(...analuyzeModules(asset, path.get(`body.${i}.expression.arguments.0.properties`) as NodePath<t.ObjectProperty>[]));
        }

        // Chunk without bootstrap
        if (
          t.isExpressionStatement(statement) &&
          t.isCallExpression(statement.expression) &&
          t.isMemberExpression(statement.expression.callee) &&
          t.isIdentifier(statement.expression.callee.property, { name: "push" }) &&
          t.isAssignmentExpression(statement.expression.callee.object) &&
          t.isMemberExpression(statement.expression.callee.object.left) &&
          t.isStringLiteral(statement.expression.callee.object.left.property, { value: "webpackJsonp" }) &&
          t.isArrayExpression(statement.expression.arguments[0]) &&
          t.isObjectExpression(statement.expression.arguments[0].elements[1])
        ) {
          results.push(...analuyzeModules(asset, path.get(`body.${i}.expression.arguments.0.elements.1.properties`) as NodePath<t.ObjectProperty>[]));
        }
      }
      path.skip();
    }
  });

  return results;
};
