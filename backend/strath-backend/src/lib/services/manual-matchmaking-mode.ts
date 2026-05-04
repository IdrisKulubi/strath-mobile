export function isManualMatchmakingModeEnabled() {
    return process.env.MANUAL_MATCHMAKING_MODE !== "false";
}

export function getManualMatchmakingCopy() {
    return {
        title: "We are working on your match",
        subtitle:
            "Our team is reviewing profiles by hand so we can introduce you to someone with real potential. When we find a strong fit, we will send them to you first.",
    };
}
