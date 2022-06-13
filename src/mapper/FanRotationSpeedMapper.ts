export class FanRotationSpeedMapper {
    static mapToNumber(string: string) {
        switch (string.toLowerCase()) {
            case 'quiet': return 0.0;
            case 'low': return 25.0;
            case 'mid': return 50.0;
            case 'high': return 75.0;
            case 'auto': return 100.0;
            default: return 100.0;
        }
    }

    static mapToString(number: number) {
        switch (number) {
            case 0.0: return 'quiet';
            case 25.0: return 'low';
            case 50.0: return 'mid';
            case 75.0: return 'high';
            case 100.0: return 'auto';
            default: return 100.0;
        }
    }
}
