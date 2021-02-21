import * as fs from "fs";
import * as path from 'path';
import type { Stats as WebpackStats } from 'webpack';
import { analyzeAsset, ModuleCoverageAnalysisResult } from "./analyzeCoverage";
import { analyzeWebpackSats, getWebpackBundleNames } from "./analyzeWebpackStats";

/**
 * Goal:
 *    Find unused code which can be removed from a chunk.
 * 
 * Steps:
 *    1. Scope analysis to CHUNK level. Coverage data is per file/asset/bundle, so we need to first break this into MODULEs then group by CHUNK.
 *    2. Make a list of MODULEs which are completely unused.
 *    3. Generate a graph which represents where each MODULE is used.
 *    4. Find MODULEs where none of the usages are used according to coverage data.
 */

const main = (coverageReportPath: string, webpackStatsFilePath: string) => {
  let coverage = JSON.parse(fs.readFileSync(coverageReportPath, "utf8")) as CoverageReport;
  const webpackStats = JSON.parse(fs.readFileSync(webpackStatsFilePath, "utf8")) as WebpackStats.ToJsonOutput;

  // Exclude any assets not from this Webpack build
  const bundleNames = getWebpackBundleNames(webpackStats);
  coverage = coverage.filter(assetCoverage => {
    const fileName = path.basename(assetCoverage.url);
    return bundleNames.has(fileName);
  });

  // Analyze coverage data to find usages of other modules from each module, and whether those usages are covered or not.
  const moduleCoverageResults = new Map<ModuleId, ModuleCoverageAnalysisResult>();
  coverage.map(assetCoverage => {
    analyzeAsset(assetCoverage).forEach(result => moduleCoverageResults.set(result.id, result));
  });

  analyzeWebpackSats(webpackStats, moduleCoverageResults);
};

main(process.argv[2], process.argv[3]);
