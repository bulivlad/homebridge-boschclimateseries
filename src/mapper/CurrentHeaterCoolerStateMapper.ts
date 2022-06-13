export class CurrentHeaterCoolerStateMapper {
    static mapToNumber(roomTemperatureValue: number, temperatureSetPointValue: number, operationMode: string) {
        if ('auto' === operationMode) {
            if (temperatureSetPointValue > roomTemperatureValue) {
                //Characteristic.CurrentHeaterCoolerState.HEATING
                return 2;
            }
            if (temperatureSetPointValue === roomTemperatureValue) {
                //CurrentHeaterCoolerState.IDLE
                return 1;
            }
            if (temperatureSetPointValue < roomTemperatureValue) {
                //CurrentHeaterCoolerState.COOLING
                return 3;
            }
        }
        if ('heat' === operationMode) {
            if (temperatureSetPointValue > roomTemperatureValue) {
                //Characteristic.CurrentHeaterCoolerState.HEATING
                return 2
            }
            //Characteristic.CurrentHeaterCoolerState.IDLE
            return 1
        }
        if ('cool' === operationMode) {
            if (temperatureSetPointValue < roomTemperatureValue) {
                //Characteristic.CurrentHeaterCoolerState.COOLING
                return 3
            }
            //Characteristic.CurrentHeaterCoolerState.IDLE
            return 1
        }
        //Characteristic.CurrentHeaterCoolerState.IDLE
        return 1
    }
}
