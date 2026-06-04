/** StrathSpace web payment UI tokens — keep in sync with root DESIGN.md */
export const paymentBrand = {
    page: "min-h-dvh bg-[#141118] text-[#F5F3F8] antialiased",
    shell: "mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10 sm:px-8",
    logo:
        "mb-8 block text-center text-sm font-medium tracking-tight text-[#A39DAD] transition-colors hover:text-[#F5F3F8]",
    card: "rounded-xl border border-[#322A3D] bg-[#221C2A] p-6 ring-1 ring-inset ring-white/[0.04]",
    display: "text-[28px] font-bold leading-[1.21] tracking-tight text-[#F5F3F8]",
    title: "text-xl font-semibold leading-snug tracking-tight text-[#F5F3F8]",
    body: "text-base leading-relaxed text-[#A39DAD]",
    caption: "text-[13px] leading-snug text-[#A39DAD]",
    label: "text-[12px] font-medium text-[#D94A8F]",
    amount: "text-center text-4xl font-bold tracking-tight text-[#F5F3F8]",
    listItem: "text-sm text-[#A39DAD]",
    primaryButton:
        "h-12 w-full rounded-xl bg-[#B8327A] text-base font-semibold text-white shadow-none transition-opacity hover:bg-[#D94A8F] hover:opacity-95 disabled:pointer-events-none disabled:opacity-50",
    inlineLink: "font-medium text-[#D94A8F] underline-offset-2 hover:text-[#F5F3F8] hover:underline",
    warningBanner:
        "rounded-xl border border-[#E0A040]/30 bg-[#E0A040]/10 px-4 py-3 text-sm text-[#F5F3F8]",
    errorBanner:
        "rounded-xl border border-[#E05A5A]/30 bg-[#E05A5A]/10 px-4 py-3 text-sm text-[#F5F3F8]",
    successIconWrap:
        "mx-auto flex size-14 items-center justify-center rounded-full bg-[#3DB87A]/15 text-[#3DB87A]",
    pendingIconWrap:
        "mx-auto flex size-14 items-center justify-center rounded-full bg-[#E0A040]/15 text-[#E0A040]",
    errorIconWrap:
        "mx-auto flex size-14 items-center justify-center rounded-full bg-[#E05A5A]/15 text-[#E05A5A]",
} as const;
