export function countryCodeToEmoji(countryCode: string): string {
    return countryCode
        .toUpperCase()
        .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}
