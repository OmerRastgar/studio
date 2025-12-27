import { Configuration, IdentityApi } from "@ory/client";

const apiBaseUrlInternal = process.env.KRATOS_ADMIN_URL || "http://studio-kratos:4434"; // Kratos Admin API (Internal Docker)

export const kratosAdmin = new IdentityApi(
    new Configuration({
        basePath: apiBaseUrlInternal,
    })
);
