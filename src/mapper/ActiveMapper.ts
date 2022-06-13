export class ActiveMapper {

    static mapToString(number: number): string {
        switch (number) {
            //Characteristic.Active.ACTIVE
            case 1: return "ON"
            //Characteristic.Active.INACTIVE
            case 0: return "OFF"
            //Characteristic.Active.ACTIVE
            default: return "ON"
        }
    }

    static mapToNumber(value: string | boolean): number {
        if (typeof value === "boolean") {
            switch (value) {
                //Characteristic.Active.ACTIVE
                case true: return 1
                //Characteristic.Active.INACTIVE
                case false: return 0
            }
        }
        switch (value.toUpperCase()) {
            //Characteristic.Active.ACTIVE
            case "ON": return 1
            //Characteristic.Active.INACTIVE
            case "OFF": return 0
            //Characteristic.Active.ACTIVE
            default: return 1
        }
    }

}
