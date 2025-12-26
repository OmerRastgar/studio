import { Configuration, FrontendApi } from "@ory/client";

const apiBaseUrlInternal = process.env.KRATOS_INTERNAL_URL || "http://kratos:4433"; // Kratos Public API (Internal Docker)
const apiBaseUrlExternal = process.env.NEXT_PUBLIC_KRATOS_PUBLIC_URL || "/kratos"; // Bypasses CORS via Next.js Proxy

export const kratos = new FrontendApi(
    new Configuration({
        basePath: typeof window === "undefined" ? apiBaseUrlInternal : apiBaseUrlExternal,
        baseOptions: {
            withCredentials: true,
        },
    })
);
