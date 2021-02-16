import * as fs from "fs";
import { parse } from "@babel/parser";
import * as t from "@babel/types";

const analyzeAsset = (asset: CoverageAsset): void => {
  const ast = parse(asset.text) as t.File;

  console.log(`\nParsing ${asset.url}`);

  let modules = getWebpackChunkModules(ast);
  if (modules === undefined) return;

  let rangeIndex = 0;
  for (const prop of modules) {
    const id = t.isStringLiteral(prop.key) ? prop.key.value : (prop.key as t.NumericLiteral).value.toString();
    const body = (prop.value as t.FunctionExpression).body.body;

    const startChar = body[0].start;
    const endChar = body[body.length-1].end;

    while (rangeIndex < asset.ranges.length && asset.ranges[rangeIndex].end <= startChar) { rangeIndex++; }

    let coveredLineCount = 0;

    for (; rangeIndex < asset.ranges.length && asset.ranges[rangeIndex].end < endChar; rangeIndex++) {
      coveredLineCount += asset.ranges[rangeIndex].end - Math.max(startChar, asset.ranges[rangeIndex].start);
    }
    if (rangeIndex < asset.ranges.length && asset.ranges[rangeIndex].start < endChar) {
      coveredLineCount += Math.min(endChar, asset.ranges[rangeIndex].end) - Math.max(startChar, asset.ranges[rangeIndex].start);
    }

    const coverage = coveredLineCount / (endChar - startChar);

    console.log(`Module ${id}: lines ${body[0].loc.start.line}-${body[body.length-1].loc.end.line}. Coverage ${coverage*100.0}%`);
  }
};

const getWebpackChunkModules = (ast: t.File): t.ObjectProperty[] | undefined => {
  if (
    ast.program.body.length === 1 &&
    t.isExpressionStatement(ast.program.body[0]) &&
    t.isCallExpression(ast.program.body[0].expression) &&
    t.isFunctionExpression(ast.program.body[0].expression.callee, { id: null }) &&
    t.isIdentifier(ast.program.body[0].expression.callee.params[0], { name: "modules" }) &&
    t.isFunctionDeclaration(ast.program.body[0].expression.callee.body.body[0]) &&
    t.isIdentifier(ast.program.body[0].expression.callee.body.body[0].id, { name: "webpackJsonpCallback"}) &&
    t.isObjectExpression(ast.program.body[0].expression.arguments[0])
  ) {
    return ast.program.body[0].expression.arguments[0].properties as t.ObjectProperty[];
  }

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

const main = (coverageReportPath: string) => {
  const content = fs.readFileSync(coverageReportPath, "utf8");
  const coverage = JSON.parse(content) as CoverageReport;

  coverage.map(analyzeAsset);
};

main(process.argv[2]);
