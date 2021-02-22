declare interface Range {
    start: number;
    end: number;
}

declare interface AssetCoverage {
    url: string;
    ranges: Range[];
    text: string;
}

declare type CoverageReport = AssetCoverage[];
