
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
            for (const reason of module.reasons) {
                if (reason.moduleId === null) continue;
                
                const moduleCoverage = coverageResults.get(reason.moduleId);
                if (moduleCoverage === undefined) {
                    throw new Error(`Found no coverage analysis for module ${reason.module} which is a reason for module ${module.name}`);
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
                console.log(`  reason ${reason.module}: ${usedCount} used, ${unusedCount} unused`);
            }
        }
    }
};