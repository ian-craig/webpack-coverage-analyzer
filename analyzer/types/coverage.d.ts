declare interface Range {
    start: number;
    end: number;
}

declare interface CoverageAsset {
    url: string;
    ranges: Range[];
    text: string;
}

declare type CoverageReport = CoverageAsset[];
