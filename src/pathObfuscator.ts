interface StaticSegment {
    type: "static",
    name: string,
}

interface DynamicSegment {
    type: "dynamic",
}

interface ObfuscatedSegment {
    type: "obfuscated",
    name: string,
}

type Segment = StaticSegment | DynamicSegment | ObfuscatedSegment;

export function createPathObfuscator(patterns: string[]) {
    const parsedPatterns: Segment[][] = [];

    patterns.forEach((pattern) => {
        let segments: Segment[] = [];
        pattern.split("/").forEach((segment) => {
            if (!segment) {
                return;
            }

            if (segment === "*") {
                segments.push({ type: "dynamic"});
                return;
            }

            const obfuscated = segment.match(/^:.*$/);

            if (obfuscated) {
                segments.push({ type: "obfuscated", name: obfuscated[0] });
                return;
            }

            segments.push({ type: "static", name: segment });
        });
        parsedPatterns.push(segments);
    });

    return function (path: string) {
        const parts = path.split("/").filter((s) => s);
        parsedPatterns: for (const pattern of parsedPatterns) {
            const obfuscatedSegments: string[] = [];
            for (let i = 0; i < pattern.length; i++) {
                const isLast = i === pattern.length - 1;
                const segment = pattern[i];
                const part = parts[i];
                if (segment.type === "static") {
                    if (part === segment.name) {
                        obfuscatedSegments.push(segment.name);
                    } else {
                        continue parsedPatterns;
                    }
                } else if (segment.type === "dynamic") {
                    if (isLast) {
                        obfuscatedSegments.push(...parts.slice(i));
                    } else if (part) {
                        obfuscatedSegments.push(part);
                    } else {
                        continue parsedPatterns;
                    }
                } else {
                    if (!part) {
                        continue parsedPatterns;
                    } else {
                        obfuscatedSegments.push(segment.name);
                    }
                }
            }
            return `/${obfuscatedSegments.join("/")}`;
        }
        return `/${parts.join("/")}`;
    }
}