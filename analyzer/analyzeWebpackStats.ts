
import type { Stats as WebpackStats } from 'webpack';
import { ModuleCoverageAnalysisResult } from './analyzeCoverage';

export const getWebpackBundleNames = (stats: WebpackStats.ToJsonOutput) => {
    return new Set(stats.assets.map(a => a.name).filter(name => name.endsWith(".js")));
}

export const analyzeWebpackSats = (stats: WebpackStats.ToJsonOutput, coverageResults: Map<ModuleId, ModuleCoverageAnalysisResult>) => {
    for (const chunk of stats.chunks) {
        console.log(`\nAnalyzing Chunk ${chunk.id}`);
        for (const module of chunk.modules) {
            console.log(`Module ${module.name}`);

            const reasonsByModule = new Map<ModuleId, Set<string>>();
            for (const reason of module.reasons) {
                if (reason.moduleId !== null) {
                    const reasonTypes = reasonsByModule.get(reason.moduleId) || new Set<string>();
                    reasonTypes.add(reason.type);
                    reasonsByModule.set(reason.moduleId, reasonTypes);
                }
            }

            for (const [moduleId, reasonTypes] of reasonsByModule) {
                const moduleCoverage = coverageResults.get(moduleId);
                if (moduleCoverage === undefined) {
                    throw new Error(`Found no coverage analysis for module ${moduleId} which is a reason for module ${module.name}`);
                }

                const { usedCount, unusedCount } = moduleCoverage.usages.reduce((counts, usage) => {
                    if (usage.moduleId === module.id) {
                        if (usage.isCovered) {
                            counts.usedCount += 1;
                        } else {
                            counts.unusedCount += 1;
                        }
                    }
                    return counts;
                }, { usedCount: 0, unusedCount: 0 })
                console.log(`  reason ${moduleId} '${[...reasonTypes].join("','")}': ${usedCount} used, ${unusedCount} unused`);
            }
        }
    }
};