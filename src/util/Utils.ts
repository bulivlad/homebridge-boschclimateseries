export class Utils {
    static mapToString(map: Map<any, any>): String {
        const string = Array
            .from(map.entries(), ([k, v]) => `${k}: ${v}`)
            .join(", ");
        return "Map(" + string + ")";
    }
}
