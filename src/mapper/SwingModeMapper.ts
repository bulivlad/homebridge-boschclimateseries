export class SwingModeMapper {
    static mapToString(number: number): string {
        switch (number) {
            //Characteristic.SwingMode.SWING_ENABLED
            case 1: return "on"
            //Characteristic.SwingMode.SWING_DISABLED
            case 0: return "off"
            //Characteristic.SwingMode.SWING_ENABLED
            default: return "on"
        }
    }

    static mapToNumber(value: string): number {
        switch (value.toLowerCase()) {
            //Characteristic.Active.ACTIVE
            case "on": return 1
            //Characteristic.SwingMode.SWING_DISABLED
            case "off": return 0
            //Characteristic.SwingMode.SWING_ENABLED
            default: return 1
        }
    }

    static mapToBoolean(value: string | number): boolean {
        if (typeof value === 'number') {
            switch (value) {
                //Characteristic.SwingMode.SWING_ENABLED
                case 1: return true
                //Characteristic.SwingMode.SWING_DISABLED
                case 0: return false
                //Characteristic.SwingMode.SWING_ENABLED
                default: return true
            }
        }
        switch (value.toLowerCase()) {
            //Characteristic.Active.ACTIVE
            case "on": return true
            //Characteristic.SwingMode.SWING_DISABLED
            case "off": return false
            //Characteristic.SwingMode.SWING_ENABLED
            default: return true
        }
    }
}
