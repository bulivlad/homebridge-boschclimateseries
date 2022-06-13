export class TargetHeaterCoolerStateMapper {

    static mapToString(number: number): string {
        switch (number) {
            case 0: return "AUTO" //Characteristic.TargetHeaterCoolerState.AUTO
            case 1: return "HEAT" //Characteristic.TargetHeaterCoolerState.HEAT
            case 2: return "COOL" //Characteristic.TargetHeaterCoolerState.COOL
            default: return "AUTO" //Characteristic.TargetHeaterCoolerState.AUTO
        }
    }

    static mapToNumber(string: string): number {
        switch (string.toUpperCase()) {
            case "AUTO": return 0 //Characteristic.TargetHeaterCoolerState.AUTO
            case "HEAT": return 1 //Characteristic.TargetHeaterCoolerState.HEAT
            case "COOL": return 2 //Characteristic.TargetHeaterCoolerState.COOL
            default: return 0 //Characteristic.TargetHeaterCoolerState.AUTO
        }
    }
}
