import {existsSync, readFileSync} from 'fs';

export function parseJson<T>(value: string, replacement: T): T {
    try {
        return <T>JSON.parse(value);
    } catch (_error) {
        return replacement;
    }
}

export function loadJson<T>(file: string, replacement: T): T {
    if (!existsSync(file)) {
        return replacement;
    }
    return parseJson<T>(readFileSync(file).toString(), replacement);
}
