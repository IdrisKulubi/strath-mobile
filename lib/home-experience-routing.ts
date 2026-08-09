export function getIncomingLikeRoute(isV2Enabled: boolean) {
    return isV2Enabled ? '/(tabs)/pulse' : '/(tabs)?homeTab=interested';
}
