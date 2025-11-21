import { NextResponse } from "next/server";
import { ZodError } from "zod";

type ApiResponse<T> = {
    success: boolean;
    data?: T;
    error?: string;
    details?: any;
};

export function successResponse<T>(data: T, status = 200) {
    return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: unknown, status = 500) {
    console.error("API Error:", error);

    if (error instanceof ZodError) {
        return NextResponse.json(
            { success: false, error: "Validation Error", details: error.errors },
            { status: 400 }
        );
    }

    if (error instanceof Error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status }
        );
    }

    return NextResponse.json(
        { success: false, error: "Internal Server Error" },
        { status }
    );
}
